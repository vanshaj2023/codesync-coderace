# CodeSync
## 1) Project Summary

CodeSync is a real-time collaborative code editor designed for pair programming, interviews, mentoring, and remote teaching. The product goal is to give multiple users a shared coding room with synchronized editing, language switching, and shared compile output. The key promise is low-friction collaboration: users create or join a room, type together in one editor, and run code so everyone sees the same results. The system is split into a React frontend and a Node.js backend, with Socket.IO providing the real-time data layer and Express providing the REST endpoint for compilation. In production, the backend also serves the built frontend as static assets.

At a high level, the frontend is responsible for UI, routing, editor state, and socket coordination. The backend owns room membership, message broadcasting, and compile requests to the JDoodle API. The project favors simplicity and reliability, using in-memory maps for room state and a small, explicit set of socket events to keep the mental model clear in interviews.

## 2) Architecture Overview

The architecture is a classic client-server split with two types of communication:

1) Real-time: Socket.IO carries presence (join, leave), shared output updates, and the Yjs sync and awareness messages that keep the code, language, and cursors consistent.
2) Request-response: A REST endpoint (`POST /compile`) for executing code via a third-party compiler API.

The frontend uses React for the UI and routing. The editor is CodeMirror 6 bound to a Yjs document, so local typing is applied instantly and concurrent edits merge without conflicts. Socket connections are initialized with the backend URL and configured for reconnection and fallbacks (`websocket` and `polling`). The backend is an Express app that wraps a Socket.IO server. For every room that has at least one connection, the server keeps a Yjs document and its awareness state (cursors) in memory, and stores the document in MongoDB so it survives the room emptying and server restarts. Room membership and presence are tracked per socket and broadcast to the room. The compile endpoint is stateless: it forwards code to JDoodle, then emits the output to the room and returns the result to the requester.

The backend also serves the frontend build in production. This makes deployment easy: a single Node process can host both API and UI, and the client can connect to the same origin unless otherwise configured.

## 3) User Journey (End-to-End Flow)

A typical flow looks like this:

1) User A opens the landing page and generates a room ID.
2) User A enters a username and navigates to `/editor/:roomId`.
3) The client initializes Socket.IO and creates a Yjs session, which emits `JOIN` with room ID and username on every connect and reconnect.
4) The server loads the room's document into memory (from MongoDB if it exists), registers the socket, acknowledges the join, and notifies all clients in that room via `JOINED`.
5) The client sends its Yjs state vector with `YJS_SYNC` and receives only the updates it is missing, plus the cursors of everyone already in the room. Anything it edited while offline is sent to the server the same way.
6) As users type, each change becomes a small Yjs update (`YJS_UPDATE`) that the server applies to its copy and relays to the other clients. Cursor and selection changes travel as `YJS_AWARENESS`.
7) The selected language is stored in the same shared document, so late joiners and reopened rooms get it too.
8) When a user clicks Run, the frontend calls `POST /compile` with the code and language. The server forwards to JDoodle and then emits `OUTPUT_CHANGE` to all room members.
9) When users leave or disconnect, the server removes their cursor and emits `DISCONNECTED` to update the roster.
10) When the last user leaves, the server saves the document to MongoDB and frees it from memory.

The result is a tight loop: edit, sync, run, share output, repeat.

## 4) Core Components and Responsibilities

### Frontend

- `HomePage`: Landing page with the hero section and feature previews.
- `Home`: Room entry page where the user generates or enters a room ID and username.
- `EditorPage`: The main collaborative editor experience. It manages socket connection, room membership, UI for participants, and compile output.
- `Editor`: CodeMirror 6 bound to the shared `Y.Text` with `y-codemirror.next`. Shows remote cursors with name tags and undoes only the local user's edits.
- `Socket.js`: Encapsulates backend URL resolution and Socket.IO initialization.
- `collab/`: `SocketProvider` syncs a Yjs document and its awareness state over the existing Socket.IO connection, `createCollabSession` assembles the document for a room, and `user-colors.js` picks cursor colors.

Key frontend logic:

- The socket connection is created once per editor session and stored in a ref. This prevents unnecessary reconnections during re-renders.
- Local edits are applied to the Yjs document and sent as incremental updates. Remote updates are applied with a different transaction origin, so nothing is echoed back. The editor stays editable while offline and resyncs when the connection returns.
- The compile button hits the backend REST endpoint and also updates local output state. The backend emits `OUTPUT_CHANGE` so all clients see the same results.

### Backend

- `server/index.js`: Express app and Socket.IO server. Handles CORS, compile endpoint, persistence backend selection, graceful shutdown, and static frontend serving.
- `server/Actions.js`: Shared constants for event names.
- `server/collab/`: The Yjs layer. `room-registry.js` owns the in-memory documents and their save lifecycle, `index.js` wires it to Socket.IO, `sanitize-awareness.js` normalizes cursor data sent by clients, and `mongo-room-store.js` / `memory-room-store.js` are the persistence backends.

Key backend logic:

- `allowedOrigins` comes from `CLIENT_ORIGIN` env var, with fallback to localhost and a known Render URL. This constrains socket connections and API requests.
- On `JOIN`, the server loads the room document, records the socket, and broadcasts the updated client list via `JOINED`.
- On `YJS_SYNC`, `YJS_UPDATE` and `YJS_AWARENESS`, the server applies the data to the room's document or awareness state and relays it to the other clients in the room.
- On `LEAVE` and `disconnect`, the server removes the user's cursor, emits `DISCONNECTED`, and saves and unloads the room when it is empty.
- `POST /compile` forwards to JDoodle and emits `OUTPUT_CHANGE` to the room.

## 5) Persistence and Configuration

A room's document lives in server memory while anyone is connected. It is checkpointed to the store after 2 seconds without edits (at most every 10 seconds during continuous typing), written one last time when the final user leaves, and flushed for every open room on `SIGTERM` and `SIGINT`. A room that fails to load is never saved, so a database error cannot overwrite stored content with an empty document. If the database is unreachable while a room is live, editing keeps working from memory and the checkpoint is retried every 5 seconds.

Server environment variables:

- `MONGODB_URI`: MongoDB connection string. Rooms are stored in the `rooms` collection as `{ _id: roomId, state, createdAt, updatedAt }`. If unset, rooms are kept in memory only and are lost on restart. If set but unreachable, the server refuses to start.
- `MONGODB_DB_NAME`: Optional database name. Defaults to the one in the connection string.

Notes:

- The MongoDB driver (v7) requires Node 20.19 or newer.
- Room state is held by a single process, which is the same assumption the previous in-memory maps made. Running several instances needs room-sticky routing or a pub/sub layer between them.
