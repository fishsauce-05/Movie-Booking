import express from 'express';
import { ObjectId } from 'mongodb';
import { createMovie, getAllMovies, updateMovie, deleteMovie } from '../../database/crud/movieCRUD.js';
import { getAllRooms } from '../../database/crud/roomCRUD.js';
import { createShowtime, updateShowtimeFields, deleteShowtime } from '../../database/crud/showtimeCRUD.js';
import { updateUser } from '../../database/crud/userCRUD.js';
import { createCouponChecked, updateCouponStatus } from '../../database/crud/couponCRUD.js';
import { getAdminShowtimes, searchUsers, getRevenueByMovieFiltered, getAdminCoupons } from '../../database/queries/adminQueries.js';
import { getMonthlyRevenue } from '../../database/queries/revenueQueries.js';
import createAuthMiddleware from '../middleware/auth.js';

export default function createAdminRoutes(db) {
    const router = express.Router();
    const { loadCurrentUser, requireRole } = createAuthMiddleware(db);

    router.use(loadCurrentUser());

    // ── MOVIES ──────────────────────────────────────────────────────────────

    router.get('/movies', requireRole('MANAGER', 'STAFF'), async (req, res, next) => {
        try {
            const movies = await getAllMovies(db);
            res.json(movies);
        } catch (error) { next(error); }
    });

    router.post('/movies', requireRole('MANAGER'), async (req, res, next) => {
        try {
            const { title } = req.body;
            if (!title) return res.status(400).json({ message: 'Tên phim là bắt buộc.' });

            const movieId = await createMovie(db, req.body);
            res.status(201).json({ message: 'Thêm phim thành công.', movieId });
        } catch (error) { next(error); }
    });

    router.put('/movies/:id', requireRole('MANAGER'), async (req, res, next) => {
        try {
            if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'ID không hợp lệ.' });

            const fields = ['title', 'genre', 'duration', 'release_date', 'status', 'poster_url', 'description'];
            const update = {};
            fields.forEach((f) => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
            if (update.genre && !Array.isArray(update.genre)) update.genre = [update.genre];
            if (update.duration)     update.duration     = Number(update.duration);
            if (update.release_date) update.release_date = new Date(update.release_date);

            const matched = await updateMovie(db, req.params.id, update);
            if (!matched) return res.status(404).json({ message: 'Không tìm thấy phim.' });
            res.json({ message: 'Cập nhật phim thành công.' });
        } catch (error) { next(error); }
    });

    router.delete('/movies/:id', requireRole('MANAGER'), async (req, res, next) => {
        try {
            if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'ID không hợp lệ.' });

            const deleted = await deleteMovie(db, req.params.id);
            if (!deleted) return res.status(404).json({ message: 'Không tìm thấy phim.' });
            res.json({ message: 'Xoá phim thành công.' });
        } catch (error) { next(error); }
    });

    // ── SHOWTIMES ────────────────────────────────────────────────────────────

    router.get('/showtimes', requireRole('MANAGER', 'STAFF'), async (req, res, next) => {
        try {
            const showtimes = await getAdminShowtimes(db);
            res.json(showtimes);
        } catch (error) { next(error); }
    });

    router.post('/showtimes', requireRole('MANAGER'), async (req, res, next) => {
        try {
            const result = await createShowtime(db, req.body);
            res.status(201).json(result);
        } catch (error) { next(error); }
    });

    router.patch('/showtimes/:id', requireRole('MANAGER', 'STAFF'), async (req, res, next) => {
        try {
            if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'ID không hợp lệ.' });

            const update = {};
            if (req.body.room_name  !== undefined) update.room_name  = req.body.room_name;
            if (req.body.start_time !== undefined) update.start_time = new Date(req.body.start_time);
            if (req.body.end_time   !== undefined) update.end_time   = new Date(req.body.end_time);

            if (Array.isArray(req.body.seats)) {
                const VALID_STATUS = ['Trống', 'Đã được đặt', 'Đang giữ chờ thanh toán'];
                update.seats = req.body.seats.map((seat) => ({
                    seat_code: String(seat.seat_code),
                    type:      seat.type === 'VIP' ? 'VIP' : 'NORMAL',
                    price:     Number(seat.price) || 0,
                    status:    VALID_STATUS.includes(seat.status) ? seat.status : 'Trống'
                }));
            }

            const matched = await updateShowtimeFields(db, req.params.id, update);
            if (!matched) return res.status(404).json({ message: 'Không tìm thấy suất chiếu.' });
            res.json({ message: 'Cập nhật suất chiếu thành công.' });
        } catch (error) { next(error); }
    });

    router.delete('/showtimes/:id', requireRole('MANAGER'), async (req, res, next) => {
        try {
            if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'ID không hợp lệ.' });

            const deleted = await deleteShowtime(db, req.params.id);
            if (!deleted) return res.status(404).json({ message: 'Không tìm thấy suất chiếu.' });
            res.json({ message: 'Xoá suất chiếu thành công.' });
        } catch (error) { next(error); }
    });

    // ── USERS ────────────────────────────────────────────────────────────────

    router.get('/users', requireRole('MANAGER'), async (req, res, next) => {
        try {
            const users = await searchUsers(db, req.query.role, req.query.q);
            res.json(users);
        } catch (error) { next(error); }
    });

    router.patch('/users/:id', requireRole('MANAGER'), async (req, res, next) => {
        try {
            if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'ID không hợp lệ.' });

            const allowed = ['role', 'full_name', 'phone'];
            const update  = {};
            allowed.forEach((f) => { if (req.body[f] !== undefined) update[f] = req.body[f]; });

            await updateUser(db, req.params.id, update);
            res.json({ message: 'Cập nhật người dùng thành công.' });
        } catch (error) { next(error); }
    });

    // ── REVENUE ──────────────────────────────────────────────────────────────

    router.get('/revenue/monthly', requireRole('MANAGER'), async (req, res, next) => {
        try {
            const year    = Number(req.query.year) || new Date().getFullYear();
            const revenue = await getMonthlyRevenue(db, year);
            res.json({ year, revenue });
        } catch (error) { next(error); }
    });

    router.get('/revenue/movies', requireRole('MANAGER'), async (req, res, next) => {
        try {
            const result = await getRevenueByMovieFiltered(db, req.query.from, req.query.to);
            res.json(result);
        } catch (error) { next(error); }
    });

    // ── COUPONS ──────────────────────────────────────────────────────────────

    router.get('/coupons', requireRole('MANAGER'), async (req, res, next) => {
        try {
            const coupons = await getAdminCoupons(db);
            res.json(coupons);
        } catch (error) { next(error); }
    });

    router.post('/coupons', requireRole('MANAGER'), async (req, res, next) => {
        try {
            const { code, discount_type, discount_value, max_uses, start_date, end_date } = req.body;
            if (!code || !discount_type || !discount_value || !max_uses || !start_date || !end_date) {
                return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin coupon.' });
            }

            const couponId = await createCouponChecked(db, req.body);
            res.status(201).json({ message: 'Tạo mã giảm giá thành công.', couponId });
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            next(error);
        }
    });

    router.patch('/coupons/:id', requireRole('MANAGER'), async (req, res, next) => {
        try {
            if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'ID không hợp lệ.' });

            await updateCouponStatus(db, req.params.id, req.body.status);
            res.json({ message: 'Cập nhật coupon thành công.' });
        } catch (error) { next(error); }
    });

    // ── ROOMS (read-only for dropdown) ───────────────────────────────────────

    router.get('/rooms', requireRole('MANAGER', 'STAFF'), async (req, res, next) => {
        try {
            const rooms = (await getAllRooms(db)).filter((r) => r.status === 'Active').map((r) => ({
                _id:         r._id,
                room_name:   r.room_name,
                screen_type: r.screen_type
            }));
            res.json(rooms);
        } catch (error) { next(error); }
    });

    return router;
}
