import * as Y from "yjs";
import {
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from "y-protocols/awareness";
import { ACTIONS } from "../Actions";

const ACK_TIMEOUT_MS = 10000;
const EMPTY_UPDATE_BYTES = 2;

const toUint8Array = (payload) =>
  payload instanceof Uint8Array ? payload : new Uint8Array(payload);

/**
 * Syncs a Y.Doc and its Awareness over an existing Socket.IO connection.
 *
 * On every (re)connect it joins the room, then runs a state-vector handshake so both
 * sides exchange only what the other is missing. Edits made while offline are part of
 * that exchange, so nothing needs to be buffered or replayed.
 *
 * `subscribe` / `getSnapshot` follow the useSyncExternalStore contract.
 */
export class SocketProvider {
  #socket;
  #roomId;
  #username;
  #doc;
  #awareness;
  #onError;
  #listeners = new Set();
  #snapshot = { status: "connecting", hasSynced: false };
  #isJoined = false;
  #joinAttempt = 0;

  constructor({ socket, roomId, username, doc, awareness, onError }) {
    this.#socket = socket;
    this.#roomId = roomId;
    this.#username = username;
    this.#doc = doc;
    this.#awareness = awareness;
    this.#onError = onError;

    doc.on("update", this.#handleDocUpdate);
    awareness.on("update", this.#handleAwarenessUpdate);
    socket.on("connect", this.#handleConnect);
    socket.on("disconnect", this.#handleDisconnect);
    socket.on(ACTIONS.YJS_UPDATE, this.#handleRemoteUpdate);
    socket.on(ACTIONS.YJS_AWARENESS, this.#handleRemoteAwareness);

    if (socket.connected) this.#handleConnect();
  }

  subscribe = (listener) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  getSnapshot = () => this.#snapshot;

  destroy() {
    this.#joinAttempt += 1;
    this.#isJoined = false;
    this.#doc.off("update", this.#handleDocUpdate);
    this.#awareness.off("update", this.#handleAwarenessUpdate);
    this.#socket.off("connect", this.#handleConnect);
    this.#socket.off("disconnect", this.#handleDisconnect);
    this.#socket.off(ACTIONS.YJS_UPDATE, this.#handleRemoteUpdate);
    this.#socket.off(ACTIONS.YJS_AWARENESS, this.#handleRemoteAwareness);
    this.#listeners.clear();
  }

  #setSnapshot(patch) {
    const next = { ...this.#snapshot, ...patch };
    if (
      next.status === this.#snapshot.status &&
      next.hasSynced === this.#snapshot.hasSynced
    ) {
      return;
    }
    this.#snapshot = next;
    this.#listeners.forEach((listener) => listener());
  }

  async #request(event, payload) {
    const response = await this.#socket
      .timeout(ACK_TIMEOUT_MS)
      .emitWithAck(event, payload);
    if (response?.error) {
      throw Object.assign(new Error(response.error), { code: response.code });
    }
    return response;
  }

  async #join() {
    // A newer connect or a disconnect invalidates this attempt, its late replies are ignored.
    const attempt = ++this.#joinAttempt;
    this.#isJoined = false;

    try {
      this.#setSnapshot({ status: "connecting" });
      await this.#request(ACTIONS.JOIN, {
        roomId: this.#roomId,
        username: this.#username,
      });
      if (attempt !== this.#joinAttempt) return;
      this.#isJoined = true;

      const { update, stateVector, awareness } = await this.#request(
        ACTIONS.YJS_SYNC,
        Y.encodeStateVector(this.#doc)
      );
      if (attempt !== this.#joinAttempt) return;

      Y.applyUpdate(this.#doc, toUint8Array(update), this);
      applyAwarenessUpdate(this.#awareness, toUint8Array(awareness), this);

      const missingOnServer = Y.encodeStateAsUpdate(
        this.#doc,
        toUint8Array(stateVector)
      );
      if (missingOnServer.byteLength > EMPTY_UPDATE_BYTES) {
        this.#socket.emit(ACTIONS.YJS_UPDATE, missingOnServer);
      }

      this.#announcePresence();
      this.#setSnapshot({ status: "connected", hasSynced: true });
    } catch (error) {
      if (attempt === this.#joinAttempt) this.#onError?.(error);
    }
  }

  // Re-setting the state bumps the awareness clock. Peers ignore an update that is
  // not newer than the last one they saw, so a plain re-send after a reconnect is dropped.
  #announcePresence() {
    const localState = this.#awareness.getLocalState();
    if (localState) this.#awareness.setLocalState(localState);
  }

  // The server drops this client's presence when the socket closes and cannot tell us
  // about peers while we are offline. Forget their clocks too, otherwise the snapshot
  // received after reconnecting is ignored as "not newer".
  #clearRemoteAwareness() {
    const remoteClientIds = Array.from(this.#awareness.getStates().keys()).filter(
      (clientId) => clientId !== this.#doc.clientID
    );
    removeAwarenessStates(this.#awareness, remoteClientIds, this);
    remoteClientIds.forEach((clientId) => this.#awareness.meta.delete(clientId));
  }

  #handleConnect = () => {
    this.#join();
  };

  #handleDisconnect = () => {
    this.#joinAttempt += 1;
    this.#isJoined = false;
    this.#clearRemoteAwareness();
    this.#setSnapshot({ status: "disconnected" });
  };

  // Updates from before the join are covered by the handshake in #join.
  #handleDocUpdate = (update, origin) => {
    if (origin === this || !this.#isJoined) return;
    this.#socket.emit(ACTIONS.YJS_UPDATE, update);
  };

  // Only our own presence is forwarded. Peers' presence is owned by the server, which
  // also removes it on disconnect, so a local timeout must not evict them for everyone.
  #handleAwarenessUpdate = ({ added, updated, removed }) => {
    if (!this.#isJoined) return;
    const ownClientId = this.#doc.clientID;
    if (!added.concat(updated, removed).includes(ownClientId)) return;
    this.#socket.emit(
      ACTIONS.YJS_AWARENESS,
      encodeAwarenessUpdate(this.#awareness, [ownClientId])
    );
  };

  #handleRemoteUpdate = (payload) => {
    try {
      Y.applyUpdate(this.#doc, toUint8Array(payload), this);
    } catch (error) {
      console.error("Failed to apply remote update", error);
    }
  };

  #handleRemoteAwareness = (payload) => {
    try {
      applyAwarenessUpdate(this.#awareness, toUint8Array(payload), this);
    } catch (error) {
      console.error("Failed to apply remote awareness update", error);
    }
  };
}
