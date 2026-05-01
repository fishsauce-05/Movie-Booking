function makeShowtimes(movieIds) {
    const ids = Object.values(movieIds);

    return [
        {
            movie_id: ids[0],
            room_name: 'Phòng 1',
            start_time: new Date('2026-05-10T14:00:00'),
            end_time:   new Date('2026-05-10T16:12:00'),
            seats: [
                { seat_code: 'A1', type: 'NORMAL', price: 100000, status: 'Trống' },
                { seat_code: 'A2', type: 'NORMAL', price: 100000, status: 'Trống' },
                { seat_code: 'A3', type: 'NORMAL', price: 100000, status: 'Trống' },
                { seat_code: 'C3', type: 'VIP',    price: 150000, status: 'Trống' },
                { seat_code: 'C4', type: 'VIP',    price: 150000, status: 'Trống' },
                { seat_code: 'D3', type: 'VIP',    price: 150000, status: 'Trống' }
            ]
        },
        {
            movie_id: ids[0],
            room_name: 'Phòng 2',
            start_time: new Date('2026-05-10T19:00:00'),
            end_time:   new Date('2026-05-10T21:12:00'),
            seats: [
                { seat_code: 'A1', type: 'NORMAL', price: 120000, status: 'Trống' },
                { seat_code: 'A2', type: 'NORMAL', price: 120000, status: 'Trống' },
                { seat_code: 'C3', type: 'VIP',    price: 180000, status: 'Trống' },
                { seat_code: 'C4', type: 'VIP',    price: 180000, status: 'Trống' }
            ]
        },
        {
            movie_id: ids[1],
            room_name: 'Phòng 1',
            start_time: new Date('2026-05-11T10:00:00'),
            end_time:   new Date('2026-05-11T12:46:00'),
            seats: [
                { seat_code: 'A1', type: 'NORMAL', price: 100000, status: 'Trống' },
                { seat_code: 'A2', type: 'NORMAL', price: 100000, status: 'Trống' },
                { seat_code: 'A3', type: 'NORMAL', price: 100000, status: 'Trống' },
                { seat_code: 'C3', type: 'VIP',    price: 150000, status: 'Trống' },
                { seat_code: 'D4', type: 'VIP',    price: 150000, status: 'Trống' }
            ]
        },
        {
            movie_id: ids[2],
            room_name: 'Phòng 3',
            start_time: new Date('2026-05-12T15:00:00'),
            end_time:   new Date('2026-05-12T16:36:00'),
            seats: [
                { seat_code: 'A1', type: 'NORMAL', price: 200000, status: 'Trống' },
                { seat_code: 'A2', type: 'NORMAL', price: 200000, status: 'Trống' },
                { seat_code: 'C3', type: 'VIP',    price: 250000, status: 'Trống' },
                { seat_code: 'C4', type: 'VIP',    price: 250000, status: 'Trống' }
            ]
        }
    ];
}

async function insertShowtimes(db, movieIds) {
    await db.collection('Showtimes').deleteMany({});
    const showtimes = makeShowtimes(movieIds);
    const result = await db.collection('Showtimes').insertMany(showtimes);
    console.log(`✓ Thêm ${result.insertedCount} suất chiếu`);
    return result.insertedIds;
}

export { makeShowtimes, insertShowtimes };
