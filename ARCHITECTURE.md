# CodeSync: How It Works

Real-time collaborative code editor. Multiple users share a room, type in one editor, see each other's cursors, and run code together. Sync is built on Yjs (a CRDT) over Socket.IO, with room state persisted to MongoDB.

This document covers CodeSync, one of the two products in this repository (the other is CodeRace). For the combined site, the landing page, and deployment, see [README.md](README.md).

## 1. Folder Structure

The CodeSync parts of the repository (see the README for the full tree):

```
server/
├── index.js                      Unified entry point: mounts CodeSync and CodeRace, serves the frontends
└── codesync/
    ├── index.js                  /api/codesync/compile, store selection, the /collab namespace
    ├── Actions.js                Socket event names (shared contract with the client)
    └── collab/
        ├── index.js                  setupCollab(): wires Socket.IO events to the room registry
        ├── room-registry.js          One Y.Doc per live room, checkpointing, final save, shutdown flush
        ├── sanitize-awareness.js     Whitelists cursor/user data before relaying it to peers
        ├── mongo-room-store.js       MongoDB persistence (load/save/close)
        └── memory-room-store.js      In-memory fallback when MONGODB_URI is unset

clients/codesync/                 React (CRA) app, CodeMirror 6, Yjs. Built to build/, served at /codesync
├── package.json                  "homepage": "/codesync" makes every asset URL and the router base path /codesync
├── public/                       index.html, images, manifest
└── src/
    ├── index.js, App.js          Router setup and routes (/, /Home, /editor/:roomId, all under /codesync)
    ├── Actions.js                Socket event names (client copy)
    ├── Socket.js                 Backend URL resolution and Socket.IO client creation (/collab namespace)
    ├── collab/
    │   ├── socket-provider.js      Syncs a Y.Doc and Awareness over Socket.IO
    │   ├── collab-session.js       Builds Y.Doc + Awareness + provider for one room visit
    │   └── user-colors.js          Deterministic cursor color from username
    └── components/
        ├── HomePage.js, Home.js    CodeSync landing page and room join form
        ├── EditorPage.js           Room UI: members, language, console, socket lifecycle
        ├── Editor.js               CodeMirror 6 bound to the shared Y.Text
        └── Client.js               One member row (avatar + name)
```

## 2. Big Picture

```
Browser A                          Server                          Browser B
CodeMirror <-> Y.Doc <-> Provider  <-- Socket.IO -->  RoomRegistry  <-- Socket.IO --> Provider <-> Y.Doc <-> CodeMirror
                                                         |
                                                         v
                                                  MongoDB (rooms)
```

- Each client has its own full `Y.Doc`. Edits apply locally first, then travel as small binary updates.
- The server keeps one authoritative `Y.Doc` per room that has at least one connection, relays updates, and saves to the store.
- Presence (cursors, names) uses the Yjs Awareness protocol over the same socket.
- Compile output and join/leave roster events are plain Socket.IO events, unchanged in spirit from before.
- All of this runs on the `/collab` Socket.IO namespace. CodeRace uses `/race` on the same server, so the two products never see each other's rooms or events.

## 3. The Shared Document

Each room has one `Y.Doc` with two top-level types:

| Key | Type | Content |
|---|---|---|
| `code` | `Y.Text` | The editor content |
| `meta` | `Y.Map` | Room settings, currently `language` |

Because the language is in the doc, late joiners and reopened rooms get it for free.

## 4. Socket Events

| Event | Direction | Purpose |
|---|---|---|
| `join` | client to server (with ack) | Join a room. Server loads the doc, then acks `{ ok: true }` or `{ error, code }` |
| `joined` | server to room | Roster update: `{ clients, username, socketId }` |
| `yjs-sync` | client to server (with ack) | Send state vector, receive `{ update, stateVector, awareness }` |
| `yjs-update` | both | Incremental document update (binary) |
| `yjs-awareness` | both | Cursor and presence update (binary) |
| `leave` / `left` | client / server | Explicit leave |
| `disconnected` | server to room | A member left or dropped |
| `output-change` | server to room | Compile output broadcast |

## 5. Lifecycle of a Session

