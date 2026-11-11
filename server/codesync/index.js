import axios from 'axios';
import { ACTIONS } from './Actions.js';
import { setupCollab } from './collab/index.js';
import { createMongoRoomStore } from './collab/mongo-room-store.js';
import { createMemoryRoomStore } from './collab/memory-room-store.js';

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

const createRoomStore = async () => {
  if (!process.env.MONGODB_URI) {
    console.warn('MONGODB_URI is not set, CodeSync rooms are kept in memory and are lost on restart');
    return createMemoryRoomStore();
  }

  return createMongoRoomStore({
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB_NAME,
  });
};

const registerCompileRoute = (app, namespace) => {
  app.post('/api/codesync/compile', async (req, res) => {
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
        language,
        versionIndex: languageConfig[language].versionIndex,
        clientId: process.env.JDOODLE_CLIENT_ID,
        clientSecret: process.env.JDOODLE_CLIENT_SECRET,
      });

      const outputPayload =
        typeof response.data.output === 'string'
          ? response.data.output
          : JSON.stringify(response.data);

      if (roomId) {
        namespace.to(roomId).emit(ACTIONS.OUTPUT_CHANGE, { output: outputPayload });
      }

      res.json(response.data);
    } catch (error) {
      // The axios error object carries the request body, which includes the JDoodle secret.
      console.error('Compilation error:', error.message, error.response?.status ?? '');
      res.status(500).json({
        error: 'Failed to compile code',
        details: error.response?.data || error.message,
      });
    }
  });
};

/**
 * Mounts CodeSync: the `/collab` Socket.IO namespace (Yjs sync, cursors, presence)
 * and the compile endpoint. Resolves to a handle whose shutdown() saves every open
 * room and closes the store.
 */
export const mountCodeSync = async ({ app, io }) => {
  const store = await createRoomStore();
  const namespace = io.of('/collab');
  const collab = setupCollab(namespace, { store });
  registerCompileRoute(app, namespace);

  return {
    async shutdown() {
      await collab.shutdown();
      await store.close();
    },
  };
};
