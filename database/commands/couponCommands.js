import { ObjectId } from 'mongodb';
import { httpError } from '../validators/index.js';

async function createCoupon(db, data) {
    const result = await db.collection('Coupons').insertOne({
        code:            data.code,
        discount_type:   data.discount_type,
        discount_value:  Number(data.discount_value),
        min_order_value: Number(data.min_order_value) || 0,
        max_uses:        Number(data.max_uses),
        used_count:      0,
        start_date:      new Date(data.start_date),
        end_date:        new Date(data.end_date),
        status:          data.status || 'ACTIVE',
        description:     data.description || '',
        created_at:      new Date()
    });
    return result.insertedId;
}

async function createCouponChecked(db, data) {
    const existing = await db.collection('Coupons').findOne({ code: data.code });
    if (existing) throw httpError('Mã coupon đã tồn tại.', 409);
    return createCoupon(db, data);
}

async function updateCoupon(db, id, data) {
    const result = await db.collection('Coupons').updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...data, updated_at: new Date() } }
    );
    return result.modifiedCount;
}

async function updateCouponStatus(db, id, status) {
    const result = await db.collection('Coupons').updateOne(
        { _id: new ObjectId(id) },
        { $set: { status } }
    );
    return result.modifiedCount;
}

async function deleteCoupon(db, id) {
    const result = await db.collection('Coupons').deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount;
}

export { createCoupon, createCouponChecked, updateCoupon, updateCouponStatus, deleteCoupon };
