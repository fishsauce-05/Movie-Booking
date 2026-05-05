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

    router.patch('/:bookingId/cancel', loadCurrentUser(), requireRole('CUSTOMER'), async (req, res, next) => {
        try {
            const { bookingId } = req.params;

            if (!ObjectId.isValid(bookingId)) {
                return res.status(400).json({ message: 'ID đặt vé không hợp lệ.' });
            }

            const booking = await db.collection('Bookings').findOne({ _id: new ObjectId(bookingId) });
            if (!booking) {
                return res.status(404).json({ message: 'Không tìm thấy đặt vé.' });
            }

            if (String(booking.customer_id) !== String(req.currentUser._id)) {
                return res.status(403).json({ message: 'Bạn không có quyền hủy vé này.' });
            }

            if (booking.status !== 'Hoàn tất') {
                return res.status(400).json({ message: 'Chỉ có thể hủy vé có trạng thái "Hoàn tất".' });
            }

            await db.collection('Bookings').updateOne(
                { _id: new ObjectId(bookingId) },
                { $set: { status: 'Đã hủy', updated_at: new Date() } }
            );

            await db.collection('Showtimes').updateOne(
                { _id: booking.showtime_id },
                { $set: { 'seats.$[elem].status': 'Trống' } },
                { arrayFilters: [{ 'elem.seat_code': { $in: booking.booked_seats } }] }
            );

            res.json({ message: 'Hủy vé thành công.' });
        } catch (error) {
            next(error);
        }
    });

    return router;
}
