import type { CorsOptions } from 'cors';
import { logger } from '@/utils/logger';

const LOCAL_DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5178',
  'http://localhost:5179',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:5176',
  'http://127.0.0.1:5177',
  'http://127.0.0.1:5178',
  'http://127.0.0.1:5179',
  'http://localhost:3000',
  'http://localhost:3001',
];

function parseHostname(url?: string): string | null {
  if (!url?.trim()) return null;
  try {
    return new URL(url.trim()).hostname;
  } catch {
    return null;
  }
}

function collectAllowedOrigins(): string[] {
  const origins = [...LOCAL_DEV_ORIGINS];

  const fromEnv = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  origins.push(...fromEnv);

  for (const key of ['FRONTEND_URL', 'WEB_URL', 'VITE_APP_URL'] as const) {
    const value = process.env[key]?.trim();
    if (value) origins.push(value);
  }

  return [...new Set(origins)];
}

function getServerHostname(): string | null {
  return (
    parseHostname(process.env.SERVER_URL) ||
    parseHostname(process.env.PUBLIC_URL) ||
    parseHostname(process.env.API_PUBLIC_URL)
  );
}

/** True when the browser origin is on the same host as SERVER_URL (any port). */
export function isSameServerHostOrigin(origin: string): boolean {
  const serverHost = getServerHostname();
  if (!serverHost) return false;
  try {
    return new URL(origin).hostname === serverHost;
  } catch {
    return false;
  }
}

export function isOriginAllowed(origin: string | undefined, isProduction: boolean): boolean {
  if (!origin) return true;

  const allowedOrigins = collectAllowedOrigins();
  if (allowedOrigins.includes(origin)) return true;

  if (!isProduction) return true;

  if (isSameServerHostOrigin(origin)) return true;

  return false;
}

export function buildCorsOptions(isProduction: boolean): CorsOptions {
  return {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin, isProduction)) {
        callback(null, true);
        return;
      }
      logger.warn(`CORS blocked origin: ${origin || '(none)'}`);
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  };
}

type SocketCorsOriginFn = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
) => void;

export function buildSocketCorsOrigin(isProduction: boolean): boolean | SocketCorsOriginFn {
  if (!isProduction) return true;

  return (origin, callback) => {
    if (isOriginAllowed(origin, isProduction)) {
      callback(null, true);
      return;
    }
    logger.warn(`Socket CORS blocked origin: ${origin || '(none)'}`);
    callback(new Error('Not allowed by CORS'), false);
  };
}
