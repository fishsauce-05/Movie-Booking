function generateSeats(normalPrice, vipPrice) {
    const rows = ['A', 'B', 'C', 'D', 'E'];
    const seats = [];
    for (const row of rows) {
        for (let col = 1; col <= 10; col++) {
            const seatCode = `${row}${col}`;
            const isVip = (row === 'C' || row === 'D') && col >= 4 && col <= 8;
            seats.push({
                seat_code: seatCode,
                type: isVip ? 'VIP' : 'NORMAL',
                price: isVip ? vipPrice : normalPrice,
                status: 'Trống'
            });
        }
    }
    return seats;
}

const ROOMS = [
    {
        room_name: 'Phòng 1',
        screen_type: 'Standard',
        status: 'Active',
        seats: generateSeats(100000, 150000)
    },
    {
        room_name: 'Phòng 2',
        screen_type: '4DX',
        status: 'Active',
        seats: generateSeats(120000, 180000)
    },
    {
        room_name: 'Phòng 3',
        screen_type: 'IMAX',
        status: 'Active',
        seats: generateSeats(150000, 200000)
    }
];

async function insertRooms(db) {
    await db.collection('Rooms').deleteMany({});
    const result = await db.collection('Rooms').insertMany(ROOMS);
    console.log(`✓ Thêm ${result.insertedCount} phòng chiếu (mỗi phòng 50 ghế: A1-E10, VIP C4-D8)`);
    return result.insertedIds;
}

export { ROOMS, generateSeats, insertRooms };
