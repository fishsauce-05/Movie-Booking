async function clearBookings(db) {
    const result = await db.collection('Bookings').deleteMany({});
    console.log(`✓ Đã xóa ${result.deletedCount} booking cũ`);
}

async function insertBookings(db, { showtimeIds, customerIds }) {
    // showtimeIds, customerIds: object/array chứa ObjectId từ kết quả insertShowtimes / insertUsers
}

export { clearBookings, insertBookings };
