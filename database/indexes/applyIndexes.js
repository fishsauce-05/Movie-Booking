import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../connection/db.js';
import { createIndexes } from './createIndexes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../.env') });

async function main() {
    const { client, db } = await getDb();
    try {
        console.log(`✓ Kết nối thành công: ${db.databaseName}\n`);
        await createIndexes(db);
    } catch (err) {
        console.error('❌ Lỗi:', err.message);
        process.exit(1);
    } finally {
        await client.close();
    }
}

main();
