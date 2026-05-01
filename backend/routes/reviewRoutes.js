import express from 'express';
import { ObjectId } from 'mongodb';
import { getReviewsByMoviePaginated, checkCustomerBookedMovie, checkExistingReview } from '../../database/queries/reviewQueries.js';
import { createReview, getReviewById, deleteReview } from '../../database/crud/reviewCRUD.js';
import createAuthMiddleware from '../middleware/auth.js';

export default function createReviewRoutes(db) {
    const router = express.Router();
    const { loadCurrentUser, requireRole } = createAuthMiddleware(db);

    router.get('/movie/:movieId', async (req, res, next) => {
        try {
            if (!ObjectId.isValid(req.params.movieId)) {
                return res.status(400).json({ message: 'ID phim không hợp lệ.' });
            }

            const page   = Math.max(1, Number(req.query.page) || 1);
            const result = await getReviewsByMoviePaginated(db, req.params.movieId, page);
            res.json(result);
        } catch (error) {
            next(error);
        }
    });

    router.post('/', loadCurrentUser({ bodyFields: ['customerId'] }), requireRole('CUSTOMER'), async (req, res, next) => {
        try {
            const { movieId, customerId, rating, comment } = req.body;

            if (!ObjectId.isValid(movieId) || !ObjectId.isValid(customerId)) {
                return res.status(400).json({ message: 'ID không hợp lệ.' });
            }
            if (String(req.currentUser._id) !== String(customerId)) {
                return res.status(403).json({ message: 'Bạn chỉ có thể tạo đánh giá cho tài khoản của chính mình.' });
            }
            if (!rating || rating < 1 || rating > 5) {
                return res.status(400).json({ message: 'Điểm đánh giá phải từ 1 đến 5.' });
            }

            const hasBooked = await checkCustomerBookedMovie(db, customerId, movieId);
            if (!hasBooked) {
                return res.status(403).json({ message: 'Bạn cần mua vé xem phim này trước khi đánh giá.' });
            }

            const alreadyReviewed = await checkExistingReview(db, movieId, customerId);
            if (alreadyReviewed) {
                return res.status(409).json({ message: 'Bạn đã đánh giá bộ phim này rồi.' });
            }

            const reviewId = await createReview(db, {
                movie_id:    movieId,
                customer_id: customerId,
                rating:      Number(rating),
                comment:     comment || ''
            });
            res.status(201).json({ message: 'Đánh giá thành công.', reviewId });
        } catch (error) {
            next(error);
        }
    });

    router.delete('/:id', loadCurrentUser(), async (req, res, next) => {
        try {
            if (!ObjectId.isValid(req.params.id)) {
                return res.status(400).json({ message: 'ID không hợp lệ.' });
            }

            const review = await getReviewById(db, req.params.id);
            if (!review) return res.status(404).json({ message: 'Không tìm thấy đánh giá.' });

            if (req.currentUser.role !== 'MANAGER' && String(review.customer_id) !== String(req.currentUser._id)) {
                return res.status(403).json({ message: 'Bạn không có quyền xoá đánh giá này.' });
            }

            const deleted = await deleteReview(db, req.params.id);
            if (!deleted) return res.status(404).json({ message: 'Không tìm thấy đánh giá.' });

            res.json({ message: 'Xoá đánh giá thành công.' });
        } catch (error) {
            next(error);
        }
    });

    return router;
}
