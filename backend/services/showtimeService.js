import { ObjectId } from 'mongodb';

function isVipSeatCode(seatCode) {
    const row = String(seatCode || '').charAt(0).toUpperCase();
    const column = Number(String(seatCode || '').slice(1));
    return ['C', 'D', 'E'].includes(row) && column >= 3 && column <= 8;
}

export async function createNewShowtime(db, showtimeData) {
    const showtimesCollection = db.collection('Showtimes');
    const roomsCollection = db.collection('Rooms');

    const { movieId, roomName, startTime, endTime } = showtimeData;

    if (!ObjectId.isValid(movieId)) {
        throw new Error('ID phim không hợp lệ.');
    }

    const room = await roomsCollection.findOne({ room_name: roomName });
    if (!room) {
        throw new Error('Phòng chiếu không tồn tại.');
    }

    const initialSeats = Array.isArray(room.seats)
        ? room.seats.map((seat) => ({
            seat_code: seat.seat_code,
            type: isVipSeatCode(seat.seat_code) ? 'VIP' : seat.type,
            price: seat.price,
            status: 'Trống'
        }))
        : [];

    const result = await showtimesCollection.insertOne({
        movie_id: new ObjectId(movieId),
        room_name: roomName,
        start_time: new Date(startTime),
        end_time: new Date(endTime),
        seats: initialSeats
    });

    return { message: 'Thêm suất chiếu mới thành công', showtimeId: result.insertedId };
}
