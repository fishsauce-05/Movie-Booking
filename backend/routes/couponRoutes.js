import express from 'express';
import { validateCoupon } from '../../database/procedures/couponValidation.js';

export default function createCouponRoutes(db) {
    const router = express.Router();

    router.post('/validate', async (req, res, next) => {
        try {
            const { code, totalPrice } = req.body;
            if (!code || !totalPrice) {
                return res.status(400).json({ message: 'Thiếu mã coupon hoặc giá trị đơn hàng.' });
            }

            const result = await validateCoupon(db, code, Number(totalPrice));

            if (!result) {
                return res.status(404).json({ message: 'Mã giảm giá không hợp lệ hoặc đã hết hạn.' });
            }
            if (!result.isEligible) {
                return res.status(400).json({
                    message: `Đơn hàng cần tối thiểu ${result.min_order_value.toLocaleString('vi-VN')} VNĐ để dùng mã này.`,
                    coupon: result
                });
            }

            res.json(result);
        } catch (error) {
            next(error);
        }
    });

    return router;
}
