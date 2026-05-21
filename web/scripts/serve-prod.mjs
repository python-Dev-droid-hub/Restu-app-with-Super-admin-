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

// http-proxy strips the `/api` mount prefix — rewrite it back for Express routes on :3101
const apiProxy = createProxyMiddleware({
  target: apiTarget,
  changeOrigin: true,
  ws: true,
  pathRewrite: (path) => {
    const p = path.startsWith('/') ? path : `/${path}`;
    if (p === '/health' || p === '/api/health') return '/health';
    return p.startsWith('/api') ? p : `/api${p}`;
  },
});

app.use('/api', apiProxy);
app.use(
  '/uploads',
  createProxyMiddleware({
    target: apiTarget,
    changeOrigin: true,
    pathRewrite: (path) => `/uploads${path.startsWith('/') ? path : `/${path}`}`,
  })
);
// Socket.IO lives at /socket.io on the API — do NOT prefix /api
const socketProxy = createProxyMiddleware({
  target: apiTarget,
  changeOrigin: true,
  ws: true,
});

app.use('/socket.io', socketProxy);

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
server.on('upgrade', socketProxy.upgrade);

async function verifyBackend() {
  try {
    const res = await fetch(`${apiTarget.replace(/\/$/, '')}/health`, {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      console.log(`[web] Backend OK at ${apiTarget}`);
      return true;
    }
    console.error(`[web] Backend returned ${res.status} at ${apiTarget}/health`);
  } catch (err) {
    console.error(`[web] Backend NOT reachable at ${apiTarget}`);
    console.error('[web] Start API: cd server && npm start  (or docker compose up -d server)');
    console.error('[web] Docker web container must use VITE_PROXY_TARGET=http://server:3101');
    console.error('[web] Bare VPS web must use VITE_PROXY_TARGET=http://127.0.0.1:3101');
    if (err?.message) console.error(`[web] ${err.message}`);
  }
  return false;
}

server.listen(port, host, async () => {
  console.log(`[web] listening on ${host}:${port} (public: http://<your-vps-ip>:${port})`);
  console.log(`[web] API proxy → ${apiTarget}`);
  console.log(`[web] Socket.IO proxy → ${apiTarget}/socket.io`);
  console.log(`[web] health → http://<your-vps-ip>:${port}/api/health`);
  await verifyBackend();
});
