import { ObjectId } from 'mongodb';

// Tìm kiếm phim bằng $text index và lọc theo thể loại — tối ưu server-side
async function searchMoviesOptimized(db, keyword, genres, page = 1, limit = 10) {
    const skip  = (page - 1) * limit;
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

// Lấy tất cả phim theo trạng thái ('Đang chiếu' | 'Sắp chiếu' | 'Ngừng chiếu')
async function getMoviesByStatus(db, status) {
    return db.collection('Movies').find({ status }).sort({ release_date: -1 }).toArray();
}

// Lấy phim theo thể loại
async function getMoviesByGenre(db, genre) {
    return db.collection('Movies')
        .find({ genre: { $in: [genre] } })
        .sort({ release_date: -1 })
        .toArray();
}

// Lấy phim kèm danh sách suất chiếu (JOIN bằng $lookup)
async function getMovieWithShowtimes(db, movieId) {
    const pipeline = [
        { $match: { _id: new ObjectId(movieId) } },
        {
            $lookup: {
                from:         'Showtimes',
                localField:   '_id',
                foreignField: 'movie_id',
                as:           'showtimes'
            }
        }
    ];
    const result = await db.collection('Movies').aggregate(pipeline).toArray();
    return result[0] || null;
}

// Đếm số phim theo từng thể loại
async function countMoviesByGenre(db) {
    const pipeline = [
        { $unwind: '$genre' },
        { $group: { _id: '$genre', count: { $sum: 1 } } },
        { $sort:  { count: -1 } }
    ];
    return db.collection('Movies').aggregate(pipeline).toArray();
}

export {
    searchMoviesOptimized,
    getMoviesByStatus,
    getMoviesByGenre,
    getMovieWithShowtimes,
    countMoviesByGenre
};
