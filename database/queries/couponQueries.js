import { ObjectId } from 'mongodb';

async function getAllCoupons(db) {
    return db.collection('Coupons').find({}).toArray();
}

async function getCouponById(db, id) {
    return db.collection('Coupons').findOne({ _id: new ObjectId(id) });
}

async function getCouponByCode(db, code) {
    return db.collection('Coupons').findOne({ code });
}

export { getAllCoupons, getCouponById, getCouponByCode };
