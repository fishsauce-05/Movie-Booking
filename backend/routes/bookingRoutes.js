import express from 'express';
import { cancelBooking, createBookingForCustomer } from '../../database/transactions/bookingTransaction.js';
import { getBookingsByCustomerWithDetails, getStaffBookingById } from '../../database/queries/bookingQueries.js';
import createAuthMiddleware from '../middleware/auth.js';

export default function createBookingRoutes(db) {
    const router = express.Router();
    const { loadCurrentUser, requireRole, requireSelfOrRole } = createAuthMiddleware(db);

    router.post('/', loadCurrentUser({ bodyFields: ['customerId'] }), requireRole('CUSTOMER'), async (req, res, next) => {
        try {
            const result = await createBookingForCustomer(db, req.currentUser, req.body);
            res.status(201).json(result);
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            next(error);
        }
    });

    router.get('/customer/:customerId', loadCurrentUser(), requireSelfOrRole({ targetParamFields: ['customerId'], allowedRoles: ['ADMIN'] }), async (req, res, next) => {
        try {
            const bookings = await getBookingsByCustomerWithDetails(db, req.params.customerId);
            res.json(bookings);
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            next(error);
        }
    });

    router.patch('/:bookingId/cancel', loadCurrentUser(), requireRole('CUSTOMER'), async (req, res, next) => {
        try {
            const result = await cancelBooking(db, req.currentUser, req.params.bookingId);
            res.json(result);
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            next(error);
        }
    });

    router.get('/staff/:bookingId', loadCurrentUser(), requireRole('STAFF', 'ADMIN'), async (req, res, next) => {
        try {
            const booking = await getStaffBookingById(db, req.params.bookingId);
            res.json(booking);
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            next(error);
        }
    });

    return router;
}
