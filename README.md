# CodeSync + CodeRace

One web app, two products. A landing page lets visitors choose how they want to code with other people:

- **CodeSync**: a real-time collaborative code editor with live cursors, shared output, and rooms that are saved.
- **CodeRace**: 1v1 coding races on the same problem, with ELO ratings, a leaderboard, and AI code reviews.

Both run from a single Node server on a single domain, so there is one deploy, one URL, and no CORS between them.

## 1) What Lives Where

| URL | What it is |
|---|---|
| `/` | Landing page. Two cards route the visitor to either product |
| `/codesync/` | CodeSync (React, CodeMirror 6, Yjs) |
| `/coderace/` | CodeRace (React 19, Tailwind, Supabase auth) |
| `/api/codesync/compile` | CodeSync: run code through JDoodle |
| `/api/code`, `/api/users`, `/api/ai` | CodeRace: execute code, leaderboard and profiles, AI review |
| `/api/health` | Health check, reports which products are enabled |
| Socket.IO `/collab` | CodeSync real-time channel (Yjs sync, cursors, presence) |
| Socket.IO `/race` | CodeRace real-time channel (rooms, ready, progress, results) |

Each product is a separate frontend bundle with its own toolchain, because they were built on different stacks (CodeSync: Create React App, React 18, Bootstrap. CodeRace: Vite, React 19, Tailwind). Serving them as separate bundles under one origin keeps their styles and dependencies from interfering. Each has an **All apps** link back to the landing page.

All three share one design language: an ink background (`#070b0a`), a mint accent (`#5ed29c`), Inter for text, and Instrument Serif italic for highlighted words. The landing page, the CodeSync landing page (`/codesync/`), and the CodeRace home (`/coderace/`) use the same video hero. The two product pages add sections below it that explain what the app does, its features, and how it works.

## 2) Repository Layout

```
.
├── package.json              Server dependencies and scripts (ESM)
├── render.yaml               Render blueprint: one web service
├── licenses/                 Third-party license notices (CodeRace, MIT)
├── server/
│   ├── index.js              Entry point: Express, Socket.IO, mounts both products, serves the frontends
│   ├── config/env.js         Loads server/.env before anything else
│   ├── codesync/             CodeSync backend
│   │   ├── index.js            /api/codesync/compile and the /collab namespace
│   │   ├── Actions.js          Socket event names
│   │   └── collab/             Yjs layer: room registry, stores, awareness sanitizing
│   └── coderace/             CodeRace backend
│       ├── index.js            Routes, rate limits, and the /race namespace
│       ├── controllers/ routes/ utils/ config/ cron/ middleware/
│       └── seeders/ csv_files/ harnesss/ ...   One-off data tooling, not used at runtime
└── clients/
    ├── landing/              Landing page (React, Tailwind, hls.js video hero; builds to dist/, served at /)
    ├── codesync/             CodeSync frontend (builds to build/, served at /codesync)
    └── coderace/             CodeRace frontend (builds to dist/, served at /coderace)
```

## 3) How the Pieces Fit

- `server/index.js` creates one Express app and one Socket.IO server. CodeSync and CodeRace each mount onto it through `mountCodeSync` and `mountCodeRace`.
- Socket.IO **namespaces** keep the two products apart. Rooms, events, and handlers in `/collab` never mix with those in `/race`.
- The server serves the built landing page (`clients/landing/dist`) at `/`, and the two built frontends under their own prefixes, each with a single-page-app fallback. A missing asset returns 404 rather than HTML.
- CodeSync stores rooms in **MongoDB**. CodeRace stores users, rooms, and problems in **Supabase**. Each product only touches its own database.
- If one product is not configured, only that product is disabled. Without Supabase credentials, CodeRace answers `503` and everything else keeps working.
- Behind Render's proxy the server trusts one proxy hop, so CodeRace's per-IP rate limits apply per visitor instead of to everyone at once.

## 4) Running Locally

Requires Node 20.19 or newer.

```bash
npm install
npm install --prefix clients/landing
npm install --prefix clients/codesync
npm install --prefix clients/coderace
```

Create `server/.env` from the variables in section 5.

