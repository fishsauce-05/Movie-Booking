// Aggregation Pipeline — Kiểm tra ghế trống của một suất chiếu

import { ObjectId } from 'mongodb';

async function getSeatAvailability(db, showtimeId) {
    const pipeline = [
        // Stage 1: Tìm đúng suất chiếu theo ID
        { $match: { _id: new ObjectId(showtimeId) } },

        // Stage 2: Projection — tách ghế trống ra khỏi mảng bằng $filter
        {
            $project: {
                movie_id:   1,
                room_name:  1,
                start_time: 1,
                end_time:   1,
                // Lọc chỉ giữ ghế có status = 'Trống'
                available_seats: {
                    $filter: {
                        input: '$seats',
                        as:    'seat',
                        cond:  { $eq: ['$$seat.status', 'Trống'] }
                    }
                },
                // Lọc ghế đã đặt
                booked_seats: {
                    $filter: {
                        input: '$seats',
                        as:    'seat',
                        cond:  { $ne: ['$$seat.status', 'Trống'] }
                    }
                }
            }
        },

        // Stage 3: Thêm trường đếm tổng ghế trống và ghế đã đặt
        {
            $addFields: {
                available_count: { $size: '$available_seats' },
                booked_count:    { $size: '$booked_seats' }
            }
        }
    ];

    const result = await db.collection('Showtimes').aggregate(pipeline).toArray();
    return result[0] || null;
}

export { getSeatAvailability };
