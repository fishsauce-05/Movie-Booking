import 'dotenv/config';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/db_movie_booking';
const DATABASE_NAME = process.env.MONGODB_DB || 'db_movie_booking';

const VALID_ROLES = ['CUSTOMER', 'STAFF', 'MANAGER'];

const DEFAULT_USERS = [
    { email: 'user.customer@gmail.com', password: '12341234', full_name: 'User Customer', phone: '0900000001', role: 'CUSTOMER' },
    { email: 'user.staff@gmail.com',    password: '12341234', full_name: 'User Staff',    phone: '0900000002', role: 'STAFF'    },
    { email: 'user.admin@gmail.com',    password: '12341234', full_name: 'User Admin',    phone: '0900000003', role: 'MANAGER'  },
];

async function syncAuthData() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        const db = client.db(DATABASE_NAME);
        const col = db.collection('Users');

        console.log('=== SYNC AUTH DATA ===\n');

        // ── 1. Đảm bảo tài khoản mặc định tồn tại ────────────────────────────
        console.log('[ 1 ] Kiểm tra tài khoản mặc định...');
        for (const u of DEFAULT_USERS) {
            const result = await col.updateOne(
                { email: u.email },
                {
                    $set: { full_name: u.full_name, phone: u.phone, password: u.password, role: u.role, loyalty_points: 0 },
                    $setOnInsert: { created_at: new Date() }
                },
                { upsert: true }
            );
            const tag = result.upsertedCount ? 'TẠO MỚI' : 'OK';
            console.log(`    [${tag}] ${u.email} (${u.role})`);
        }

        // ── 2. Kiểm tra toàn bộ user – sửa trường thiếu ──────────────────────
        console.log('\n[ 2 ] Kiểm tra & sửa dữ liệu auth...');
        const allUsers = await col.find().toArray();
        let fixed = 0;
        const invalid = [];

        for (const user of allUsers) {
            const patch = {};

            if (!user.email) {
                invalid.push({ id: user._id, reason: 'thiếu email' });
                continue;
            }
            if (!user.password) {
                invalid.push({ id: user._id, email: user.email, reason: 'thiếu password' });
                continue;
            }
            if (!VALID_ROLES.includes(user.role)) {
                patch.role = 'CUSTOMER';
            }
            if (user.loyalty_points == null) {
                patch.loyalty_points = 0;
            }
            if (!user.created_at) {
                patch.created_at = new Date();
            }

            if (Object.keys(patch).length > 0) {
                await col.updateOne({ _id: user._id }, { $set: patch });
                console.log(`    [SỬA] ${user.email} →`, patch);
                fixed++;
            }
        }

        if (fixed === 0) console.log('    Không có gì cần sửa.');

        // ── 3. Báo cáo user không hợp lệ ─────────────────────────────────────
        if (invalid.length > 0) {
            console.log('\n[ ! ] User không hợp lệ (cần xử lý thủ công):');
            for (const u of invalid) {
                console.log(`    - ${u.email || u.id} : ${u.reason}`);
            }
        }

        // ── 4. Thống kê ───────────────────────────────────────────────────────
        console.log('\n[ 3 ] Thống kê:');
        const stats = await col.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]).toArray();

        const total = stats.reduce((s, r) => s + r.count, 0);
        for (const row of stats) {
            console.log(`    ${(row._id || 'KHÔNG CÓ ROLE').padEnd(10)} : ${row.count} tài khoản`);
        }
        console.log(`    ${'TỔNG'.padEnd(10)} : ${total} tài khoản`);

        console.log('\n✓ Sync hoàn tất.');
    } catch (err) {
        console.error('Lỗi:', err.message);
        process.exit(1);
    } finally {
        await client.close();
    }
}

syncAuthData();
