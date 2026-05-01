// Aggregation Pipeline — Xác thực và tính toán mã giảm giá
// Tất cả logic tính toán giảm giá chạy hoàn toàn trong MongoDB (server-side)

async function validateCoupon(db, code, totalPrice) {
    const now   = new Date();
    const price = Number(totalPrice);

    const pipeline = [
        // Stage 1: Tìm coupon còn hiệu lực
        {
            $match: {
                code,
                status:     'ACTIVE',
                start_date: { $lte: now },
                end_date:   { $gte: now },
                $expr:      { $lt: ['$used_count', '$max_uses'] }
            }
        },
        // Stage 2: Tính toán giảm giá và tính tiền cuối — tất cả trên MongoDB
        {
            $project: {
                code:            1,
                discount_type:   1,
                discount_value:  1,
                min_order_value: 1,
                // Kiểm tra đơn hàng đủ điều kiện
                isEligible: { $gte: [price, '$min_order_value'] },
                // Tính số tiền giảm
                discountAmount: {
                    $cond: {
                        if:   { $gte: [price, '$min_order_value'] },
                        then: {
                            $cond: {
                                if:   { $eq: ['$discount_type', 'PERCENT'] },
                                then: { $multiply: [price, { $divide: ['$discount_value', 100] }] },
                                else: { $min: ['$discount_value', price] }
                            }
                        },
                        else: 0
                    }
                },
                // Tính giá cuối sau giảm
                finalPrice: {
                    $cond: {
                        if:   { $gte: [price, '$min_order_value'] },
                        then: {
                            $max: [0, {
                                $subtract: [
                                    price,
                                    {
                                        $cond: {
                                            if:   { $eq: ['$discount_type', 'PERCENT'] },
                                            then: { $multiply: [price, { $divide: ['$discount_value', 100] }] },
                                            else: { $min: ['$discount_value', price] }
                                        }
                                    }
                                ]
                            }]
                        },
                        else: price
                    }
                }
            }
        }
    ];

    const result = await db.collection('Coupons').aggregate(pipeline).toArray();
    return result[0] || null;
}

export { validateCoupon };
