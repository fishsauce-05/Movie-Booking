import { ObjectId } from 'mongodb';
import { httpError } from '../validators/index.js';

// Kiểm tra MongoDB có hỗ trợ transaction (replica set) không
async function isReplicaSet(db) {
    try {
        const hello = await db.admin().command({ hello: 1 });
        return Boolean(hello.setName || hello.msg === 'isdbgrid');
    } catch {
        return false;
    }
}

function isStandaloneTransactionError(error) {
    return /Transaction numbers are only allowed on a replica set member or mongos/i.test(error.message || '');
}

// Validate đầu vào trước khi thực hiện đặt vé
function validateBookingInput(customerId, showtimeId, seatsToBook) {
    if (!ObjectId.isValid(customerId) || !ObjectId.isValid(showtimeId)) {
        throw httpError('ID khách hàng hoặc ID suất chiếu không hợp lệ.', 400);
    }
    if (!Array.isArray(seatsToBook) || seatsToBook.length === 0) {
        throw httpError('Vui lòng chọn ít nhất một ghế.', 400);
    }
    if (new Set(seatsToBook).size !== seatsToBook.length) {
        throw httpError('Mã ghế bị trùng lặp trong yêu cầu.', 400);
    }
}

function buildSeatSnapshots(requestedSeats, seatsToBook) {
    return seatsToBook.map((seatCode) => {
        const seat = requestedSeats.find((item) => item.seat_code === seatCode);
        return seat ? {
            seat_code: seat.seat_code,
            type: seat.type,
            price: seat.price
        } : { seat_code: seatCode };
    });
}

