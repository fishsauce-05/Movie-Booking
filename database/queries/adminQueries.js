import { ObjectId } from 'mongodb';

// Tất cả suất chiếu kèm thông tin phim + số ghế trống/đã đặt
async function getAdminShowtimes(db) {
    return db.collection('Showtimes').aggregate([
        {
            $lookup: {
                from:         'Movies',
                localField:   'movie_id',
                foreignField: '_id',
                pipeline:     [{ $project: { title: 1, poster_url: 1 } }],
                as:           'movie'
            }
        },
        {
            $addFields: {
                movie:      { $first: '$movie' },
                totalSeats: { $size: '$seats' },
                bookedSeats: {
                    $size: {
                        $filter: { input: '$seats', as: 's', cond: { $eq: ['$$s.status', 'Đã được đặt'] } }
                    }
                }
            }
        },
        { $project: { seats: 0 } },
        { $sort:    { start_time: -1 } }
    ]).toArray();
}

// Danh sách users với lọc theo role và/hoặc từ khóa tìm kiếm
async function searchUsers(db, role, q) {
    const match = {};
    if (role) match.role = role;
    if (q) match.$or = [
        { full_name: { $regex: q, $options: 'i' } },
        { email:     { $regex: q, $options: 'i' } }
    ];

    return db.collection('Users').aggregate([
        { $match:   match },
        { $project: { password: 0 } },
        { $sort:    { _id: -1 } }
    ]).toArray();
}

// Doanh thu theo từng phim, có thể lọc theo khoảng thời gian
async function getRevenueByMovieFiltered(db, from, to) {
    const matchStage = { status: 'Hoàn tất' };
    if (from || to) {
        matchStage.created_at = {};
        if (from) matchStage.created_at.$gte = new Date(from);
        if (to)   matchStage.created_at.$lte = new Date(to);
    }

    return db.collection('Bookings').aggregate([
        { $match: matchStage },
        {
            $lookup: {
                from:         'Showtimes',
                localField:   'showtime_id',
                foreignField: '_id',
                pipeline:     [{ $project: { movie_id: 1 } }],
                as:           'st'
            }
        },
        { $addFields: { movie_id: { $first: '$st.movie_id' } } },
        {
            $group: {
                _id:            '$movie_id',
                total_revenue:  { $sum: '$total_price' },
                total_tickets:  { $sum: { $size: '$booked_seats' } },
                total_bookings: { $sum: 1 }
            }
        },
        {
            $lookup: {
                from:         'Movies',
                localField:   '_id',
                foreignField: '_id',
                pipeline:     [{ $project: { title: 1, poster_url: 1 } }],
                as:           'movie'
            }
        },
        { $addFields: { movie: { $first: '$movie' } } },
        { $project:   { st: 0 } },
        { $sort:      { total_revenue: -1 } }
    ]).toArray();
}

// Tất cả coupons kèm trường tính toán isExpired và remainingUses
async function getAdminCoupons(db) {
    const now = new Date();
    return db.collection('Coupons').aggregate([
        {
            $addFields: {
                isExpired:     { $lt: ['$end_date', now] },
                remainingUses: { $subtract: ['$max_uses', '$used_count'] }
            }
        },
        { $sort: { end_date: -1 } }
    ]).toArray();
}

export { getAdminShowtimes, searchUsers, getRevenueByMovieFiltered, getAdminCoupons };
