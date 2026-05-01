import 'dotenv/config';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import cors from 'cors';

import { connectToDatabase, client } from './config/db.js';
import createMovieRoutes from './routes/movieRoutes.js';
import createShowtimeRoutes from './routes/showtimeRoutes.js';
import createBookingRoutes from './routes/bookingRoutes.js';
import createAdminRoutes from './routes/adminRoutes.js';
import createAuthRoutes from './routes/authRoutes.js';
import createReviewRoutes from './routes/reviewRoutes.js';
import createCouponRoutes from './routes/couponRoutes.js';
import { startLoyaltyPointListener } from './services/loyaltyService.js';
import { upsertDefaultUsers } from './services/defaultUsersService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, '..', 'frontend')));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

async function bootstrap() {
    const db = await connectToDatabase();

    await upsertDefaultUsers(db);

    app.use('/api/movies', createMovieRoutes(db));
    app.use('/api/showtimes', createShowtimeRoutes(db));
    app.use('/api/bookings', createBookingRoutes(db));
    app.use('/api/admin', createAdminRoutes(db));
    app.use('/api/auth', createAuthRoutes(db));
    app.use('/api/reviews', createReviewRoutes(db));
    app.use('/api/coupons', createCouponRoutes(db));

    startLoyaltyPointListener(db);

    app.use((err, req, res, next) => {
        console.error(err);
        res.status(500).json({ message: err.message || 'Internal Server Error' });
    });

    app.listen(PORT, () => {
        console.log(`Movie booking server running at http://localhost:${PORT}`);
    });
}

bootstrap().catch(async (error) => {
    console.error('Không thể khởi động server:', error);
    try { await client.close(); } catch {}
    process.exit(1);
});