// Logic đặt vé chính — chạy trong hoặc ngoài transaction tùy môi trường
async function handleTicketBooking(db, customerId, showtimeId, seatsToBook, couponCode = null) {
    const bookingsCol  = db.collection('Bookings');
    const showtimesCol = db.collection('Showtimes');
    const moviesCol    = db.collection('Movies');
    const usersCol     = db.collection('Users');
    const couponsCol   = db.collection('Coupons');

    const customerObjId  = new ObjectId(customerId);
    const showtimeObjId  = new ObjectId(showtimeId);
    const supportsTransactions = await isReplicaSet(db);

    async function runBooking(session = null) {
        const sessionOpt = session ? { session } : {};

        const customer = await usersCol.findOne(
            { _id: customerObjId },
            {
                projection: {
                    full_name: 1,
                    email: 1,
                    phone: 1,
                    role: 1,
                    loyalty_points: 1
                },
                ...sessionOpt
            }
        );
        if (!customer) throw new Error('Không tìm thấy khách hàng.');

        // Bước 1: Lấy suất chiếu + phim và kiểm tra ghế tồn tại, còn trống bằng aggregation
        const [showtimeInfo] = await showtimesCol.aggregate([
            { $match: { _id: showtimeObjId } },
            {
                $lookup: {
                    from: 'Movies',
                    localField: 'movie_id',
                    foreignField: '_id',
                    pipeline: [{ $project: { title: 1, poster_url: 1, duration: 1 } }],
                    as: 'movie'
                }
            },
            {
                $project: {
                    movie_id: 1,
                    room_name: 1,
                    start_time: 1,
                    end_time: 1,
                    movie: { $first: '$movie' },
                    requestedSeats: {
                        $filter: { input: '$seats', as: 's', cond: { $in: ['$$s.seat_code', seatsToBook] } }
                    }
                }
            },
            {
                $project: {
                    movie_id: 1,
                    room_name: 1,
                    start_time: 1,
                    end_time: 1,
                    movie: 1,
                    requestedSeats: 1,
                    foundCount: { $size: '$requestedSeats' },
                    unavailable: {
                        $map: {
                            input: { $filter: { input: '$requestedSeats', as: 's', cond: { $ne: ['$$s.status', 'Trống'] } } },
                            as: 'u',
                            in: '$$u.seat_code'
                        }
                    },
                    basePrice: { $sum: '$requestedSeats.price' }
                }
            }
        ], sessionOpt).toArray();

        if (!showtimeInfo) throw new Error('Suất chiếu không tồn tại.');
        if (showtimeInfo.foundCount !== seatsToBook.length) throw new Error('Một hoặc nhiều ghế không tồn tại trong suất chiếu.');
        if (showtimeInfo.unavailable.length > 0) throw new Error(`Ghế không khả dụng: ${showtimeInfo.unavailable.join(', ')}`);

        let subtotalPrice   = showtimeInfo.basePrice;
        let discountAmount  = 0;
        let totalPrice      = subtotalPrice;
        let appliedCouponId = null;
        let couponSnapshot  = null;

        // Bước 2: Áp mã giảm giá nếu có
        if (couponCode) {
            const now = new Date();
            const [coupon] = await couponsCol.aggregate([
                {
                    $match: {
                        code:            couponCode,
                        status:          'ACTIVE',
                        start_date:      { $lte: now },
                        end_date:        { $gte: now },
                        $expr:           { $lt: ['$used_count', '$max_uses'] },
                        min_order_value: { $lte: subtotalPrice }
                    }
                },
                {
                    $lookup: {
                        from:     'CouponUsages',
                        let:      { couponId: '$_id' },
                        pipeline: [{ $match: { $expr: { $and: [
                            { $eq: ['$coupon_id',   '$$couponId'] },
                            { $eq: ['$customer_id', customerObjId] }
                        ] } } }],
                        as: 'usages'
                    }
                },
                { $match: { usages: { $eq: [] } } },
                {
                    $project: {
                        code:           1,
                        discount_type:  1,
                        discount_value: 1,
                        discountAmount: {
                            $cond: {
                                if:   { $eq: ['$discount_type', 'PERCENT'] },
                                then: { $multiply: [subtotalPrice, { $divide: ['$discount_value', 100] }] },
                                else: { $min: ['$discount_value', subtotalPrice] }
                            }
                        },
                        finalPrice: {
                            $max: [0, {
                                $subtract: [
                                    subtotalPrice,
                                    {
                                        $cond: {
                                            if:   { $eq: ['$discount_type', 'PERCENT'] },
                                            then: { $multiply: [subtotalPrice, { $divide: ['$discount_value', 100] }] },
                                            else: { $min: ['$discount_value', subtotalPrice] }
                                        }
                                    }
                                ]
                            }]
                        }
                    }
                }
            ], sessionOpt).toArray();

            if (!coupon) throw new Error('Mã giảm giá không hợp lệ, đã hết hạn, đơn hàng chưa đủ điều kiện hoặc bạn đã sử dụng mã này rồi.');
            discountAmount  = coupon.discountAmount;
            totalPrice      = coupon.finalPrice;
            appliedCouponId = coupon._id;
            couponSnapshot  = {
                _id: coupon._id,
                code: coupon.code,
                discount_type: coupon.discount_type,
                discount_value: coupon.discount_value,
                discount_amount: coupon.discountAmount
            };

            await couponsCol.updateOne(
                { _id: appliedCouponId },
                { $inc: { used_count: 1 } },
                sessionOpt
            );
        }

        const seatSnapshots = buildSeatSnapshots(showtimeInfo.requestedSeats, seatsToBook);
        const movieDoc = showtimeInfo.movie || await moviesCol.findOne(
            { _id: showtimeInfo.movie_id },
            { projection: { title: 1, poster_url: 1, duration: 1 }, ...sessionOpt }
        );

        // Lấy room_id từ collection Rooms theo room_name
        const roomDoc = await db.collection('Rooms').findOne(
            { room_name: showtimeInfo.room_name },
            { projection: { _id: 1 }, ...sessionOpt }
        );
        const roomId = roomDoc?._id || null;

        const customerSnapshot = {
            _id: customer._id,
            full_name: customer.full_name,
            email: customer.email,
            phone: customer.phone,
            role: customer.role,
            loyalty_points: customer.loyalty_points
        };

        const showtimeSnapshot = {
            _id: showtimeObjId,
            room_name: showtimeInfo.room_name,
            start_time: showtimeInfo.start_time,
            end_time: showtimeInfo.end_time,
            movie: movieDoc ? {
                _id: movieDoc._id,
                title: movieDoc.title,
                poster_url: movieDoc.poster_url,
                duration: movieDoc.duration
            } : null
        };

        // Bước 3: Tạo bản ghi đặt vé
        const bookingResult = await bookingsCol.insertOne({
            customer_id:       customerObjId,
            customer_snapshot: customerSnapshot,
            showtime_id:       showtimeObjId,
            showtime_snapshot: showtimeSnapshot,
            movie_id:          showtimeInfo.movie_id,
            movie_snapshot:    showtimeSnapshot.movie,
            room_id:           roomId,
            booked_seats:      seatsToBook,
            seat_snapshots:    seatSnapshots,
            subtotal_price:    subtotalPrice,
            discount_amount:   discountAmount,
            total_price:       totalPrice,
            payment_method:    'Chuyển khoản',
            status:            'Hoàn tất',
            coupon_code:       couponCode || null,
            coupon_snapshot:   couponSnapshot,
            created_at:        new Date(),
            updated_at:        new Date(),
            cancelled_at:      null
        }, sessionOpt);

        // Bước 4: Ghi nhận CouponUsage nếu có coupon
        if (appliedCouponId) {
            await db.collection('CouponUsages').insertOne({
                coupon_id:   appliedCouponId,
                customer_id: customerObjId,
                booking_id:  bookingResult.insertedId,
                used_at:     new Date()
            }, sessionOpt);
        }

        // Bước 5: Cập nhật trạng thái ghế → 'Đã được đặt'
        await showtimesCol.updateOne(
            { _id: showtimeObjId },
            { $set: { 'seats.$[elem].status': 'Đã được đặt' } },
            { arrayFilters: [{ 'elem.seat_code': { $in: seatsToBook } }], ...sessionOpt }
        );

        return { bookingId: bookingResult.insertedId, totalPrice, message: 'Đặt vé thành công!' };
    }

    // Chạy không có transaction (standalone MongoDB)
    if (!supportsTransactions) {
        console.warn('[bookingTransaction] MongoDB standalone: chạy không có transaction, không đảm bảo ACID.');
        return runBooking();
    }

    // Chạy có transaction (replica set)
    const session = db.client.startSession();
    try {
        session.startTransaction({ readConcern: { level: 'majority' }, writeConcern: { w: 'majority' } });
        const result = await runBooking(session);
        await session.commitTransaction();
        return result;
    } catch (error) {
        try { await session.abortTransaction(); } catch {}
        if (isStandaloneTransactionError(error)) return runBooking();
        throw error;
    } finally {
        session.endSession();
    }
}

