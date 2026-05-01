const COUPONS = [
    {
        code: 'WELCOME10',
        discount_type: 'PERCENT',
        discount_value: 10,
        min_order_value: 100000,
        max_uses: 100,
        used_count: 0,
        status: 'ACTIVE',
        start_date: new Date('2026-01-01'),
        end_date: new Date('2026-12-31'),
        description: 'Giảm 10% cho đơn hàng từ 100.000đ'
    },
    {
        code: 'SUMMER50K',
        discount_type: 'FIXED',
        discount_value: 50000,
        min_order_value: 200000,
        max_uses: 50,
        used_count: 0,
        status: 'ACTIVE',
        start_date: new Date('2026-05-01'),
        end_date: new Date('2026-08-31'),
        description: 'Giảm 50.000đ cho đơn hàng từ 200.000đ'
    },
    {
        code: 'VIP20',
        discount_type: 'PERCENT',
        discount_value: 20,
        min_order_value: 300000,
        max_uses: 30,
        used_count: 0,
        status: 'ACTIVE',
        start_date: new Date('2026-01-01'),
        end_date: new Date('2026-12-31'),
        description: 'Giảm 20% cho đơn hàng từ 300.000đ - Dành cho VIP'
    },
    {
        code: 'EXPIRED',
        discount_type: 'FIXED',
        discount_value: 30000,
        min_order_value: 100000,
        max_uses: 10,
        used_count: 10,
        status: 'INACTIVE',
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-12-31'),
        description: 'Mã đã hết hạn (dữ liệu test)'
    }
];

async function insertCoupons(db) {
    await db.collection('Coupons').deleteMany({});
    const result = await db.collection('Coupons').insertMany(COUPONS);
    console.log(`✓ Thêm ${result.insertedCount} mã giảm giá`);
    return result.insertedIds;
}

export { COUPONS, insertCoupons };
