import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../connection/db.js';
import { insertMovies } from './movies.js';
import { insertRooms } from './rooms.js';
import { insertUsers } from './users.js';
import { insertCoupons, clearCouponUsages } from './coupons.js';
import { insertShowtimes } from './showtimes.js';
import { clearBookings, insertBookings } from './bookings.js';
import { createIndexes } from '../indexes/createIndexes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../.env') });

async function seedAll() {
    const { client, db } = await getDb();

    try {
        console.log('✓ Kết nối MongoDB thành công\n');

        await clearBookings(db);
        await clearCouponUsages(db);
        const movieIds   = await insertMovies(db);
        const roomIds    = await insertRooms(db);
        await insertUsers(db);
        await insertCoupons(db);
        const showtimeIds = await insertShowtimes(db, movieIds);
        await insertBookings(db, { showtimeIds });
        await createIndexes(db);

        console.log('\n✓ Seed toàn bộ dữ liệu thành công!');
    } catch (err) {
        console.error('❌ Lỗi seed:', err.message);
        process.exit(1);
    } finally {
        await client.close();
    }
}

seedAll();
