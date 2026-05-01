import { ObjectId } from 'mongodb';

async function createMovie(db, data) {
    const result = await db.collection('Movies').insertOne({
        title:        data.title,
        genre:        Array.isArray(data.genre) ? data.genre : (data.genre ? [data.genre] : []),
        duration:     Number(data.duration) || 0,
        release_date: new Date(data.release_date),
        status:       data.status || 'Sắp chiếu',
        poster_url:   data.poster_url || '',
        description:  data.description || '',
        created_at:   new Date()
    });
    return result.insertedId;
}

async function getAllMovies(db) {
    return db.collection('Movies').find({}).sort({ release_date: -1 }).toArray();
}

async function getMovieById(db, id) {
    return db.collection('Movies').findOne({ _id: new ObjectId(id) });
}

async function updateMovie(db, id, data) {
    const result = await db.collection('Movies').updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...data, updated_at: new Date() } }
    );
    return result.matchedCount;
}

async function deleteMovie(db, id) {
    const result = await db.collection('Movies').deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount;
}

export { createMovie, getAllMovies, getMovieById, updateMovie, deleteMovie };
