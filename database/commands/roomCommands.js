import { ObjectId } from 'mongodb';

async function createRoom(db, data) {
    const result = await db.collection('Rooms').insertOne({
        room_name:   data.room_name,
        screen_type: data.screen_type,
        status:      data.status || 'Active',
        seats:       data.seats || [],
        created_at:  new Date()
    });
    return result.insertedId;
}

async function updateRoom(db, id, data) {
    const result = await db.collection('Rooms').updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...data, updated_at: new Date() } }
    );
    return result.modifiedCount;
}

async function deleteRoom(db, id) {
    const result = await db.collection('Rooms').deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount;
}

export { createRoom, updateRoom, deleteRoom };
