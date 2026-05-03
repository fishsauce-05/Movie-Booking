async function createIndexes(db) {
    console.log('Đang tạo chỉ mục...');

    // Users
    await db.collection('Users').createIndex({ email: 1 }, { unique: true, name: 'users_email_unique' });
    await db.collection('Users').createIndex({ phone: 1 }, { unique: true, name: 'users_phone_unique' });
    await db.collection('Users').createIndex({ role: 1 }, { name: 'users_role' });

    // Movies - text index bắt buộc cho searchMoviesOptimized()
    await db.collection('Movies').createIndex(
        { title: 'text', description: 'text' },
        { name: 'movies_text_search', weights: { title: 3, description: 1 } }
    );
    await db.collection('Movies').createIndex({ status: 1, release_date: -1 }, { name: 'movies_status_date' });
    await db.collection('Movies').createIndex({ genre: 1 }, { name: 'movies_genre' });

    // Rooms
    await db.collection('Rooms').createIndex({ room_name: 1 }, { unique: true, name: 'rooms_name_unique' });

    // Showtimes
    await db.collection('Showtimes').createIndex({ movie_id: 1, start_time: 1 }, { name: 'showtimes_movie_time' });
    await db.collection('Showtimes').createIndex({ start_time: 1 }, { name: 'showtimes_start_time' });
    await db.collection('Showtimes').createIndex({ room_name: 1, start_time: 1 }, { name: 'showtimes_room_time' });

    // Bookings
    await db.collection('Bookings').createIndex({ customer_id: 1, created_at: -1 }, { name: 'bookings_customer_date' });
    await db.collection('Bookings').createIndex({ showtime_id: 1 }, { name: 'bookings_showtime' });
    await db.collection('Bookings').createIndex({ status: 1, created_at: -1 }, { name: 'bookings_status_date' });

    // Reviews
    await db.collection('Reviews').createIndex({ movie_id: 1, created_at: -1 }, { name: 'reviews_movie_date' });
    await db.collection('Reviews').createIndex({ customer_id: 1 }, { name: 'reviews_customer' });

    // Coupons
    await db.collection('Coupons').createIndex({ code: 1 }, { unique: true, name: 'coupons_code_unique' });
    await db.collection('Coupons').createIndex({ status: 1, end_date: 1 }, { name: 'coupons_status_expiry' });

    console.log('✓ Tạo chỉ mục thành công');
}

export { createIndexes };
