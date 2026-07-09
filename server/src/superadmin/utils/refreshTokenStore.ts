import Redis from 'ioredis';
import { logger } from '@/utils/logger';

const memoryStore = new Map<string, { token: string; expiresAt: number }>();
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    redis = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
    redis.on('error', (err) => logger.warn('[SuperAdmin Redis]', err.message));
    void redis.connect().catch(() => {
      redis = null;
    });
    return redis;
  } catch {
    return null;
  }
}

function cleanupMemory() {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.expiresAt <= now) memoryStore.delete(key);
  }
}

function key(superAdminId: string) {
  return `superadmin:refresh:${superAdminId}`;
}

export async function setRefreshToken(
  superAdminId: string,
  token: string,
  ttlMs: number
): Promise<void> {
  const k = key(superAdminId);
  const client = getRedis();
  if (client) {
    try {
      await client.set(k, token, 'PX', ttlMs);
      return;
    } catch {
      logger.warn('[SuperAdmin] Redis set failed, using memory fallback');
    }
  }
  cleanupMemory();
  memoryStore.set(k, { token, expiresAt: Date.now() + ttlMs });
}

export async function getRefreshToken(superAdminId: string): Promise<string | null> {
  const k = key(superAdminId);
  const client = getRedis();
  if (client) {
    try {
      const val = await client.get(k);
      if (val) return val;
    } catch {
      logger.warn('[SuperAdmin] Redis get failed, using memory fallback');
    }
  }
  cleanupMemory();
  const entry = memoryStore.get(k);
  if (!entry || entry.expiresAt <= Date.now()) {
    memoryStore.delete(k);
    return null;
  }
  return entry.token;
}

export async function deleteRefreshToken(superAdminId: string): Promise<void> {
  const k = key(superAdminId);
  const client = getRedis();
  if (client) {
    try {
      await client.del(k);
    } catch {
      /* ignore */
    }
  }
  memoryStore.delete(k);
}
