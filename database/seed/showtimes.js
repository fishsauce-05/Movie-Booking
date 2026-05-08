import { generateSeats } from './rooms.js';

// Mỗi phòng có bộ ghế và giá riêng
const ROOM_SEATS = {
    'Phòng 1': generateSeats(100000, 150000),
    'Phòng 2': generateSeats(120000, 180000),
    'Phòng 3': generateSeats(150000, 200000)
};

function makeSeatsForRoom(roomName) {
    return (ROOM_SEATS[roomName] || ROOM_SEATS['Phòng 1']).map((s) => ({ ...s, status: 'Trống' }));
}

// Tạo lịch chiếu cho tất cả phim - mỗi phim ít nhất 1 suất
function makeShowtimes(movieIds) {
    const ids = Object.values(movieIds);
    const rooms = ['Phòng 1', 'Phòng 2', 'Phòng 3'];

    // Khung giờ mẫu
    const slots = [
        { hour: 9,  minute: 0  },
        { hour: 11, minute: 30 },
        { hour: 14, minute: 0  },
        { hour: 16, minute: 30 },
        { hour: 19, minute: 0  },
        { hour: 21, minute: 30 }
    ];

    const showtimes = [];
    // Base date: 2026-05-10
    const base = new Date('2026-05-10T00:00:00');

    ids.forEach((movieId, idx) => {
        // Phân phối phim vào các phòng và ngày khác nhau
        const dayOffset  = Math.floor(idx / (rooms.length * slots.length));
        const slotIdx    = idx % slots.length;
        const roomIdx    = Math.floor(idx / slots.length) % rooms.length;
        const room       = rooms[roomIdx];
        const slot       = slots[slotIdx];

        const start = new Date(base);
        start.setDate(start.getDate() + dayOffset);
        start.setHours(slot.hour, slot.minute, 0, 0);

        const end = new Date(start);
        end.setMinutes(end.getMinutes() + 120); // 2h default

        showtimes.push({
            movie_id:   movieId,
            room_name:  room,
            start_time: start,
            end_time:   end,
            seats:      makeSeatsForRoom(room)
        });

        // Phim đầu tiên thêm suất chiều tối thêm
        if (idx === 0) {
            const start2 = new Date('2026-05-10T19:00:00');
            const end2   = new Date('2026-05-10T21:00:00');
            showtimes.push({
                movie_id:   movieId,
                room_name:  'Phòng 2',
                start_time: start2,
                end_time:   end2,
                seats:      makeSeatsForRoom('Phòng 2')
            });
        }
    });

    return showtimes;
}

async function insertShowtimes(db, movieIds) {
    await db.collection('Showtimes').deleteMany({});
    const showtimes = makeShowtimes(movieIds);
    const result = await db.collection('Showtimes').insertMany(showtimes);
    console.log(`✓ Thêm ${result.insertedCount} suất chiếu (mỗi phim ít nhất 1 suất, ghế đầy đủ A1-E10)`);
    return result.insertedIds;
}

export { makeShowtimes, insertShowtimes };
