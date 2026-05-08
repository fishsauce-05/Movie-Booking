// Change Streams yêu cầu MongoDB chạy ở chế độ Replica Set.
// Trên MongoDB standalone (local mặc định), listener này sẽ bị bỏ qua để tránh crash server.

async function isReplicaSet(db) {
    try {
        const hello = await db.admin().command({ hello: 1 });
        return Boolean(hello.setName || hello.msg === 'isdbgrid');
    } catch {
        return false;
    }
}

// Lắng nghe sự kiện hủy đặt vé → hoàn điểm tích lũy + giải phóng ghế về "Trống"
function startBookingCancellationListener(db) {
    const bookingsCol  = db.collection('Bookings');
    const usersCol     = db.collection('Users');
    const showtimesCol = db.collection('Showtimes');

    isReplicaSet(db).then((supported) => {
        if (!supported) {
            console.warn('Bỏ qua Change Stream hủy vé vì MongoDB chưa bật replica set.');
            return;
        }

        const changeStream = bookingsCol.watch(
            [
                {
                    $match: {
                        operationType:         'update',
                        'updateDescription.updatedFields.status': 'Đã hủy'
                    }
                }
            ],
            { fullDocument: 'updateLookup' }
        );

        changeStream.on('change', async (change) => {
            try {
                const booking       = change.fullDocument;
                // Dùng subtotal_price (giá gốc trước giảm giá) — đối xứng với loyaltyStream
                const earnedPoints  = Math.floor((booking.subtotal_price || 0) / 10000);
                const penaltyPoints = 10;
                const totalDeduct   = earnedPoints + penaltyPoints;

                console.log(`Đặt vé ${booking._id} bị hủy. Trừ ${earnedPoints} điểm tích lũy + ${penaltyPoints} điểm phạt = ${totalDeduct} điểm của khách hàng ${booking.customer_id}.`);

                // Trừ điểm tích lũy đã tặng + 10 điểm phạt hủy vé, không xuống dưới 0
                await usersCol.updateOne(
                    { _id: booking.customer_id },
                    [{ $set: { loyalty_points: { $max: [0, { $subtract: ['$loyalty_points', totalDeduct] }] } } }]
                );

                // Giải phóng ghế về "Trống" trong suất chiếu tương ứng
                await showtimesCol.updateOne(
                    { _id: booking.showtime_id },
                    { $set: { 'seats.$[elem].status': 'Trống' } },
                    { arrayFilters: [{ 'elem.seat_code': { $in: booking.booked_seats } }] }
                );

                console.log(`Hoàn tất xử lý hủy vé ${booking._id}.`);
            } catch (error) {
                console.error('Lỗi xử lý Change Stream hủy vé:', error);
            }
        });

        changeStream.on('error', (error) => {
            console.error('Change Stream hủy vé gặp lỗi:', error);
        });

        console.log('Change Stream Listener cho hệ thống hủy vé đã khởi động.');
    });
}

export { startBookingCancellationListener };
