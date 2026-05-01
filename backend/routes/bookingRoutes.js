import express from 'express';
import { ObjectId } from 'mongodb';
import { validateBookingInput, handleTicketBooking } from '../../database/transactions/bookingTransaction.js';
import { getBookingsByCustomerWithDetails } from '../../database/queries/bookingQueries.js';
import createAuthMiddleware from '../middleware/auth.js';

export default function createBookingRoutes(db) {
    const router = express.Router();
    const { loadCurrentUser, requireRole, requireSelfOrRole } = createAuthMiddleware(db);

    router.post('/', loadCurrentUser({ bodyFields: ['customerId'] }), requireRole('CUSTOMER'), async (req, res, next) => {
        try {
            const { customerId, showtimeId, seatsToBook, couponCode } = req.body;

            if (String(req.currentUser._id) !== String(customerId)) {
                return res.status(403).json({ message: 'Bạn chỉ có thể đặt vé cho tài khoản của chính mình.' });
            }

            validateBookingInput(customerId, showtimeId, seatsToBook);
            const result = await handleTicketBooking(db, customerId, showtimeId, seatsToBook, couponCode || null);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    });

    router.get('/customer/:customerId', loadCurrentUser(), requireSelfOrRole({ targetParamFields: ['customerId'], allowedRoles: ['MANAGER'] }), async (req, res, next) => {
        try {
            if (!ObjectId.isValid(req.params.customerId)) {
                return res.status(400).json({ message: 'ID khách hàng không hợp lệ.' });
            }

            const bookings = await getBookingsByCustomerWithDetails(db, req.params.customerId);
            res.json(bookings);
        } catch (error) {
            next(error);
        }
    });

    return router;
}
