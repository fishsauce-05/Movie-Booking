import { ObjectId } from 'mongodb';
import { httpError, validateEmail, validatePhone, validatePassword } from '../validators/index.js';

async function registerUser(db, { full_name, email, phone, password }) {
    validateEmail(email);
    validatePhone(phone);
    validatePassword(password);
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

async function changePassword(db, id, currentPassword, newPassword) {
    validatePassword(newPassword);
    const user = await db.collection('Users').findOne({ _id: new ObjectId(id) });
    if (!user) throw httpError('Không tìm thấy người dùng.', 404);
    if (user.password !== currentPassword) throw httpError('Mật khẩu hiện tại không đúng.', 401);
    await db.collection('Users').updateOne(
        { _id: new ObjectId(id) },
        { $set: { password: newPassword } }
    );
}

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

async function updateUserRole(db, currentUser, targetId, role) {
    if (String(currentUser._id) === String(targetId)) {
        throw httpError('Không thể thay đổi vai trò của chính mình.', 403);
    }

    const targetUser = await db.collection('Users').findOne({ _id: new ObjectId(targetId) });
    if (!targetUser) throw httpError('Không tìm thấy người dùng.', 404);
    if (targetUser.role === 'ADMIN') throw httpError('Không thể thay đổi vai trò của admin.', 403);

    return updateUser(db, targetId, { role });
}

export { registerUser, loginUser, changePassword, createUser, updateUser, deleteUser, updateUserRole };
