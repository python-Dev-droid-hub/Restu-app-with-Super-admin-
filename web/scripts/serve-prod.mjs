/**
 * Production web server: static files + proxy /api, /uploads, /socket.io → backend.
 * Usage: VITE_PROXY_TARGET=http://127.0.0.1:3101 node scripts/serve-prod.mjs
 */
import express from 'express';
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
app.use('/socket.io', apiProxy);

app.use(express.static(distDir, { index: false, fallthrough: true }));

app.get(/^(?!\/api|\/uploads|\/socket\.io).*/, (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, host, () => {
  console.log(`[web] http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
  console.log(`[web] API proxy → ${apiTarget}`);
});