1. User enters room ID and name on `/codesync/Home`, navigates to `/codesync/editor/:roomId` with the name in router state.
2. `EditorPage` creates the Socket.IO connection and a collab session (`Y.Doc`, `Awareness`, `SocketProvider`).
3. On every connect (including reconnects) the provider emits `join`. The server loads the room (from MongoDB if stored), registers the socket, acks, and broadcasts `joined`.
4. The provider sends its state vector via `yjs-sync`. The server replies with only the updates the client is missing, its own state vector, and a snapshot of everyone's cursors.
5. The client applies the diff, then sends back anything the server lacks (edits made offline), and re-announces its presence.
6. The editor becomes editable after this first sync, so nobody types into what looks like an empty room.
7. While typing, each change becomes a `yjs-update`; the server applies it and relays it to the others. Cursor moves go as `yjs-awareness`.
8. When the last user leaves, the server writes the final state to the store and frees the doc.

## 6. Persistence

- Checkpoint after 2 seconds without edits, and at least every 10 seconds during continuous typing.
- Final save when the last connection leaves.
- Every open room is flushed on `SIGTERM` and `SIGINT`.
- Saves are serialized per room so an older write never lands after a newer one.
- A re-join waits for any in-flight final save of the same room before loading, so it never reads stale state.
- A room that failed to load is never saved, so a DB error cannot overwrite stored content with an empty doc.
- Mongo document shape: `{ _id: roomId, state: <Yjs update>, createdAt, updatedAt }` in the `rooms` collection.

## 7. Configuration

| Variable | Where | Purpose |
|---|---|---|
| `MONGODB_URI` | server | Mongo connection string. Unset means in-memory only. Set but unreachable means the server refuses to boot |
| `MONGODB_DB_NAME` | server | Optional DB name |
| `CLIENT_ORIGIN` | server | Comma-separated allowed CORS origins |
| `JDOODLE_CLIENT_ID`, `JDOODLE_CLIENT_SECRET` | server | Code execution API |
| `PORT` | server | Default 5000 |
| `REACT_APP_BACKEND_URL` | client build | Backend URL baked into the bundle. Unset means the page's own origin (or `localhost:5000` in development) |

Server env lives in `server/.env`. Requires Node 20.19 or newer (MongoDB driver 7). The README lists the variables for the whole site, including CodeRace's.

Commands (from the repository root): `npm run dev` (server with nodemon), `npm start`, `npm run build` (installs everything and builds both frontends), `npm run dev:codesync` (CodeSync dev server at `http://localhost:3000/codesync/`).

## 7a. Known Limits

- Single server process only. Scaling out needs room-sticky routing or a pub/sub layer.
- Final save makes 3 attempts over about 1.3 seconds, then drops and logs the unsaved edits.
- Socket.IO caps a single client message at 1 MB by default.
- `clients/codesync/public/index.html` references two script files that do not exist (`jquery/jquery.js`, `js/bootstrap.min.js`), causing two harmless 404s in the browser console.

## 8. Fifty Questions and Answers

### Concepts

**1. What is a CRDT?**
A data structure whose replicas can be edited independently and always converge to the same state when they exchange updates, with no central conflict resolution.

**2. What is Yjs?**
A JavaScript CRDT library. It provides shared types (`Y.Text`, `Y.Map`) and compact binary updates.

**3. Why Yjs instead of sending the whole string on each keystroke?**
Whole-string relays overwrite concurrent edits (last writer wins) and waste bandwidth. Yjs sends tiny increments and merges concurrent edits without loss.

**4. Why no race conditions between local and remote edits?**
JavaScript is single-threaded and both directions apply synchronously, tagged with a transaction origin. Local edits mirror into Yjs; remote updates are applied with the provider as origin so they are never echoed back.

**5. What is a state vector?**
A compact summary of which updates a peer has already seen. Comparing two state vectors tells each side exactly what the other is missing.

**6. What is Awareness?**
A separate, non-persistent channel for ephemeral state: who is here, their color, and their cursor. It is not part of the document.

**7. Why is the document persisted but awareness not?**
Cursors are meaningless after a user leaves. The document is the product.

