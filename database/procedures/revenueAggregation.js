// Aggregation Pipeline — Thống kê doanh thu theo tháng

async function revenueAggregation(db, year = new Date().getFullYear()) {
    const startDate = new Date(`${year}-01-01T00:00:00Z`);
    const endDate   = new Date(`${year}-12-31T23:59:59Z`);

    const pipeline = [
        // Stage 1: Lọc booking hoàn tất trong năm
        {
            $match: {
                status:     'Hoàn tất',
                created_at: { $gte: startDate, $lte: endDate }
            }
        },
        // Stage 2: Nhóm theo tháng, tính tổng doanh thu và số vé
        {
            $group: {
                _id: {
                    year:  { $year:  '$created_at' },
                    month: { $month: '$created_at' }
                },
                total_revenue: { $sum: '$total_price' },
                total_tickets: { $sum: { $size: '$booked_seats' } },
                total_bookings: { $sum: 1 }
            }
        },
        // Stage 3: Sắp xếp theo thời gian
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        // Stage 4: Format output
        {
            $project: {
                _id:          0,
                Thang:        '$_id.month',
                Nam:          '$_id.year',
                DoanhThu:     '$total_revenue',
                SoVeBan:      '$total_tickets',
                SoGiaoDich:   '$total_bookings'
            }
        }
    ];

    return db.collection('Bookings').aggregate(pipeline).toArray();
}

export { revenueAggregation };
