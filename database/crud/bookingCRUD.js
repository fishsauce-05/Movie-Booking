import { ObjectId } from 'mongodb';

async function createBooking(db, data) {
    const result = await db.collection('Bookings').insertOne({
        customer_id:    new ObjectId(data.customer_id),
        showtime_id:    new ObjectId(data.showtime_id),
        booked_seats:   data.booked_seats,
        total_price:    data.total_price,
        payment_method: data.payment_method || 'Chuyển khoản',
        status:         data.status || 'Hoàn tất',
        coupon_code:    data.coupon_code || null,
        created_at:     new Date()
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
    const result = await db.collection('Bookings').updateOne(
        { _id: new ObjectId(id) },
        { $set: { status, updated_at: new Date() } }
    );
    return result.modifiedCount;
}

async function deleteBooking(db, id) {
    const result = await db.collection('Bookings').deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount;
}

export { createBooking, getAllBookings, getBookingById, updateBookingStatus, deleteBooking };
