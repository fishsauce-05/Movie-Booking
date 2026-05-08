import { ObjectId } from 'mongodb';

async function getUserProfile(db, id) {
    const [user] = await db.collection('Users').aggregate([
        { $match: { _id: new ObjectId(id) } },
        {
            $lookup: {
                from:         'Bookings',
                localField:   '_id',
                foreignField: 'customer_id',
                pipeline:     [{ $match: { status: 'Hoàn tất' } }, { $count: 'n' }],
                as:           'bookingStat'
            }
        },
        {
            $addFields: {
                total_bookings: { $ifNull: [{ $first: '$bookingStat.n' }, 0] }
            }
        },
        { $project: { password: 0, bookingStat: 0 } }
    ]).toArray();

    return user || null;
}

async function getAllUsers(db) {
    return db.collection('Users').find({}, { projection: { password: 0 } }).toArray();
}

async function getUserById(db, id) {
    return db.collection('Users').findOne(
        { _id: new ObjectId(id) },
        { projection: { password: 0 } }
    );
}

async function getUserByEmail(db, email) {
    return db.collection('Users').findOne({ email });
}

export { getUserProfile, getAllUsers, getUserById, getUserByEmail };
