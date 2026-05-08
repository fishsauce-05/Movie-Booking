import { ObjectId } from 'mongodb';

async function getAllRooms(db) {
    return db.collection('Rooms').find({}).toArray();
}

async function getRoomById(db, id) {
    return db.collection('Rooms').findOne({ _id: new ObjectId(id) });
}

async function getRoomByName(db, name) {
    return db.collection('Rooms').findOne({ room_name: name });
}

export { getAllRooms, getRoomById, getRoomByName };
