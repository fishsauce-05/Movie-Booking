import { ObjectId } from 'mongodb';

function httpError(message, status) {
    const err = new Error(message);
    err.status = status;
    return err;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

async function registerUser(db, { full_name, email, phone, password }) {
    const existing = await db.collection('Users').findOne({ $or: [{ email }, { phone }] });
    if (existing) {
        const msg = existing.email === email ? 'Email đã được sử dụng.' : 'Số điện thoại đã được sử dụng.';
        throw httpError(msg, 409);
    }
    const result = await db.collection('Users').insertOne({
        full_name,
        email,
        phone,
        password,
        role:           'CUSTOMER',
        loyalty_points: 0,
        created_at:     new Date()
    });
    return result.insertedId;
}

async function loginUser(db, email, password) {
    const user = await db.collection('Users').findOne({ email });
    if (!user || user.password !== password) {
        throw httpError('Email hoặc mật khẩu không đúng.', 401);
    }
    const { password: _, ...safeUser } = user;
    return safeUser;
}

// Lấy profile kèm tổng số lần đặt vé hoàn tất ($lookup Bookings)
async function getUserProfile(db, id) {
    const [user] = await db.collection('Users').aggregate([
        { $match: { _id: new ObjectId(id) } },
        {
            $lookup: {
                from:         'Bookings',
                localField:   '_id',
                foreignField: 'customer_id',
                pipeline:     [{ $match: { status: 'Hoàn tất' } }, { $count: 'n' }],
                as:           'bookingStat'
            }
        },
        {
            $addFields: {
                total_bookings: { $ifNull: [{ $first: '$bookingStat.n' }, 0] }
            }
        },
        { $project: { password: 0, bookingStat: 0 } }
    ]).toArray();

    return user || null;
}

async function changePassword(db, id, currentPassword, newPassword) {
    const user = await db.collection('Users').findOne({ _id: new ObjectId(id) });
    if (!user) throw httpError('Không tìm thấy người dùng.', 404);
    if (user.password !== currentPassword) throw httpError('Mật khẩu hiện tại không đúng.', 401);
    await db.collection('Users').updateOne(
        { _id: new ObjectId(id) },
        { $set: { password: newPassword } }
    );
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

async function createUser(db, data) {
    const result = await db.collection('Users').insertOne({
        full_name:      data.full_name,
        email:          data.email,
        phone:          data.phone,
        password:       data.password,
        role:           data.role || 'CUSTOMER',
        loyalty_points: data.loyalty_points || 0,
        created_at:     new Date()
    });
    return result.insertedId;
}

async function getAllUsers(db) {
    return db.collection('Users').find({}, { projection: { password: 0 } }).toArray();
}

async function getUserById(db, id) {
    return db.collection('Users').findOne(
        { _id: new ObjectId(id) },
        { projection: { password: 0 } }
    );
}

async function getUserByEmail(db, email) {
    return db.collection('Users').findOne({ email });
}

async function updateUser(db, id, data) {
    const result = await db.collection('Users').updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...data, updated_at: new Date() } }
    );
    return result.modifiedCount;
}

async function deleteUser(db, id) {
    const result = await db.collection('Users').deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount;
}

export {
    registerUser,
    loginUser,
    getUserProfile,
    changePassword,
    createUser,
    getAllUsers,
    getUserById,
    getUserByEmail,
    updateUser,
    deleteUser
};
