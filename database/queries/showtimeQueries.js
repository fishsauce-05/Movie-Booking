import { ObjectId } from 'mongodb';

// Lấy tất cả suất chiếu của một bộ phim
async function getShowtimesByMovie(db, movieId) {
    return db.collection('Showtimes')
        .find({ movie_id: new ObjectId(movieId) })
        .sort({ start_time: 1 })
        .toArray();
}

// Suất chiếu sắp tới của một phim kèm số ghế trống/tổng (dùng cho trang đặt vé)
async function getUpcomingShowtimesByMovie(db, movieId) {
    const now = new Date();
    return db.collection('Showtimes').aggregate([
        {
            $match: {
                movie_id:   new ObjectId(movieId),
                start_time: { $gte: now }
            }
        },
        {
            $addFields: {
                totalSeats:     { $size: '$seats' },
                availableSeats: {
                    $size: {
                        $filter: { input: '$seats', as: 's', cond: { $eq: ['$$s.status', 'Trống'] } }
                    }
                }
            }
        },
        { $project: { seats: 0 } },
        { $sort:    { start_time: 1 } }
    ]).toArray();
}

// Lấy suất chiếu theo ngày (so sánh ngày, không tính giờ)
async function getShowtimesByDate(db, date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return db.collection('Showtimes')
        .find({ start_time: { $gte: start, $lte: end } })
        .sort({ start_time: 1 })
        .toArray();
}

// Lấy suất chiếu theo phòng
async function getShowtimesByRoom(db, roomName) {
    return db.collection('Showtimes')
        .find({ room_name: roomName })
        .sort({ start_time: 1 })
        .toArray();
}

// Lấy một suất chiếu kèm thông tin phim ($lookup)
async function getShowtimeWithMovieInfo(db, showtimeId) {
    const [showtime] = await db.collection('Showtimes').aggregate([
        { $match: { _id: new ObjectId(showtimeId) } },
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

    return showtime || null;
}

// Lấy ghế trống của một suất chiếu (Aggregation Pipeline)
async function getAvailableSeats(db, showtimeId) {
    const pipeline = [
        { $match: { _id: new ObjectId(showtimeId) } },
        {
            $project: {
                movie_id:   1,
                room_name:  1,
                start_time: 1,
                available_seats: {
                    $filter: {
                        input: '$seats',
                        as:    'seat',
                        cond:  { $eq: ['$$seat.status', 'Trống'] }
                    }
                }
            }
        },
        {
            $addFields: {
                available_count: { $size: '$available_seats' }
            }
        }
    ];

    const result = await db.collection('Showtimes').aggregate(pipeline).toArray();
    return result[0] || null;
}

// Lấy suất chiếu kèm thông tin phim (tất cả, dùng cho danh sách)
async function getShowtimesWithMovieInfo(db) {
    return db.collection('Showtimes').aggregate([
        {
            $lookup: {
                from:         'Movies',
                localField:   'movie_id',
                foreignField: '_id',
                as:           'movie'
            }
        },
        { $unwind: '$movie' },
        { $sort:   { start_time: 1 } },
        {
            $project: {
                room_name:          1,
                start_time:         1,
                end_time:           1,
                'movie.title':      1,
                'movie.duration':   1,
                'movie.poster_url': 1,
                available_seats: {
                    $size: {
                        $filter: {
                            input: '$seats',
                            as:    'seat',
                            cond:  { $eq: ['$$seat.status', 'Trống'] }
                        }
                    }
                }
            }
        }
    ]).toArray();
}

export {
    getShowtimesByMovie,
    getUpcomingShowtimesByMovie,
    getShowtimesByDate,
    getShowtimesByRoom,
    getShowtimeWithMovieInfo,
    getAvailableSeats,
    getShowtimesWithMovieInfo
};