**8. Does the server need to understand the code text?**
No. It only applies and relays binary updates. It never parses the content.

### Architecture choices

**9. Why a custom Socket.IO provider instead of y-websocket?**
The app already has one Socket.IO connection for presence and output. Reusing it avoids a second socket, a second CORS path, and a second reconnect system. The cost is about 150 lines of transport code.

**10. Why CodeMirror 6?**
The maintained Yjs binding, `y-codemirror.next`, targets CM6. The CM5 binding was last published in 2022.

**11. Why MongoDB?**
The project had no database; Mongo was first in the stack and stores binary blobs naturally. It sits behind a three-method store interface, so swapping databases is one file.

**12. Can I use PostgreSQL instead?**
Yes. Write a store with `load(roomId)`, `save(roomId, state)`, `close()` and select it in `createRoomStore` in `server/codesync/index.js`.

**13. Why is the JOIN an acknowledged request?**
The server must finish loading the doc before the client starts syncing. The ack is the "ready" signal.

**14. Why is language stored in the Y.Doc?**
So it persists, late joiners see it, and concurrent changes cannot conflict.

**15. Why was `connectionStateRecovery` removed?**
The state-vector handshake on every reconnect already heals any missed updates, and recovery would buffer every keystroke packet for minutes.

### Sync and reconnects

**16. What happens when a user goes offline?**
The editor stays editable. Edits accumulate in the local doc. On reconnect they are sent via the state-vector exchange.

**17. What if two users edit offline and reconnect?**
Both sets of edits merge. Nothing is lost, and every client ends with identical text.

**18. What if the server restarts?**
Clients reconnect, rejoin, and resync. The server reloads from the store, and clients send back anything newer than what was saved.

**19. Why is the editor locked before the first sync?**
So a late joiner cannot type into an apparently empty editor and pollute the shared file.

**20. Does undo undo other people's edits?**
No. The Yjs undo manager tracks only the local user's changes.

**21. Why does a reconnecting user bump the awareness clock?**
Peers ignore awareness updates that are not newer than the last one they saw. Re-setting the local state raises the clock so the re-announcement is accepted.

**22. How big can a document be?**
Server to client has no practical limit here. A single client message is capped at 1 MB by Socket.IO defaults, which matters only for very large offline backlogs.

**23. How fast are remote edits?**
About 20 ms median on localhost in testing. Real latency is network round trip.

### Presence and cursors

**24. How are name tags shown?**
`y-codemirror.next` renders a caret widget per remote user. CSS in `Editor.js` makes the tag always visible (the library hides it until hover by default).

**25. How is a user's color chosen?**
A hash of the username picks one of eight palette colors, so a user keeps the same color across sessions.

**26. What if two users get the same color?**
It can happen. Name tags disambiguate.

**27. Why do cursors vanish when I click outside the editor?**
The binding clears your cursor when the editor loses focus.

**28. Can a user fake their name tag?**
No. The server forces the displayed name to the username used at join.

**29. Can a client inject CSS through its color?**
No. The server only accepts `#RRGGBB` or `#RRGGBBAA` and substitutes a fallback otherwise.

**30. What happens to a user's cursor when they close the tab?**
The socket disconnects, the server removes their awareness state, and peers see the cursor disappear.

### Server and persistence

**31. When is the document saved?**
After 2 s idle, at most every 10 s while typing, when the last user leaves, and on shutdown signals.

**32. What if MongoDB goes down during a session?**
Editing and syncing continue from memory. Checkpoints retry every 5 s and succeed once Mongo returns.

**33. What if MongoDB is down when someone opens a room?**
The join fails after the load times out, the user sees "Failed to join the room" and returns to the home page. Other sessions are unaffected.

**34. Can a failed load wipe my stored code?**
No. A room that failed to load is never saved.

**35. What if someone rejoins while the final save is still running?**
The new load waits for that save to finish, so it never reads stale content.

**36. What does the server do on SIGTERM?**
Stops accepting joins, flushes every dirty room to the store, closes the DB, and exits (forced exit after 10 s).

**37. What if the final save fails?**
It retries 3 times over about 1.3 s, then drops the unsaved edits and logs an error with the room ID.

