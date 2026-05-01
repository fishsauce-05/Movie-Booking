import { ObjectId } from 'mongodb';

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

export function validateBookingInput(customerId, showtimeId, seatsToBook) {
    if (!ObjectId.isValid(customerId) || !ObjectId.isValid(showtimeId)) {
        throw new Error('ID khách hàng hoặc ID suất chiếu không hợp lệ.');
    }
    if (!Array.isArray(seatsToBook) || seatsToBook.length === 0) {
        throw new Error('Vui lòng chọn ít nhất một ghế.');
    }
    if (new Set(seatsToBook).size !== seatsToBook.length) {
        throw new Error('Mã ghế bị trùng lặp trong yêu cầu.');
    }
}

export async function handleTicketBooking(db, customerId, showtimeId, seatsToBook, couponCode = null) {
    const bookingsCol = db.collection('Bookings');
    const showtimesCol = db.collection('Showtimes');
    const couponsCol = db.collection('Coupons');
    const customerObjId = new ObjectId(customerId);
    const showtimeObjId = new ObjectId(showtimeId);

    const supportsTransactions = await isReplicaSet(db);

    async function runBooking(session = null) {
        const sessionOpt = session ? { session } : {};

        const [seatInfo] = await showtimesCol.aggregate([
            { $match: { _id: showtimeObjId } },
            { $project: {
                requested: {
                    $filter: { input: '$seats', as: 's', cond: { $in: ['$$s.seat_code', seatsToBook] } }
                }
            }},
            { $project: {
                foundCount: { $size: '$requested' },
                unavailable: {
                    $map: {
                        input: { $filter: { input: '$requested', as: 's', cond: { $ne: ['$$s.status', 'Trống'] } } },
                        as: 'u',
                        in: '$$u.seat_code'
                    }
                },
                basePrice: { $sum: '$requested.price' }
            }}
        ], sessionOpt).toArray();

        if (!seatInfo) throw new Error('Suất chiếu không tồn tại.');
        if (seatInfo.foundCount !== seatsToBook.length) throw new Error('Một hoặc nhiều ghế không tồn tại trong suất chiếu.');
        if (seatInfo.unavailable.length > 0) throw new Error(`Ghế không khả dụng: ${seatInfo.unavailable.join(', ')}`);

        let totalPrice = seatInfo.basePrice;
        let appliedCouponId = null;

        if (couponCode) {
            const now = new Date();
            const [coupon] = await couponsCol.aggregate([
                { $match: {
                    code: couponCode,
                    status: 'ACTIVE',
                    start_date: { $lte: now },
                    end_date: { $gte: now },
                    $expr: { $lt: ['$used_count', '$max_uses'] },
                    min_order_value: { $lte: totalPrice }
                }},
                { $project: {
                    discountAmount: {
                        $cond: {
                            if: { $eq: ['$discount_type', 'PERCENT'] },
                            then: { $multiply: [totalPrice, { $divide: ['$discount_value', 100] }] },
                            else: { $min: ['$discount_value', totalPrice] }
                        }
                    },
                    finalPrice: {
                        $max: [0, { $subtract: [
                            totalPrice,
                            { $cond: {
                                if: { $eq: ['$discount_type', 'PERCENT'] },
                                then: { $multiply: [totalPrice, { $divide: ['$discount_value', 100] }] },
                                else: { $min: ['$discount_value', totalPrice] }
                            }}
                        ]}]
                    }
                }}
            ], sessionOpt).toArray();

            if (!coupon) throw new Error('Mã giảm giá không hợp lệ, đã hết hạn hoặc đơn hàng chưa đủ điều kiện.');
            totalPrice = coupon.finalPrice;
            appliedCouponId = coupon._id;

            await couponsCol.updateOne(
                { _id: appliedCouponId },
                { $inc: { used_count: 1 } },
                sessionOpt
            );
        }

        const bookingResult = await bookingsCol.insertOne({
            customer_id: customerObjId,
            showtime_id: showtimeObjId,
            booked_seats: seatsToBook,
            total_price: totalPrice,
            payment_method: 'Chuyển khoản',
            status: 'Hoàn tất',
            coupon_code: couponCode || null,
            created_at: new Date()
        }, sessionOpt);

        await showtimesCol.updateOne(
            { _id: showtimeObjId },
            { $set: { 'seats.$[elem].status': 'Đã được đặt' } },
            { arrayFilters: [{ 'elem.seat_code': { $in: seatsToBook } }], ...sessionOpt }
        );

        return { bookingId: bookingResult.insertedId, totalPrice, message: 'Đặt vé thành công!' };
    }

    if (!supportsTransactions) {
        return runBooking();
    }

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
