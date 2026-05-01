import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../connection/db.js';
import { insertMovies } from './movies.js';
import { insertRooms } from './rooms.js';
import { insertUsers } from './users.js';
import { insertCoupons } from './coupons.js';
import { insertShowtimes } from './showtimes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../.env') });

async function seedAll() {
    const { client, db } = await getDb();

    try {
        console.log('✓ Kết nối MongoDB thành công\n');

        const movieIds   = await insertMovies(db);
        const roomIds    = await insertRooms(db);
        await insertUsers(db);
        await insertCoupons(db);
        await insertShowtimes(db, movieIds);

        console.log('\n✓ Seed toàn bộ dữ liệu thành công!');
    } catch (err) {
        console.error('❌ Lỗi seed:', err.message);
        process.exit(1);
    } finally {
        await client.close();
    }
}

seedAll();
