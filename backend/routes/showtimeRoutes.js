import express from 'express';
import { ObjectId } from 'mongodb';
import { getUpcomingShowtimesByMovie, getAvailableSeats, getShowtimeWithMovieInfo } from '../../database/queries/showtimeQueries.js';

export default function createShowtimeRoutes(db) {
    const router = express.Router();

    router.get('/movie/:movieId', async (req, res, next) => {
        try {
            if (!ObjectId.isValid(req.params.movieId)) {
                return res.status(400).json({ message: 'ID phim không hợp lệ.' });
            }

            const showtimes = await getUpcomingShowtimesByMovie(db, req.params.movieId);
            res.json(showtimes);
        } catch (error) {
            next(error);
        }
    });

    router.get('/:id/seats', async (req, res, next) => {
        try {
            if (!ObjectId.isValid(req.params.id)) {
                return res.status(400).json({ message: 'ID suất chiếu không hợp lệ.' });
            }

            const showtime = await getAvailableSeats(db, req.params.id);
            if (!showtime) return res.status(404).json({ message: 'Không tìm thấy suất chiếu.' });

            res.json(showtime);
        } catch (error) {
            next(error);
        }
    });

    router.get('/:id', async (req, res, next) => {
        try {
            if (!ObjectId.isValid(req.params.id)) {
                return res.status(400).json({ message: 'ID suất chiếu không hợp lệ.' });
            }

            const showtime = await getShowtimeWithMovieInfo(db, req.params.id);
            if (!showtime) return res.status(404).json({ message: 'Không tìm thấy suất chiếu.' });

            res.json(showtime);
        } catch (error) {
            next(error);
        }
    });

    return router;
}
