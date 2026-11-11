const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const ACTIONS = require('./Actions');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { setupCollab } = require('./collab');
const { createMongoRoomStore } = require('./collab/mongo-room-store');
const { createMemoryRoomStore } = require('./collab/memory-room-store');
const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000,https://codesync-hmt6.onrender.com')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);


const languageConfig = {
  python3: { versionIndex: '3' },
  java: { versionIndex: '3' },
  cpp: { versionIndex: '4' },
  nodejs: { versionIndex: '3' },
  c: { versionIndex: '4' },
  ruby: { versionIndex: '3' },
  go: { versionIndex: '3' },
  scala: { versionIndex: '3' },
  bash: { versionIndex: '3' },
  sql: { versionIndex: '3' },
  pascal: { versionIndex: '2' },
  csharp: { versionIndex: '3' },
  php: { versionIndex: '3' },
  swift: { versionIndex: '3' },
  rust: { versionIndex: '3' },
  r: { versionIndex: '3' },
};

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

app.post('/compile', async (req, res) => {
  const { code, language, roomId } = req.body;

  if (!code || !language) {
    return res.status(400).json({ error: 'Code and language are required' });
  }

  if (!languageConfig[language]) {
    return res.status(400).json({ error: 'Unsupported language' });
  }

  if (!process.env.JDOODLE_CLIENT_ID || !process.env.JDOODLE_CLIENT_SECRET) {
    return res.status(500).json({ error: 'Compilation service not configured' });
  }

  try {
    const response = await axios.post('https://api.jdoodle.com/v1/execute', {
      script: code,
      language: language,
      versionIndex: languageConfig[language].versionIndex,
      clientId: process.env.JDOODLE_CLIENT_ID,
      clientSecret: process.env.JDOODLE_CLIENT_SECRET,
    });

    const outputPayload =
      typeof response.data.output === 'string'
        ? response.data.output
        : JSON.stringify(response.data);

    if (roomId) {
      io.to(roomId).emit(ACTIONS.OUTPUT_CHANGE, {
        output: outputPayload,
      });
    }

    res.json(response.data);
  } catch (error) {
    console.error('Compilation error:', error);
    res.status(500).json({ 
      error: 'Failed to compile code',
      details: error.response?.data || error.message 
    });
  }
});

const PORT = process.env.PORT || 5000;
const SHUTDOWN_TIMEOUT_MS = 10000;
const buildPath = path.join(__dirname, '..', 'client', 'build');

app.use(express.static(buildPath));

app.get('*', (_, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

const createRoomStore = async () => {
  if (!process.env.MONGODB_URI) {
    console.warn('MONGODB_URI is not set, rooms are kept in memory and are lost on restart');
    return createMemoryRoomStore();
  }

  return createMongoRoomStore({
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB_NAME,
  });
};

const start = async () => {
  const store = await createRoomStore();
  const collab = setupCollab(io, { store });

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received, saving rooms before exit`);
    setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();

    try {
      await collab.shutdown();
      await store.close();
    } catch (error) {
      console.error('Shutdown failed:', error);
    }
    process.exit(0);
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
};

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
