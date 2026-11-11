/**
 * Process-local store used when MONGODB_URI is not set. Rooms survive being
 * emptied, but not a server restart.
 */
const createMemoryRoomStore = () => {
  const states = new Map();

  return {
    async load(roomId) {
      return states.get(roomId) ?? null;
    },

    async save(roomId, state) {
      states.set(roomId, state);
    },

    async close() {
      states.clear();
    },
  };
};

module.exports = { createMemoryRoomStore };
