import { ObjectId } from 'mongodb';
import { httpError } from '../validators/index.js';

function isVipSeatCode(seatCode) {
    const row    = String(seatCode || '').charAt(0).toUpperCase();
    const column = Number(String(seatCode || '').slice(1));
    return (row === 'C' || row === 'D') && column >= 4 && column <= 8;
}

async function createShowtime(db, data) {
    const { movieId, roomName, startTime } = data;

    if (!ObjectId.isValid(movieId)) throw new Error('ID phim không hợp lệ.');

    const room = await db.collection('Rooms').findOne({ room_name: roomName });
    if (!room) throw new Error('Phòng chiếu không tồn tại.');
    const movie = await db.collection('Movies').findOne({ _id: new ObjectId(movieId) });
    if (!movie) throw new Error('Phim không tồn tại.');

    const seats = (room.seats || []).map((seat) => ({
        seat_code: seat.seat_code,
        type:      isVipSeatCode(seat.seat_code) ? 'VIP' : seat.type,
        price:     seat.price,
        status:    'Trống'
    }));

    const endTime = new Date(new Date(startTime).getTime() + movie.duration * 60 * 1000);
    const result  = await db.collection('Showtimes').insertOne({
        movie_id:   new ObjectId(movieId),
        room_name:  roomName,
        start_time: new Date(startTime),
        end_time:   new Date(endTime),
        seats
    });

    return { message: 'Thêm suất chiếu mới thành công', showtimeId: result.insertedId };
}

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

async function updateShowtimeInfo(db, showtimeId, update) {
    if (!ObjectId.isValid(showtimeId)) throw httpError('ID suất chiếu không hợp lệ.', 400);

    const showtime = await db.collection('Showtimes').findOne({ _id: new ObjectId(showtimeId) });
    if (!showtime) throw httpError('Không tìm thấy suất chiếu.', 404);

    const finalUpdate = {};

    if (update.room_name  !== undefined) finalUpdate.room_name  = update.room_name;
    if (update.start_time !== undefined) finalUpdate.start_time = new Date(update.start_time);
    if (update.end_time   !== undefined) finalUpdate.end_time   = new Date(update.end_time);

    if (Array.isArray(update.seats)) {
        const VALID_STATUS = ['Trống', 'Đã được đặt', 'Đang giữ chờ thanh toán'];
        finalUpdate.seats = update.seats.map((seat) => ({
            seat_code: String(seat.seat_code),
            type:      seat.type === 'VIP' ? 'VIP' : 'NORMAL',
            price:     Number(seat.price) || 0,
            status:    VALID_STATUS.includes(seat.status) ? seat.status : 'Trống'
        }));
    }

    return updateShowtimeFields(db, showtimeId, finalUpdate);
}

export { createShowtime, updateShowtimeFields, updateShowtime, deleteShowtime, updateShowtimeInfo };
