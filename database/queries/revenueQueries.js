// Doanh thu theo tháng trong một năm (Aggregation Pipeline)
async function getMonthlyRevenue(db, year) {
    const startDate = new Date(`${year}-01-01T00:00:00Z`);
    const endDate   = new Date(`${year}-12-31T23:59:59Z`);

    const pipeline = [
        // Stage 1: Lọc các giao dịch thành công trong phạm vi năm
        {
            $match: {
                status:     'Hoàn tất',
                created_at: { $gte: startDate, $lte: endDate }
            }
        },
        // Stage 2: Nhóm theo năm và tháng để tính tổng
        {
            $group: {
                _id: {
                    year:  { $year:  '$created_at' },
                    month: { $month: '$created_at' }
                },
                total_revenue: { $sum: '$total_price' },
                total_tickets: { $sum: { $size: '$booked_seats' } }
            }
        },
        // Stage 3: Sắp xếp kết quả theo thời gian
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        // Stage 4: Định dạng lại output
        {
            $project: {
                _id:      0,
                Thang:    '$_id.month',
                Nam:      '$_id.year',
                DoanhThu: '$total_revenue',
                SoVeBan:  '$total_tickets'
            }
        }
    ];

    return db.collection('Bookings').aggregate(pipeline).toArray();
}

// Tổng doanh thu toàn thời gian
async function getTotalRevenue(db) {
    const pipeline = [
        { $match: { status: 'Hoàn tất' } },
        {
            $group: {
                _id:           null,
                total_revenue: { $sum: '$total_price' },
                total_tickets: { $sum: { $size: '$booked_seats' } },
                total_bookings: { $sum: 1 }
            }
        },
        { $project: { _id: 0 } }
    ];

    const result = await db.collection('Bookings').aggregate(pipeline).toArray();
    return result[0] || { total_revenue: 0, total_tickets: 0, total_bookings: 0 };
}

// Doanh thu theo từng phim ($lookup Showtimes → Movies)
async function getRevenueByMovie(db) {
    const pipeline = [
        { $match: { status: 'Hoàn tất' } },
        {
            $lookup: {
                from:         'Showtimes',
                localField:   'showtime_id',
                foreignField: '_id',
                as:           'showtime'
            }
        },
        { $unwind: '$showtime' },
        {
            $lookup: {
                from:         'Movies',
                localField:   'showtime.movie_id',
                foreignField: '_id',
                as:           'movie'
            }
        },
        { $unwind: '$movie' },
        {
            $group: {
                _id:           '$movie._id',
                movie_title:   { $first: '$movie.title' },
                total_revenue: { $sum: '$total_price' },
                total_tickets: { $sum: { $size: '$booked_seats' } }
            }
        },
        { $sort: { total_revenue: -1 } }
    ];

    return db.collection('Bookings').aggregate(pipeline).toArray();
}

export { getMonthlyRevenue, getTotalRevenue, getRevenueByMovie };
