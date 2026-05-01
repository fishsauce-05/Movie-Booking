import 'dotenv/config';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/db_movie_booking';
const DATABASE_NAME = process.env.MONGODB_DB || 'db_movie_booking';

export const client = new MongoClient(MONGODB_URI);

export async function connectToDatabase() {
    await client.connect();
    return client.db(DATABASE_NAME);
}