**Whole site, like production** (http://localhost:5000):

```bash
npm run build     # installs everything and builds both frontends
npm start
```

**Developing a frontend** (the server must also be running with `npm run dev`):

```bash
npm run dev:landing     # http://localhost:5173/
npm run dev:codesync    # http://localhost:3000/codesync/
npm run dev:coderace    # http://localhost:5173/coderace/
```

For CodeRace, put `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `clients/coderace/.env`.

## 5) Environment Variables

Every variable is optional. A missing group only disables the feature that needs it.

**Server runtime** (`server/.env`, or the Render dashboard):

| Variable | Used by | Purpose |
|---|---|---|
| `PORT` | server | Defaults to 5000 |
| `CLIENT_ORIGIN` | server | Extra allowed browser origins, comma separated. Not needed when one server hosts everything |
| `MONGODB_URI` | CodeSync | Where rooms are saved. If unset, rooms live in memory and are lost on restart. If set but unreachable, the server refuses to start |
| `MONGODB_DB_NAME` | CodeSync | Optional database name |
| `JDOODLE_CLIENT_ID`, `JDOODLE_CLIENT_SECRET` | CodeSync | The Run button |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | CodeRace | Database. If unset, CodeRace is disabled |
| `RAPIDAPI_KEY` | CodeRace | Code execution through OneCompiler |
| `GEMINI_API_KEY` | CodeRace | AI code review and nightly test case generation |

**Build time** (read by Vite when the CodeRace bundle is built, so set them before `npm run build`):

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key, safe for the browser |
| `VITE_BACKEND_URL` | Only if the API is on a different origin |

## 6) Deploying to Render

`render.yaml` defines a single web service that runs `npm run build` and `npm start`.

1. Push the repo to GitHub.
2. In Render, choose New, then Blueprint, and select the repo.
3. Fill in the prompted variables from section 5. The two `VITE_` variables must be set before the first build.
4. Open the service URL. `/` shows the landing page.

MongoDB Atlas needs to allow connections from Render (Network Access). On the free plan the service sleeps when idle, so the first request after a break takes a while. Rooms are safe across sleeps because CodeSync saves them.

## 7) CodeSync

A real-time collaborative editor for pair programming, interviews, mentoring, and remote teaching. Users create or join a room, type together in one editor, and run code so everyone sees the same results.

**Architecture.** The editor is CodeMirror 6 bound to a Yjs document, so local typing applies instantly and concurrent edits merge without conflicts. Yjs updates, cursor positions (the Yjs Awareness protocol), and presence all travel over Socket.IO on the `/collab` namespace. For every room with at least one connection, the server keeps a Yjs document in memory and saves it to MongoDB. The compile endpoint forwards code to JDoodle, emits the output to the room, and returns it to the requester.

**User journey**

1. A user opens `/codesync/`, enters a username and a room ID (or generates one), and goes to `/codesync/editor/:roomId`.
2. The client creates a Yjs session, which emits `JOIN` on every connect and reconnect.
3. The server loads the room's document (from MongoDB if it exists), registers the socket, acknowledges the join, and notifies the room via `JOINED`.
4. The client sends its Yjs state vector with `YJS_SYNC` and receives only the updates it is missing, plus everyone's cursors. Edits made while offline are sent back the same way.
5. As users type, each change becomes a small `YJS_UPDATE` that the server applies and relays. Cursor changes travel as `YJS_AWARENESS`. The selected language lives in the same shared document.
6. Clicking Run calls `POST /api/codesync/compile`. The server forwards to JDoodle and emits `OUTPUT_CHANGE` to the room.
7. When users leave or disconnect, their cursor is removed and `DISCONNECTED` updates the roster. When the last user leaves, the document is saved and unloaded.

**Persistence.** A room is checkpointed after 2 seconds without edits (at most every 10 seconds during continuous typing), written once more when the last user leaves, and flushed for every open room on `SIGTERM` and `SIGINT`. A room that fails to load is never saved, so a database error cannot overwrite stored content with an empty document. If the database is unreachable while a room is live, editing keeps working from memory and the save is retried every 5 seconds. Room state is held by a single process, so running several instances would need room-sticky routing or a pub/sub layer.

For a deeper walkthrough with a Q&A section, see [ARCHITECTURE.md](ARCHITECTURE.md).

## 8) CodeRace

A real-time multiplayer coding race. Two players join a room, ready up, receive the same problem, and race to pass every test. The first to pass wins.

- **Match modes:** 1v1 rooms with timed formats (Bullet, Blitz, Rapid, Zen, or custom), and a solo practice mode. Difficulty and company filters choose the problem.
- **Ranking:** when both players are signed in, the result updates their ELO through a Supabase function, and the leaderboard shows the top players.
- **Execution:** code is wrapped in a test harness and run through OneCompiler on RapidAPI. Submissions are rate limited. The editor lists C++, Java and Python, but the harness that checks a submission is implemented for C++ only so far, so the other languages return an error for now.
- **AI review:** after a match, Gemini gives a short review of the player's code.
- **Auth:** Supabase email and password sign-in.

The Supabase schema (the `rooms`, `room_participants`, `problems`, `users` and `match_history` tables, and the `finalize_match` and `update_user_match_stats` functions) is not part of this repository and must exist in your Supabase project. The `csv_files`, `harnesss`, and seeder scripts under `server/coderace/` are one-off tooling used to build the problem set. They are not loaded by the server.

## 9) Credits and Licenses

CodeRace is copyright (c) 2026 Himanshu Sharma and is included under the MIT License. See [licenses/CODERACE-LICENSE](licenses/CODERACE-LICENSE).
