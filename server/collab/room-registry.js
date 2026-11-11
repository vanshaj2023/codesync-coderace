const Y = require('yjs');
const { Awareness, removeAwarenessStates } = require('y-protocols/awareness');

const FINAL_SAVE_ATTEMPTS = 3;
const FINAL_SAVE_BACKOFF_MS = 250;
const CHECKPOINT_RETRY_MS = 5000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Room {
  constructor(id) {
    this.id = id;
    this.doc = new Y.Doc();
    this.awareness = new Awareness(this.doc);
    this.awareness.setLocalState(null);
    // connectionId -> awareness client ids that connection introduced
    this.connections = new Map();
    this.ready = null;
    this.isClosed = false;
    this.dirty = false;
    this.dirtySince = 0;
    this.saveTimer = null;
    this.saveQueue = Promise.resolve();
  }
}

/**
 * Keeps one Y.Doc per room in memory while the room has connections,
 * checkpoints it to the store while it is being edited, and writes the
 * final state when the last connection leaves.
 *
 * Store contract: load(roomId) -> Uint8Array | null, save(roomId, state) -> void.
 * onRoomLoaded(room) runs once per room incarnation, before the first join resolves.
 */
class RoomRegistry {
  #rooms = new Map();
  #closing = new Map();
  #store;
  #onRoomLoaded;
  #saveDebounceMs;
  #saveMaxWaitMs;
  #isShuttingDown = false;

  constructor({ store, onRoomLoaded = () => {}, saveDebounceMs = 2000, saveMaxWaitMs = 10000 }) {
    this.#store = store;
    this.#onRoomLoaded = onRoomLoaded;
    this.#saveDebounceMs = saveDebounceMs;
    this.#saveMaxWaitMs = saveMaxWaitMs;
  }

  get(roomId) {
    return this.#rooms.get(roomId);
  }

  async join(roomId, connectionId) {
    if (this.#isShuttingDown) throw new Error('Server is shutting down');

    let room = this.#rooms.get(roomId);
    if (!room) {
      room = new Room(roomId);
      room.ready = this.#load(room);
      this.#rooms.set(roomId, room);
    }
    // Registered before awaiting so the room cannot be evicted while this join is in flight.
    room.connections.set(connectionId, new Set());

    try {
      await room.ready;
    } catch (error) {
      room.connections.delete(connectionId);
      this.#discard(room);
      throw error;
    }
    return room;
  }

  async leave(roomId, connectionId) {
    const room = this.#rooms.get(roomId);
    const controlledClientIds = room?.connections.get(connectionId);
    if (!controlledClientIds) return;

    room.connections.delete(connectionId);
    const clientIds = Array.from(controlledClientIds);
    removeAwarenessStates(room.awareness, clientIds, null);
    // Awareness ignores updates that are not newer than the last clock it saw for a client.
    // Forgetting the clock lets the same client announce itself again after reconnecting.
    clientIds.forEach((clientId) => room.awareness.meta.delete(clientId));

    if (room.connections.size === 0) await this.#close(room);
  }

  async shutdown() {
    this.#isShuttingDown = true;
    const openRooms = Array.from(this.#rooms.values());
    await Promise.all([
      ...openRooms.map((room) => this.#close(room)),
      ...this.#closing.values(),
    ]);
  }

  async #load(room) {
    // A previous incarnation of this room may still be writing its final state.
    // Loading before that write lands would resurrect stale content.
    await this.#closing.get(room.id);

    const state = await this.#store.load(room.id);
    if (state) Y.applyUpdate(room.doc, state);

    room.doc.on('update', () => this.#markDirty(room));
    this.#onRoomLoaded(room);
  }

  #discard(room) {
    room.isClosed = true;
    if (this.#rooms.get(room.id) === room) this.#rooms.delete(room.id);
    room.doc.destroy();
  }

  #close(room) {
    room.isClosed = true;
    this.#rooms.delete(room.id);

    // A room that failed to load is never saved, an empty doc must not overwrite stored state.
    const closing = room.ready
      .then(() => this.#flush(room), () => undefined)
      .catch((error) => {
        console.error(`Failed to persist room ${room.id}, unsaved edits were dropped:`, error);
      })
      .finally(() => {
        room.doc.destroy();
        if (this.#closing.get(room.id) === closing) this.#closing.delete(room.id);
      });
    this.#closing.set(room.id, closing);
    return closing;
  }

  #markDirty(room) {
    if (!room.dirty) room.dirtySince = Date.now();
    room.dirty = true;

    const untilMaxWait = room.dirtySince + this.#saveMaxWaitMs - Date.now();
    const delay = Math.max(0, Math.min(this.#saveDebounceMs, untilMaxWait));
    this.#scheduleCheckpoint(room, delay);
  }

  #scheduleCheckpoint(room, delay) {
    clearTimeout(room.saveTimer);
    room.saveTimer = setTimeout(() => this.#checkpoint(room), delay);
  }

  async #checkpoint(room) {
    try {
      await this.#save(room);
    } catch (error) {
      // A closing room is handled by its final flush, retrying here would outlive the room.
      if (room.isClosed) return;
      console.error(`Checkpoint failed for room ${room.id}, retrying: ${error.message}`);
      this.#scheduleCheckpoint(room, CHECKPOINT_RETRY_MS);
    }
  }

  async #flush(room) {
    clearTimeout(room.saveTimer);
    for (let attempt = 1; ; attempt += 1) {
      try {
        await this.#save(room);
        return;
      } catch (error) {
        if (attempt === FINAL_SAVE_ATTEMPTS) throw error;
        await wait(FINAL_SAVE_BACKOFF_MS * 4 ** (attempt - 1));
      }
    }
  }

  // Saves are chained per room so an older, slower write can never land after a newer one.
  #save(room) {
    const run = async () => {
      if (!room.dirty) return;
      room.dirty = false;
      try {
        await this.#store.save(room.id, Y.encodeStateAsUpdate(room.doc));
      } catch (error) {
        room.dirty = true;
        throw error;
      }
    };
    room.saveQueue = room.saveQueue.then(run, run);
    return room.saveQueue;
  }
}

module.exports = { RoomRegistry };
