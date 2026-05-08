import { ObjectId } from 'mongodb';

// Lấy tất cả đặt vé của một khách hàng
async function getBookingsByCustomer(db, customerId) {
    return db.collection('Bookings')
        .find({ customer_id: new ObjectId(customerId) })
        .sort({ created_at: -1 })
        .toArray();
}

// Lấy đặt vé kèm đầy đủ thông tin suất chiếu + phim (dùng nested $lookup)
async function getBookingsByCustomerWithDetails(db, customerId) {
    if (!ObjectId.isValid(customerId)) {
        const err = new Error('ID khách hàng không hợp lệ.');
        err.status = 400;
        throw err;
    }

    return db.collection('Bookings').aggregate([
        { $match: { customer_id: new ObjectId(customerId) } },
        {
            $lookup: {
                from:         'Showtimes',
                localField:   'showtime_id',
                foreignField: '_id',
                pipeline: [
                    {
                        $lookup: {
                            from:         'Movies',
                            localField:   'movie_id',
                            foreignField: '_id',
                            pipeline:     [{ $project: { title: 1, poster_url: 1 } }],
                            as:           'movie'
                        }
                    },
                    { $addFields: { movie: { $first: '$movie' } } },
                    { $project:   { movie: 1, room_name: 1, start_time: 1, end_time: 1 } }
                ],
                as: 'showtime'
            }
        },
        {
            $addFields: {
                showtime: {
                    $ifNull: ['$showtime_snapshot', { $first: '$showtime' }]
                }
            }
        },
        { $sort:      { created_at: -1 } }
    ]).toArray();
}

// Lấy tất cả đặt vé của một suất chiếu
async function getBookingsByShowtime(db, showtimeId) {
    return db.collection('Bookings')
        .find({ showtime_id: new ObjectId(showtimeId) })
    .sort({ created_at: -1 })
        .toArray();
}

// Đếm tổng số vé và doanh thu theo trạng thái
async function getBookingSummaryByStatus(db) {
    const pipeline = [
        {
            $group: {
                _id:             '$status',
                total_bookings:  { $sum: 1 },
                total_revenue:   { $sum: '$total_price' },
                total_seats:     { $sum: { $size: '$booked_seats' } }
            }
        },
        { $sort: { total_revenue: -1 } }
    ];

    return db.collection('Bookings').aggregate(pipeline).toArray();
}

async function getStaffBookingById(db, bookingId) {
    if (!ObjectId.isValid(bookingId)) {
        const err = new Error('Mã đặt vé không hợp lệ.');
        err.status = 400;
        throw err;
    }

    const [booking] = await db.collection('Bookings').aggregate([
        { $match: { _id: new ObjectId(bookingId) } },
        {
            $lookup: {
                from: 'Showtimes',
                localField: 'showtime_id',
                foreignField: '_id',
                pipeline: [
                    {
                        $lookup: {
                            from: 'Movies',
                            localField: 'movie_id',
                            foreignField: '_id',
                            pipeline: [{ $project: { title: 1 } }],
                            as: 'movie'
                        }
                    },
                    { $addFields: { movie: { $first: '$movie' } } },
                    { $project: { seats: 0 } }
                ],
                as: 'showtime'
            }
        },
        { $addFields: { showtime: { $first: '$showtime' } } }
    ]).toArray();

    if (!booking) {
        const err = new Error('Không tìm thấy đặt vé.');
        err.status = 404;
        throw err;
    }

    return booking;
}

async function getAllBookings(db) {
    return db.collection('Bookings').find({}).toArray();
}

async function getBookingById(db, id) {
    return db.collection('Bookings').findOne({ _id: new ObjectId(id) });
}

export {
    getBookingsByCustomer,
    getBookingsByCustomerWithDetails,
    getBookingsByShowtime,
    getBookingSummaryByStatus,
    getStaffBookingById,
    getAllBookings,
    getBookingById
};
