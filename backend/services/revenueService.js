export async function getMonthlyRevenue(db, year) {
    const bookingsCollection = db.collection('Bookings');

    const startDate = new Date(`${year}-01-01T00:00:00Z`);
    const endDate = new Date(`${year}-12-31T23:59:59Z`);

    const pipeline = [
        { $match: {
            status: 'Hoàn tất',
            created_at: { $gte: startDate, $lte: endDate }
        }},
        { $group: {
            _id: {
                year: { $year: '$created_at' },
                month: { $month: '$created_at' }
            },
            total_revenue: { $sum: '$total_price' },
            total_tickets: { $sum: { $size: '$booked_seats' } }
        }},
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $project: {
            _id: 0,
            Thang: '$_id.month',
            Nam: '$_id.year',
            DoanhThu: '$total_revenue',
            SoVeBan: '$total_tickets'
        }}
    ];

    return bookingsCollection.aggregate(pipeline).toArray();
}
