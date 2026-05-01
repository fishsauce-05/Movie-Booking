import { ObjectId } from 'mongodb';

async function createReview(db, data) {
    const result = await db.collection('Reviews').insertOne({
        movie_id:      new ObjectId(data.movie_id),
        customer_id:   new ObjectId(data.customer_id),
        customer_name: data.customer_name,
        rating:        data.rating,     // 1-5
        comment:       data.comment,
        created_at:    new Date()
    });
    return result.insertedId;
}

async function getAllReviews(db) {
    return db.collection('Reviews').find({}).toArray();
}

async function getReviewById(db, id) {
    return db.collection('Reviews').findOne({ _id: new ObjectId(id) });
}

async function getReviewsByMovie(db, movieId) {
    return db.collection('Reviews')
        .find({ movie_id: new ObjectId(movieId) })
        .sort({ created_at: -1 })
        .toArray();
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

export { createReview, getAllReviews, getReviewById, getReviewsByMovie, updateReview, deleteReview };
