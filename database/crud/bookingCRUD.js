import { ObjectId } from 'mongodb';

async function createBooking(db, data) {
    const now = new Date();
    const customerId = data.customer_id instanceof ObjectId ? data.customer_id : new ObjectId(data.customer_id);
    const showtimeId = data.showtime_id instanceof ObjectId ? data.showtime_id : new ObjectId(data.showtime_id);
    const result = await db.collection('Bookings').insertOne({
        customer_id:      customerId,
        customer_snapshot: data.customer_snapshot || null,
        showtime_id:      showtimeId,
        showtime_snapshot: data.showtime_snapshot || null,
        movie_id:         data.movie_id ? (data.movie_id instanceof ObjectId ? data.movie_id : new ObjectId(data.movie_id)) : null,
        movie_snapshot:   data.movie_snapshot || null,
        booked_seats:     data.booked_seats || [],
        seat_snapshots:   data.seat_snapshots || [],
        subtotal_price:   data.subtotal_price ?? data.total_price ?? 0,
        discount_amount:  data.discount_amount ?? 0,
        total_price:      data.total_price ?? 0,
        payment_method:   data.payment_method || 'Chuyển khoản',
        status:           data.status || 'Hoàn tất',
        coupon_code:      data.coupon_code || null,
        coupon_snapshot:  data.coupon_snapshot || null,
        created_at:       data.created_at || now,
        updated_at:       data.updated_at || now,
        cancelled_at:     data.cancelled_at || null
    });
    return result.insertedId;
}

async function getAllBookings(db) {
    return db.collection('Bookings').find({}).toArray();
}

async function getBookingById(db, id) {
    return db.collection('Bookings').findOne({ _id: new ObjectId(id) });
}

async function updateBookingStatus(db, id, status) {
    const now = new Date();
    const result = await db.collection('Bookings').updateOne(
        { _id: new ObjectId(id) },
        {
            $set: {
                status,
                updated_at: now,
                ...(status === 'Đã hủy' ? { cancelled_at: now } : {})
            }
        }
    );
    return result.modifiedCount;
}

async function deleteBooking(db, id) {
    const result = await db.collection('Bookings').deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount;
}

export { createBooking, getAllBookings, getBookingById, updateBookingStatus, deleteBooking };
