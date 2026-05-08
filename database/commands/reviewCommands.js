import { ObjectId } from 'mongodb';

async function createReview(db, data) {
    const result = await db.collection('Reviews').insertOne({
        movie_id:      new ObjectId(data.movie_id),
        customer_id:   new ObjectId(data.customer_id),
        customer_name: data.customer_name,
        rating:        data.rating,
        comment:       data.comment,
        created_at:    new Date()
    });
    return result.insertedId;
}

async function updateReview(db, id, data) {
    const result = await db.collection('Reviews').updateOne(
        { _id: new ObjectId(id) },
        { $set: { rating: data.rating, comment: data.comment, updated_at: new Date() } }
    );
    return result.modifiedCount;
}

async function deleteReview(db, id) {
    const result = await db.collection('Reviews').deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount;
}

export { createReview, updateReview, deleteReview };