**38. What if `MONGODB_URI` is not set?**
Rooms live in process memory: they survive being emptied but not a server restart. A warning is logged.

**39. Where is room data stored?**
The `rooms` collection, one document per room, with the Yjs state as binary.

**40. Can I run multiple server instances?**
Not as is. Room state lives in one process. Use room-sticky routing or add a pub/sub layer.

**41. How are rooms removed from memory?**
When the last connection leaves and the final save completes, the doc is destroyed.

### Security and robustness

**42. What if a client sends garbage bytes?**
Every handler that decodes input is wrapped in try/catch. The message is dropped and logged, and the server keeps running.

**43. Are room IDs secret?**
Effectively they are the only access control. Anyone with the ID can join and edit. Use UUIDs (the Create New Room button does) and treat them like links.

**44. Are there input limits?**
Room IDs up to 128 characters and usernames up to 64. Invalid joins get an error ack and are disconnected.

**45. Can a user join two rooms on one socket?**
No. A second join is rejected with `ALREADY_JOINED`.

### Running and extending

**46. How do I run it locally?**
Set `server/.env`, run `npm install` in the root and in `clients/codesync/`, start the server with `npm run dev`, and the client with `npm run dev:codesync`. Open `http://localhost:3000/codesync/Home`. To see the whole site as it runs in production, use `npm run build && npm start` and open `http://localhost:5000`.

**47. How does production serve the frontend?**
`npm run build` builds every frontend, and `server/index.js` serves the CodeSync build at `/codesync`, falls back to its `index.html` for any route without a file extension, and returns 404 for missing assets. The landing page and CodeRace are served the same way at `/` and `/coderace`.

**48. How do I add a new shared field, like a room title?**
Put it in `doc.getMap("meta")` via `collab.meta.set(...)` and observe it in a React effect, the way `EditorPage` does for `language`. It syncs and persists automatically.

**49. How do I add another awareness field, like "is typing"?**
Set it with `awareness.setLocalStateField(...)` on the client, and add it to the whitelist in `server/codesync/collab/sanitize-awareness.js` or the server will drop it.

**50. How do I change syntax highlighting per language?**
Today the editor always uses JavaScript mode. Add a CodeMirror `Compartment` in `Editor.js`, import the matching `@codemirror/lang-*` package, and reconfigure it when `meta.language` changes.

## 9. Ten-Minute Presentation Script

Spoken pace is about 130 words per minute. Bracketed notes are actions, not words. Suggested demo: two browser windows side by side on the same room.

### 0:00 to 1:00 | The problem

"Hi everyone. I'm going to show how CodeSync keeps several people editing the same file in real time, and what I changed to make it reliable.

CodeSync is a collaborative code editor. You create a room, share the ID, and everyone types in one editor, sees each other's cursors, and runs the code together.

The first version worked like this: every keystroke, the browser sent the entire file to the server, and the server forwarded it to everyone else. That is simple, but it has three real problems. If two people type at the same moment, one person's edit silently overwrites the other's. It wastes bandwidth, because a one-character change sends the whole file. And nothing was saved, so when the last person left, the code was gone."

### 1:00 to 2:30 | The idea: CRDTs

"The fix is a CRDT, a conflict-free replicated data type. Instead of sending the whole text, each browser keeps its own full copy of the document, and sends only small changes. The key property is that you can apply those changes in any order, on any copy, and every copy ends up identical. No central referee, no overwrites.

I used Yjs, the most widely used CRDT library. The document is a Yjs doc with two parts: a text object for the code, and a small map for settings like the selected language.

Two things Yjs gives us matter a lot. First, a state vector, which is a compact summary of what a peer has already seen. When two sides meet, they swap state vectors and exchange only what the other is missing. Second, the Awareness protocol, a separate channel for temporary information: who is online, what color they are, where their cursor is. It is not saved, because a cursor means nothing after someone leaves."

### 2:30 to 4:00 | Architecture

[Show the diagram from section 2]

"Here is the whole picture. In each browser, CodeMirror, the editor, is bound to a Yjs document. A small piece of code I wrote, the provider, sends that document's changes over Socket.IO. The server keeps one authoritative copy of each active room in memory, relays updates to everyone else, and saves to MongoDB.

