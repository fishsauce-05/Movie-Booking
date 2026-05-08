import express from 'express';
import { ObjectId } from 'mongodb';
import { countMoviesOptimized, searchMoviesOptimized, getMovieById } from '../../database/queries/movieQueries.js';

export default function createMovieRoutes(db) {
    const router = express.Router();

    router.get('/', async (req, res, next) => {
        try {
            const keyword = req.query.q || req.query.keyword || '';
            const genres  = req.query.genres
                ? String(req.query.genres).split(',').map((g) => g.trim()).filter(Boolean)
                : [];
            const page  = Number(req.query.page)  || 1;
            const limit = Number(req.query.limit) || 9;
            const status = req.query.status || 'Đang chiếu';

            const movies = await searchMoviesOptimized(db, keyword, genres, page, limit, status);
            if (req.query.meta === '1') {
                const total = await countMoviesOptimized(db, keyword, genres, status);
                return res.json({
                    movies,
                    page,
                    limit,
                    total,
                    totalPages: Math.max(Math.ceil(total / limit), 1)
                });
            }
            res.json(movies);
        } catch (error) {
            next(error);
        }
    });

    router.get('/:id', async (req, res, next) => {
        try {
            if (!ObjectId.isValid(req.params.id)) {
                return res.status(400).json({ message: 'ID phim không hợp lệ.' });
            }

            const movie = await getMovieById(db, req.params.id);
            if (!movie) return res.status(404).json({ message: 'Không tìm thấy phim.' });

            res.json(movie);
        } catch (error) {
            next(error);
        }
    });

    return router;
}
