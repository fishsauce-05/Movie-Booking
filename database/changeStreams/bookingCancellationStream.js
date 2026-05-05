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
                const booking      = change.fullDocument;
                const pointsToUndo = Math.floor(booking.total_price / 10000);

                console.log(`Đặt vé ${booking._id} bị hủy. Hoàn ${pointsToUndo} điểm cho khách hàng ${booking.customer_id}.`);

                const customer = await usersCol.findOne(
                    { _id: booking.customer_id },
                    { projection: { loyalty_points: 1 } }
                );

                // Trừ lại điểm tích lũy đã tặng khi đặt vé (đối xứng với loyaltyStream)
                await usersCol.updateOne(
                    { _id: booking.customer_id },
                    { $set: { loyalty_points: Math.max(0, (customer?.loyalty_points || 0) - pointsToUndo) } }
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
