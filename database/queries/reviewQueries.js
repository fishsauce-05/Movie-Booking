import { ObjectId } from 'mongodb';

// $facet: tính avgRating + danh sách reviews phân trang trong một lần aggregate
async function getReviewsByMoviePaginated(db, movieId, page = 1) {
    const limit     = 10;
    const movieObjId = new ObjectId(movieId);

    const [result] = await db.collection('Reviews').aggregate([
        { $match: { movie_id: movieObjId } },
        {
            $facet: {
                stats: [
                    { $group:   { _id: null, avgRating: { $avg: '$rating' }, total: { $sum: 1 } } },
                    { $project: { _id: 0, avgRating: { $round: ['$avgRating', 1] }, total: 1 } }
                ],
                items: [
                    { $sort:  { created_at: -1 } },
                    { $skip:  (page - 1) * limit },
                    { $limit: limit },
                    {
                        $lookup: {
                            from:         'Users',
                            localField:   'customer_id',
                            foreignField: '_id',
                            pipeline:     [{ $project: { full_name: 1 } }],
                            as:           'user'
                        }
                    },
                    {
                        $addFields: {
                            customer_name: { $ifNull: [{ $first: '$user.full_name' }, 'Ẩn danh'] }
                        }
                    },
                    { $project: { user: 0 } }
                ]
            }
        },
        {
            $project: {
                avgRating: { $ifNull: [{ $first: '$stats.avgRating' }, 0] },
                total:     { $ifNull: [{ $first: '$stats.total' }, 0] },
                reviews:   '$items'
            }
        }
    ]).toArray();

    return result || { avgRating: 0, total: 0, reviews: [] };
}

// Kiểm tra khách hàng đã mua vé xem phim này chưa (yêu cầu để viết review)
async function checkCustomerBookedMovie(db, customerId, movieId) {
    const [result] = await db.collection('Bookings').aggregate([
        { $match: { customer_id: new ObjectId(customerId), status: 'Hoàn tất' } },
        {
            $lookup: {
                from:         'Showtimes',
                localField:   'showtime_id',
                foreignField: '_id',
                pipeline:     [{ $project: { movie_id: 1 } }],
                as:           'st'
            }
        },
        { $match:   { 'st.movie_id': new ObjectId(movieId) } },
        { $limit:   1 },
        { $project: { _id: 1 } }
    ]).toArray();

    return Boolean(result);
}

// Kiểm tra khách hàng đã review phim này chưa
async function checkExistingReview(db, movieId, customerId) {
    const existing = await db.collection('Reviews').findOne({
        movie_id:    new ObjectId(movieId),
        customer_id: new ObjectId(customerId)
    });
    return Boolean(existing);
}

export { getReviewsByMoviePaginated, checkCustomerBookedMovie, checkExistingReview };
