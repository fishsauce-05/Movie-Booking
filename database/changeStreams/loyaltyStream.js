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

// Lắng nghe sự kiện đặt vé hoàn tất → tự động cộng điểm tích lũy cho khách hàng
// Công thức: 1 điểm / 10.000đ
function startLoyaltyPointListener(db) {
    const bookingsCol = db.collection('Bookings');
    const usersCol    = db.collection('Users');

    isReplicaSet(db).then((supported) => {
        if (!supported) {
            console.warn('Bỏ qua hệ thống tích điểm tự động vì MongoDB chưa bật replica set.');
            return;
        }

        const changeStream = bookingsCol.watch(
            [
                {
                    $match: {
                        operationType:          { $in: ['insert', 'update'] },
                        'fullDocument.status':  'Hoàn tất'
                    }
                }
            ],
            { fullDocument: 'updateLookup' }
        );

        changeStream.on('change', async (change) => {
            try {
                const booking      = change.fullDocument;
                const pointsToAward = Math.floor(booking.total_price / 10000);

                console.log(`Hoá đơn ${booking._id} hoàn tất. Cộng ${pointsToAward} điểm cho khách hàng.`);

                await usersCol.updateOne(
                    { _id: booking.customer_id },
                    { $inc: { loyalty_points: pointsToAward } }
                );

                console.log(`Đã cộng điểm thưởng cho khách hàng ${booking.customer_id}`);
            } catch (error) {
                console.error('Lỗi xử lý Change Stream:', error);
            }
        });

        changeStream.on('error', (error) => {
            console.error('Change Stream loyalty listener gặp lỗi:', error);
        });

        console.log('Change Stream Listener cho hệ thống tích điểm đã khởi động.');
    });
}

module.exports = { startLoyaltyPointListener };
