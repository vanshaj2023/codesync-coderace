import * as Y from 'yjs';
import {
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  modifyAwarenessUpdate,
} from 'y-protocols/awareness';
import { ACTIONS } from '../Actions.js';
import { RoomRegistry } from './room-registry.js';
import { sanitizeAwarenessState } from './sanitize-awareness.js';

const MAX_ROOM_ID_LENGTH = 128;
const MAX_USERNAME_LENGTH = 64;

const toUint8Array = (payload) => {
  if (payload instanceof Uint8Array) return payload;
  if (payload instanceof ArrayBuffer) return new Uint8Array(payload);
  throw new TypeError('Expected a binary payload');
};

const parseJoinPayload = (payload) => {
  const { roomId, username } = payload ?? {};
  const isValid =
    typeof roomId === 'string' &&
    roomId.length > 0 &&
    roomId.length <= MAX_ROOM_ID_LENGTH &&
    typeof username === 'string' &&
    username.trim().length > 0 &&
    username.length <= MAX_USERNAME_LENGTH;
  return isValid ? { roomId, username } : null;
};

const logFailure = (task) =>
  task.catch((error) => console.error('Collab handler failed:', error));

const excludeOrigin = (broadcast, origin) =>
  origin?.id ? broadcast.except(origin.id) : broadcast;

const bindRoomBroadcast = (namespace, room) => {
  room.doc.on('update', (update, origin) => {
    excludeOrigin(namespace.to(room.id), origin).emit(ACTIONS.YJS_UPDATE, update);
  });

  room.awareness.on('update', ({ added, updated, removed }, origin) => {
    if (origin === 'local') return;

    const controlledClientIds = room.connections.get(origin?.id);
    if (controlledClientIds) {
      added.concat(updated).forEach((clientId) => controlledClientIds.add(clientId));
      removed.forEach((clientId) => controlledClientIds.delete(clientId));
    }

    const update = encodeAwarenessUpdate(room.awareness, added.concat(updated, removed));
    excludeOrigin(namespace.to(room.id), origin).emit(ACTIONS.YJS_AWARENESS, update);
  });
};

/**
 * Wires Yjs document sync, awareness and presence onto a Socket.IO namespace.
 * Resolves rooms through a RoomRegistry that persists to `store`.
 */
const setupCollab = (namespace, { store, ...registryOptions }) => {
  const registry = new RoomRegistry({
    store,
    onRoomLoaded: (room) => bindRoomBroadcast(namespace, room),
    ...registryOptions,
  });

  const getRoomClients = (roomId) =>
    Array.from(namespace.adapter.rooms.get(roomId) ?? [], (socketId) => ({
      socketId,
      username: namespace.sockets.get(socketId)?.data.username,
    })).filter(({ username }) => username);

  const joinRoom = async (socket, payload, ack) => {
    const respond = typeof ack === 'function' ? ack : () => {};

    const joinRequest = parseJoinPayload(payload);
    if (!joinRequest) {
      respond({ error: 'Room ID and username are required', code: 'INVALID_JOIN' });
      socket.disconnect();
      return;
    }
    if (socket.data.roomId || socket.data.isJoining) {
      respond({ error: 'Already joined a room', code: 'ALREADY_JOINED' });
      return;
    }

    const { roomId, username } = joinRequest;
    socket.data.isJoining = true;
    try {
      await registry.join(roomId, socket.id);
    } catch (error) {
      console.error(`Failed to join room ${roomId}:`, error);
      respond({ error: 'Failed to load the room', code: 'JOIN_FAILED' });
      return;
    } finally {
      socket.data.isJoining = false;
    }

    if (!socket.connected) {
      await registry.leave(roomId, socket.id);
      return;
    }

    socket.data.roomId = roomId;
    socket.data.username = username;
    socket.join(roomId);
    respond({ ok: true });
    namespace.to(roomId).emit(ACTIONS.JOINED, {
      clients: getRoomClients(roomId),
      username,
      socketId: socket.id,
    });
  };

  const leaveRoom = async (socket) => {
    const { roomId, username } = socket.data;
    if (!roomId) return;

    socket.data.roomId = undefined;
    socket.leave(roomId);
    namespace.to(roomId).emit(ACTIONS.DISCONNECTED, {
      socketId: socket.id,
      username,
      remainingClients: getRoomClients(roomId),
    });
    await registry.leave(roomId, socket.id);
  };

  namespace.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    socket.on(ACTIONS.JOIN, (payload, ack) => {
      logFailure(joinRoom(socket, payload, ack));
    });

    socket.on(ACTIONS.YJS_SYNC, (clientStateVector, ack) => {
      if (typeof ack !== 'function') return;

      const room = registry.get(socket.data.roomId);
      if (!room) {
        ack({ error: 'Join a room before syncing', code: 'NOT_JOINED' });
        return;
      }

      try {
        ack({
          update: Y.encodeStateAsUpdate(room.doc, toUint8Array(clientStateVector)),
          stateVector: Y.encodeStateVector(room.doc),
          awareness: encodeAwarenessUpdate(
            room.awareness,
            Array.from(room.awareness.getStates().keys())
          ),
        });
      } catch (error) {
        console.warn(`Rejected sync request from ${socket.id}:`, error.message);
        ack({ error: 'Invalid sync request', code: 'INVALID_SYNC' });
      }
    });

    socket.on(ACTIONS.YJS_UPDATE, (payload) => {
      const room = registry.get(socket.data.roomId);
      if (!room) return;

      try {
        Y.applyUpdate(room.doc, toUint8Array(payload), socket);
      } catch (error) {
        console.warn(`Dropped malformed update from ${socket.id}:`, error.message);
      }
    });

    socket.on(ACTIONS.YJS_AWARENESS, (payload) => {
      const room = registry.get(socket.data.roomId);
      if (!room) return;

      try {
        const update = modifyAwarenessUpdate(toUint8Array(payload), (state) =>
          sanitizeAwarenessState(state, socket.data.username)
        );
        applyAwarenessUpdate(room.awareness, update, socket);
      } catch (error) {
        console.warn(`Dropped malformed awareness update from ${socket.id}:`, error.message);
      }
    });

    socket.on(ACTIONS.LEAVE, () => {
      const wasInRoom = Boolean(socket.data.roomId);
      logFailure(
        leaveRoom(socket).then(() => {
          if (wasInRoom) socket.emit(ACTIONS.LEFT);
        })
      );
    });

    socket.on('disconnect', () => {
      logFailure(leaveRoom(socket));
    });
  });

  return { shutdown: () => registry.shutdown() };
};

export { setupCollab };
