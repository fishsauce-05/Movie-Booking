async function clearBookings(db) {
    const result = await db.collection('Bookings').deleteMany({});
    console.log(`✓ Đã xóa ${result.deletedCount} booking cũ`);
}

async function insertBookings(db, { showtimeIds } = {}) {
    const stIds = Object.values(showtimeIds || {});
    if (stIds.length === 0) {
        console.log('✓ Bỏ qua seed booking: không có suất chiếu');
        return;
    }

    const customer = await db.collection('Users').findOne({ email: 'user.customer@gmail.com' });
    if (!customer) {
        console.log('✓ Bỏ qua seed booking: không tìm thấy tài khoản mẫu');
        return;
    }

    // Lấy 2 suất chiếu đầu kèm thông tin phim
    const showtimes = await db.collection('Showtimes').aggregate([
        { $match: { _id: { $in: stIds.slice(0, 2) } } },
        {
            $lookup: {
                from:         'Movies',
                localField:   'movie_id',
                foreignField: '_id',
                pipeline:     [{ $project: { title: 1, poster_url: 1, duration: 1 } }],
                as:           'movie'
            }
        },
        { $addFields: { movie: { $first: '$movie' } } }
    ]).toArray();

    if (showtimes.length === 0) return;

    const customerSnap = {
        _id:            customer._id,
        full_name:      customer.full_name,
        email:          customer.email,
        phone:          customer.phone,
        role:           customer.role,
        loyalty_points: customer.loyalty_points
    };

    const now = new Date();
    const bookings = [];

    for (let i = 0; i < showtimes.length; i++) {
        const st    = showtimes[i];
        const room  = await db.collection('Rooms').findOne({ room_name: st.room_name }, { projection: { _id: 1 } });
        const seats = i === 0 ? ['A1', 'A2'] : ['B5', 'C5'];

        const seatSnaps = seats.map((code) => {
            const s = (st.seats || []).find((x) => x.seat_code === code);
            return s
                ? { seat_code: s.seat_code, type: s.type, price: s.price }
                : { seat_code: code, type: 'NORMAL', price: 100000 };
        });

        const subtotal  = seatSnaps.reduce((sum, s) => sum + (s.price || 0), 0);
        const movieSnap = st.movie
            ? { _id: st.movie._id, title: st.movie.title, poster_url: st.movie.poster_url, duration: st.movie.duration }
            : null;

        bookings.push({
            customer_id:       customer._id,
            customer_snapshot: customerSnap,
            showtime_id:       st._id,
            showtime_snapshot: {
                _id:        st._id,
                room_name:  st.room_name,
                start_time: st.start_time,
                end_time:   st.end_time,
                movie:      movieSnap
            },
            movie_id:        st.movie_id,
            movie_snapshot:  movieSnap,
            room_id:         room?._id || null,
            booked_seats:    seats,
            seat_snapshots:  seatSnaps,
            subtotal_price:  subtotal,
            discount_amount: 0,
            total_price:     subtotal,
            payment_method:  'Chuyển khoản',
            status:          'Hoàn tất',
            coupon_code:     null,
            coupon_snapshot: null,
            created_at:      new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000),
            updated_at:      new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000),
            cancelled_at:    null
        });
    }

    const result = await db.collection('Bookings').insertMany(bookings);

    // Đánh dấu các ghế đã đặt trong suất chiếu tương ứng
    for (let i = 0; i < showtimes.length; i++) {
        await db.collection('Showtimes').updateOne(
            { _id: showtimes[i]._id },
            { $set: { 'seats.$[elem].status': 'Đã được đặt' } },
            { arrayFilters: [{ 'elem.seat_code': { $in: bookings[i].booked_seats } }] }
        );
    }

    // Cộng điểm tích lũy cho khách hàng (1 điểm / 10.000đ)
    const totalPoints = bookings.reduce((sum, b) => sum + Math.floor(b.subtotal_price / 10000), 0);
    if (totalPoints > 0) {
        await db.collection('Users').updateOne(
            { _id: customer._id },
            { $inc: { loyalty_points: totalPoints } }
        );
    }

    console.log(`✓ Thêm ${result.insertedCount} booking mẫu (${totalPoints} điểm tích lũy cho ${customer.email})`);
    return result.insertedIds;
}

export { clearBookings, insertBookings };
