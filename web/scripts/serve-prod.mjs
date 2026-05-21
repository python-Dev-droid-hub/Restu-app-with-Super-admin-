/**
 * Production web server: static files + proxy /api, /uploads, /socket.io → backend.
 * Usage: VITE_PROXY_TARGET=http://127.0.0.1:3101 node scripts/serve-prod.mjs
 */
import express from 'express';
import http from 'http';
import { createProxyMiddleware } from 'http-proxy-middleware';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

const envFile = path.join(rootDir, '.env.production');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq > 0) {
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const apiTarget = process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:3101';
const port = Number(process.env.PORT || 5175);
const host = process.env.HOST || '0.0.0.0';

const app = express();

/** Do NOT use app.use('/socket.io', proxy) — Express strips the prefix and the API sees /?EIO=4 → 404. */
const socketProxy = createProxyMiddleware({
  target: apiTarget,
  changeOrigin: true,
  ws: true,
  pathFilter: (pathname) => pathname.startsWith('/socket.io'),
});

const apiProxy = createProxyMiddleware({
  target: apiTarget,
  changeOrigin: true,
  ws: true,
  pathFilter: (pathname) => pathname.startsWith('/api'),
});

const uploadsProxy = createProxyMiddleware({
  target: apiTarget,
  changeOrigin: true,
  pathFilter: (pathname) => pathname.startsWith('/uploads'),
});

app.use(socketProxy);
app.use(apiProxy);
app.use(uploadsProxy);

app.use(express.static(distDir, { index: false, fallthrough: true }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'web', port });
});

app.get(/^(?!\/api|\/uploads|\/socket\.io).*/, (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error(`[web] Missing ${path.join(distDir, 'index.html')} — run: pnpm build`);
  process.exit(1);
}

const server = http.createServer(app);

server.on('upgrade', (req, socket, head) => {
  const pathname = (req.url || '').split('?')[0];
  if (pathname.startsWith('/socket.io')) {
    socketProxy.upgrade(req, socket, head);
  }
});

async function verifyBackend() {
  const base = apiTarget.replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      console.error(`[web] Backend returned ${res.status} at ${base}/health`);
      return false;
    }
    console.log(`[web] Backend OK at ${apiTarget}`);
  } catch (err) {
    console.error(`[web] Backend NOT reachable at ${apiTarget}`);
    console.error('[web] Start API: cd server && npm start  (or docker compose up -d server)');
    console.error('[web] Docker web must use VITE_PROXY_TARGET=http://server:3101');
    console.error('[web] Bare VPS web must use VITE_PROXY_TARGET=http://127.0.0.1:3101');
    if (err?.message) console.error(`[web] ${err.message}`);
    return false;
  }

  try {
    const pollUrl = `http://127.0.0.1:${port}/socket.io/?EIO=4&transport=polling`;
    const poll = await fetch(pollUrl, { signal: AbortSignal.timeout(8000) });
    const body = await poll.text();
    if (poll.status === 404 && body.includes('Route /?EIO')) {
      console.error(`[web] Socket.IO proxy still broken (API received stripped path)`);
      console.error('[web] Rebuild web: docker compose up -d --build web');
      return false;
    }
    if (poll.status === 404) {
      console.error(`[web] Socket.IO proxy 404 at ${pollUrl}`);
      return false;
    }
    console.log(`[web] Socket.IO proxy OK (${poll.status} via :${port}/socket.io)`);
  } catch (err) {
    console.warn(`[web] Socket.IO self-check skipped: ${err?.message || err}`);
  }
  return true;
}

server.listen(port, host, async () => {
  console.log(`[web] listening on ${host}:${port} (public: http://<your-vps-ip>:${port})`);
  console.log(`[web] API proxy → ${apiTarget}`);
  console.log(`[web] Socket.IO proxy → ${apiTarget}/socket.io (full path preserved)`);
  console.log(`[web] health → http://<your-vps-ip>:${port}/api/health`);
  await verifyBackend();
});
