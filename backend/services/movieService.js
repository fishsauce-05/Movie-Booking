import { ObjectId } from 'mongodb';

export async function searchMoviesOptimized(db, keyword, genres, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const query = { status: 'Đang chiếu' };

    if (typeof keyword === 'string' && keyword.trim() !== '') {
        query.$text = { $search: keyword.trim() };
    }

    if (Array.isArray(genres) && genres.length > 0) {
        query.genre = { $in: genres };
    }

    return db.collection('Movies')
        .find(query)
        .sort({ release_date: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
}

export async function getAvailableSeats(db, showtimeId) {
    const pipeline = [
        { $match: { _id: new ObjectId(showtimeId) } },
        {
            $project: {
                movie_id: 1,
                room_name: 1,
                start_time: 1,
                available_seats: {
                    $filter: {
                        input: '$seats',
                        as: 'seat',
                        cond: { $eq: ['$$seat.status', 'Trống'] }
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
    return result[0];
}
