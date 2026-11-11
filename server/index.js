import './config/env.js';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { Server } from 'socket.io';
import { mountCodeSync } from './codesync/index.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const clientsDir = path.join(currentDir, '..', 'clients');

const PORT = process.env.PORT || 5000;
const SHUTDOWN_TIMEOUT_MS = 10000;

const parseList = (value) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const allowedOrigins = [
  'http://localhost:3000', // CodeSync dev server
  'http://127.0.0.1:3000',
  'http://localhost:5173', // CodeRace dev server
  'http://localhost:5174',
  ...parseList(process.env.CLIENT_ORIGIN),
  ...parseList(process.env.CLIENT_URL),
];

// Same-origin requests and non-browser clients send no Origin header. In production
// every client is served by this server, so CORS only matters for the dev servers.
const corsOrigin = (origin, callback) =>
  callback(null, !origin || allowedOrigins.includes(origin));

const isRaceConfigured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);

const LANDING_DIR = path.join(clientsDir, 'landing', 'dist');

const FRONTENDS = [
  { name: 'CodeSync', mount: '/codesync', dir: path.join(clientsDir, 'codesync', 'build') },
  { name: 'CodeRace', mount: '/coderace', dir: path.join(clientsDir, 'coderace', 'dist') },
];

const app = express();
const server = http.createServer(app);

// Render terminates TLS in front of one proxy. Without this every user shares the
// proxy's IP, and the per-IP rate limits would apply to everyone at once.
app.set('trust proxy', 1);

const io = new Server(server, {
  cors: { origin: corsOrigin, methods: ['GET', 'POST'], credentials: true },
});

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '100kb' }));
// Security headers for the JSON API only. The pages load CDN scripts, fonts and avatars,
// which helmet's default CSP would block.
app.use('/api', helmet({ crossOriginEmbedderPolicy: false }));

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    apps: { codesync: true, coderace: isRaceConfigured },
  });
});

const mountCodeRaceOrExplain = async () => {
  if (!isRaceConfigured) {
    console.warn(
      'SUPABASE_URL or SUPABASE_SECRET_KEY is not set, CodeRace is disabled. CodeSync and the landing page still work.'
    );
    app.use(['/api/code', '/api/users', '/api/ai'], (req, res) => {
      res.status(503).json({ error: 'CodeRace is not configured on this server' });
    });
    return;
  }

  // Loaded lazily: the Supabase client throws on import when its credentials are missing.
  const { mountCodeRace } = await import('./coderace/index.js');
  mountCodeRace({ app, io });
};

// A missing asset must 404. Answering it with index.html makes the browser parse HTML as JS.
const sendIndex = (dir) => (req, res, next) => {
  if (path.extname(req.path)) return next();
  res.sendFile(path.join(dir, 'index.html'), (error) => {
    if (error) next();
  });
};

const mountFrontends = () => {
  if (!fs.existsSync(path.join(LANDING_DIR, 'index.html'))) {
    console.warn(`Landing page build not found in ${LANDING_DIR}. Run "npm run build" to create it.`);
  }
  app.use(express.static(LANDING_DIR));

  FRONTENDS.forEach(({ name, mount, dir }) => {
    if (!fs.existsSync(path.join(dir, 'index.html'))) {
      console.warn(`${name} build not found in ${dir}. Run "npm run build" to create it.`);
    }
    app.use(mount, express.static(dir));
    app.get(new RegExp(`^${mount}(/.*)?$`), sendIndex(dir));
  });

  app.use((req, res) => {
    const isPageRequest =
      req.method === 'GET' &&
      !req.path.startsWith('/api') &&
      !path.extname(req.path) &&
      req.accepts('html');
    if (isPageRequest) return res.redirect(302, '/');
    res.status(404).json({ error: 'Not found' });
  });
};

const start = async () => {
  const codesync = await mountCodeSync({ app, io });
  await mountCodeRaceOrExplain();
  mountFrontends();

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received, saving rooms before exit`);
    setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();

    try {
      await codesync.shutdown();
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
