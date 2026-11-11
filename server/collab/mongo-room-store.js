const { MongoClient, Binary } = require('mongodb');

const COLLECTION_NAME = 'rooms';

/**
 * Stores one document per room: { _id: roomId, state: <Yjs update>, createdAt, updatedAt }.
 */
const createMongoRoomStore = async ({ uri, dbName }) => {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  const rooms = client.db(dbName).collection(COLLECTION_NAME);

  return {
    async load(roomId) {
      const document = await rooms.findOne({ _id: roomId }, { projection: { state: 1 } });
      if (!document) return null;
      return new Uint8Array(document.state.buffer);
    },

    async save(roomId, state) {
      const now = new Date();
      await rooms.updateOne(
        { _id: roomId },
        {
          $set: { state: new Binary(state), updatedAt: now },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true }
      );
    },

    close() {
      return client.close();
    },
  };
};

module.exports = { createMongoRoomStore };
