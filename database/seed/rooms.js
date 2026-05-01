const ROOMS = [
    {
        room_name: 'Phòng 1',
        screen_type: 'Standard',
        status: 'Active',
        seats: [
            { seat_code: 'A1', type: 'NORMAL', price: 100000, status: 'Trống' },
            { seat_code: 'A2', type: 'NORMAL', price: 100000, status: 'Trống' },
            { seat_code: 'A3', type: 'NORMAL', price: 100000, status: 'Trống' },
            { seat_code: 'B1', type: 'NORMAL', price: 100000, status: 'Trống' },
            { seat_code: 'B2', type: 'NORMAL', price: 100000, status: 'Trống' },
            { seat_code: 'B3', type: 'NORMAL', price: 100000, status: 'Trống' },
            { seat_code: 'C3', type: 'VIP',    price: 150000, status: 'Trống' },
            { seat_code: 'C4', type: 'VIP',    price: 150000, status: 'Trống' },
            { seat_code: 'C5', type: 'VIP',    price: 150000, status: 'Trống' },
            { seat_code: 'D3', type: 'VIP',    price: 150000, status: 'Trống' },
            { seat_code: 'D4', type: 'VIP',    price: 150000, status: 'Trống' },
            { seat_code: 'D5', type: 'VIP',    price: 150000, status: 'Trống' }
        ]
    },
    {
        room_name: 'Phòng 2',
        screen_type: '4DX',
        status: 'Active',
        seats: [
            { seat_code: 'A1', type: 'NORMAL', price: 100000, status: 'Trống' },
            { seat_code: 'A2', type: 'NORMAL', price: 100000, status: 'Trống' },
            { seat_code: 'A3', type: 'NORMAL', price: 100000, status: 'Trống' },
            { seat_code: 'B1', type: 'NORMAL', price: 100000, status: 'Trống' },
            { seat_code: 'B2', type: 'NORMAL', price: 100000, status: 'Trống' },
            { seat_code: 'B3', type: 'NORMAL', price: 100000, status: 'Trống' },
            { seat_code: 'C3', type: 'VIP',    price: 150000, status: 'Trống' },
            { seat_code: 'C4', type: 'VIP',    price: 150000, status: 'Trống' },
            { seat_code: 'C5', type: 'VIP',    price: 150000, status: 'Trống' },
            { seat_code: 'D3', type: 'VIP',    price: 150000, status: 'Trống' },
            { seat_code: 'D4', type: 'VIP',    price: 150000, status: 'Trống' },
            { seat_code: 'D5', type: 'VIP',    price: 150000, status: 'Trống' }
        ]
    },
    {
        room_name: 'Phòng 3',
        screen_type: 'IMAX',
        status: 'Active',
        seats: [
            { seat_code: 'A1', type: 'NORMAL', price: 100000, status: 'Trống' },
            { seat_code: 'A2', type: 'NORMAL', price: 100000, status: 'Trống' },
            { seat_code: 'A3', type: 'NORMAL', price: 100000, status: 'Trống' },
            { seat_code: 'B1', type: 'NORMAL', price: 100000, status: 'Trống' },
            { seat_code: 'B2', type: 'NORMAL', price: 100000, status: 'Trống' },
            { seat_code: 'B3', type: 'NORMAL', price: 100000, status: 'Trống' },
            { seat_code: 'C3', type: 'VIP',    price: 150000, status: 'Trống' },
            { seat_code: 'C4', type: 'VIP',    price: 150000, status: 'Trống' },
            { seat_code: 'C5', type: 'VIP',    price: 150000, status: 'Trống' },
            { seat_code: 'D3', type: 'VIP',    price: 150000, status: 'Trống' },
            { seat_code: 'D4', type: 'VIP',    price: 150000, status: 'Trống' },
            { seat_code: 'D5', type: 'VIP',    price: 150000, status: 'Trống' }
        ]
    }
];

async function insertRooms(db) {
    await db.collection('Rooms').deleteMany({});
    const result = await db.collection('Rooms').insertMany(ROOMS);
    console.log(`✓ Thêm ${result.insertedCount} phòng chiếu`);
    return result.insertedIds;
}

export { ROOMS, insertRooms };
