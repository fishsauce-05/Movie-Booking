import { ObjectId } from 'mongodb';

function isVipSeatCode(seatCode) {
    const row    = String(seatCode || '').charAt(0).toUpperCase();
    const column = Number(String(seatCode || '').slice(1));
    return ['C', 'D', 'E'].includes(row) && column >= 3 && column <= 8;
}

// Tạo suất chiếu mới — tự động copy ghế từ phòng và gán loại VIP/NORMAL
async function createShowtime(db, data) {
    const { movieId, roomName, startTime, endTime } = data;

    if (!ObjectId.isValid(movieId)) throw new Error('ID phim không hợp lệ.');

    const room = await db.collection('Rooms').findOne({ room_name: roomName });
    if (!room) throw new Error('Phòng chiếu không tồn tại.');

    const seats = (room.seats || []).map((seat) => ({
        seat_code: seat.seat_code,
        type:      isVipSeatCode(seat.seat_code) ? 'VIP' : seat.type,
        price:     seat.price,
        status:    'Trống'
    }));

    const result = await db.collection('Showtimes').insertOne({
        movie_id:   new ObjectId(movieId),
        room_name:  roomName,
        start_time: new Date(startTime),
        end_time:   new Date(endTime),
        seats
    });

    return { message: 'Thêm suất chiếu mới thành công', showtimeId: result.insertedId };
}

async function getAllShowtimes(db) {
    return db.collection('Showtimes').find({}).toArray();
}

async function getShowtimeById(db, id) {
    return db.collection('Showtimes').findOne({ _id: new ObjectId(id) });
}

// Cập nhật fields của suất chiếu (admin) — nhận update object đã được chuẩn bị sẵn
async function updateShowtimeFields(db, id, update) {
    const result = await db.collection('Showtimes').updateOne(
        { _id: new ObjectId(id) },
        { $set: update }
    );
    return result.matchedCount;
}

async function updateShowtime(db, id, data) {
    const result = await db.collection('Showtimes').updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...data, updated_at: new Date() } }
    );
    return result.modifiedCount;
}

async function deleteShowtime(db, id) {
    const result = await db.collection('Showtimes').deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount;
}

export { createShowtime, getAllShowtimes, getShowtimeById, updateShowtimeFields, updateShowtime, deleteShowtime };
