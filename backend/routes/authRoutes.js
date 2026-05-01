import express from 'express';
import { ObjectId } from 'mongodb';
import { registerUser, loginUser, getUserProfile, updateUser, changePassword } from '../../database/crud/userCRUD.js';
import createAuthMiddleware from '../middleware/auth.js';

export default function createAuthRoutes(db) {
    const router = express.Router();
    const { loadCurrentUser, requireSelfOrRole } = createAuthMiddleware(db);

    router.post('/register', async (req, res, next) => {
        try {
            const { full_name, email, phone, password } = req.body;
            if (!full_name || !email || !phone || !password) {
                return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin.' });
            }

            const userId = await registerUser(db, { full_name, email, phone, password });
            res.status(201).json({ message: 'Đăng ký thành công.', userId });
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            next(error);
        }
    });

    router.post('/login', async (req, res, next) => {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu.' });
            }

            const user = await loginUser(db, email, password);
            res.json(user);
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            next(error);
        }
    });

    router.get('/:id', loadCurrentUser(), requireSelfOrRole({ targetParamFields: ['id'], allowedRoles: ['MANAGER'] }), async (req, res, next) => {
        try {
            if (!ObjectId.isValid(req.params.id)) {
                return res.status(400).json({ message: 'ID không hợp lệ.' });
            }

            const user = await getUserProfile(db, req.params.id);
            if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

            res.json(user);
        } catch (error) {
            next(error);
        }
    });

    router.patch('/:id', loadCurrentUser(), requireSelfOrRole({ targetParamFields: ['id'], allowedRoles: ['MANAGER'] }), async (req, res, next) => {
        try {
            if (!ObjectId.isValid(req.params.id)) {
                return res.status(400).json({ message: 'ID không hợp lệ.' });
            }

            const allowed = ['full_name', 'phone'];
            const update  = {};
            allowed.forEach((f) => { if (req.body[f] !== undefined) update[f] = req.body[f]; });

            await updateUser(db, req.params.id, update);
            res.json({ message: 'Cập nhật thành công.' });
        } catch (error) {
            next(error);
        }
    });

    router.patch('/:id/password', loadCurrentUser(), requireSelfOrRole({ targetParamFields: ['id'], allowedRoles: ['MANAGER'] }), async (req, res, next) => {
        try {
            if (!ObjectId.isValid(req.params.id)) {
                return res.status(400).json({ message: 'ID không hợp lệ.' });
            }

            const { currentPassword, newPassword } = req.body;
            await changePassword(db, req.params.id, currentPassword, newPassword);
            res.json({ message: 'Đổi mật khẩu thành công.' });
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            next(error);
        }
    });

    return router;
}