Two decisions worth explaining. I did not use the stock y-websocket provider. The app already had a Socket.IO connection for the member list and compile output, so I carried Yjs over that same connection. One socket per user, one reconnect system, one CORS setup. The tradeoff is about 150 lines of transport code that I own.

And I moved the editor from CodeMirror 5 to 6, because the maintained Yjs binding only supports version 6. The old editor component was under 80 lines, so the migration was cheap."

### 4:00 to 5:30 | What happens when you join

"Let me walk through a join. The browser connects and sends a join request with the room ID and name. The server loads the room: from memory if it is active, from MongoDB if it was saved, or empty if it is new. Only then does it answer 'ready'.

Next, the browser sends its state vector. The server replies with just the changes the browser lacks, plus the cursors of everyone already there. The browser applies them and sends back anything the server is missing, like edits made while offline. Then it announces itself, and everyone sees a new cursor with a name tag.

Until that first sync finishes, the editor is read-only. That prevents the classic bug where someone types into what looks like an empty file and then the real content appears around it.

The important detail: this same handshake runs on every reconnect. That is why we do not need to buffer or replay anything."

### 5:30 to 6:30 | Live demo

[Two windows, same room]

"Window one types. Window two updates instantly. Now both of us type at the same time, even in the same line. Nothing is lost, and both texts are identical.

Notice the colored cursors with name tags. Now I select some text in one window and you can see the selection highlight in the other. I will press undo in one window: only that user's own edit is undone, not the other person's.

Now the party trick. I stop the server. [Stop server] Both editors still work. I type in each window while offline. The texts are now different. I restart the server. [Start server] Within a couple of seconds, both reconnect and converge, with both people's edits present."

### 6:30 to 8:00 | Persistence

"Persistence is where the details matter. The server keeps the live document in memory and saves in three situations: a checkpoint two seconds after typing stops, and at most every ten seconds during continuous typing; a final save when the last person leaves; and a flush of every open room when the server receives a shutdown signal, which happens on every deploy.

I found and fixed a subtle race. If the last user leaves and someone rejoins a moment later, the new load could read the database before the old final save finished, and bring back stale content. Now a rejoin waits for any in-flight save of that room. I wrote a test that reproduced the bug, and confirmed it fails without the fix.

Two safety rules. Saves for a room are queued, so an older, slower write can never land after a newer one. And if a room fails to load, it is never saved, so a database error cannot overwrite real content with an empty document.

If MongoDB goes down mid-session, editing keeps working from memory and saves retry every five seconds. I tested that by killing the database during a live session and bringing it back."

### 8:00 to 9:00 | Security and robustness

"Anything a client sends is untrusted. Every handler that decodes binary data is wrapped so garbage input is dropped and logged, never a crash.

A less obvious one: the cursor color a client announces ends up inside a style attribute in everyone else's browser. A malicious client could inject CSS. So the server whitelists awareness data: colors must be valid hex, the display name is always the name used at join, and the cursor must have a valid shape.

I also fixed two old bugs along the way. After any network blip, the Run button stayed disabled forever, because the code listened for an event that never fires. And the first connection error after a blip kicked users back to the home page. Now the session rides out drops."

### 9:00 to 10:00 | Results and wrap-up

"How did I verify this? Server-level tests with real clients covering convergence, reconnects and hostile input. Concurrency tests for the persistence races, each with a negative control. The Mongo store against a real MongoDB. And about fifty checks in two real Chrome windows: concurrent typing, cursors, undo, persistence, a hard server kill with offline edits, and a database outage. Remote edits showed up in roughly twenty milliseconds on localhost.

Honest limits: it runs as a single server process, so scaling out needs sticky routing or a pub/sub layer. And the final save gives up after a few retries, so a long database outage at the moment a room closes can drop the last few seconds.

To recap: CRDTs make concurrent editing conflict-free, the state-vector handshake makes reconnects trivial, awareness gives live cursors, and a careful save lifecycle makes it durable. Thank you, I'm happy to take questions."

### Likely follow-ups

Use the Q&A in section 8. The most common: questions 3, 9, 17, 31, 32, 40.