async function createBookingForCustomer(db, currentUser, { customerId, showtimeId, seatsToBook, couponCode }) {
    if (String(currentUser._id) !== String(customerId)) {
        throw httpError('Bạn chỉ có thể đặt vé cho tài khoản của chính mình.', 403);
    }

    validateBookingInput(customerId, showtimeId, seatsToBook);
    return handleTicketBooking(db, customerId, showtimeId, seatsToBook, couponCode || null);
}

async function cancelBooking(db, currentUser, bookingId) {
    if (!ObjectId.isValid(bookingId)) {
        throw httpError('ID đặt vé không hợp lệ.', 400);
    }

    const booking = await db.collection('Bookings').findOne({ _id: new ObjectId(bookingId) });
    if (!booking) {
        throw httpError('Không tìm thấy đặt vé.', 404);
    }

    if (String(booking.customer_id) !== String(currentUser._id)) {
        throw httpError('Bạn không có quyền hủy vé này.', 403);
    }

    if (booking.status !== 'Hoàn tất') {
        throw httpError('Chỉ có thể hủy vé có trạng thái "Hoàn tất".', 400);
    }

    await db.collection('Bookings').updateOne(
        { _id: new ObjectId(bookingId) },
        { $set: { status: 'Đã hủy', updated_at: new Date(), cancelled_at: new Date() } }
    );

    await db.collection('Showtimes').updateOne(
        { _id: booking.showtime_id },
        { $set: { 'seats.$[elem].status': 'Trống' } },
        { arrayFilters: [{ 'elem.seat_code': { $in: booking.booked_seats } }] }
    );

    // Change stream handles point deduction on replica set; standalone runs fallback here.
    const supportsChangeStreams = await isReplicaSet(db);
    if (!supportsChangeStreams) {
        const earnedPoints = Math.floor((booking.subtotal_price || 0) / 10000);
        await db.collection('Users').updateOne(
            { _id: booking.customer_id },
            [{ $set: { loyalty_points: { $max: [0, { $subtract: ['$loyalty_points', earnedPoints + 10] }] } } }]
        );
    }

    return { message: 'Hủy vé thành công.' };
}

export { validateBookingInput, handleTicketBooking, createBookingForCustomer, cancelBooking };
