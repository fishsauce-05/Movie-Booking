// Dữ liệu mẫu cho Bookings.
// Bookings phụ thuộc vào _id thực của Showtimes và Users sau khi seed,
// nên file này chỉ cung cấp hàm insertBookings — gọi sau khi đã seed showtimes + users.

async function insertBookings(db, { showtimeIds, customerIds }) {
    // showtimeIds, customerIds: object/array chứa ObjectId từ kết quả insertShowtimes / insertUsers
}

export { insertBookings };
