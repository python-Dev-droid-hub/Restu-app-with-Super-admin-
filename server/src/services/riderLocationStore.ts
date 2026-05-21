import { logger } from '@/utils/logger';

export type RiderLocationRecord = {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
};

const TTL_MS = 60_000;
const store = new Map<string, RiderLocationRecord>();
const lastUpdateAt = new Map<string, number>();
const MIN_UPDATE_INTERVAL_MS = 5_000;

/** In-memory store (Redis-compatible API). Set REDIS_URL later to swap implementation. */
export function setRiderLocation(
  riderId: string,
  latitude: number,
  longitude: number,
  accuracy?: number
): RiderLocationRecord {
  const now = Date.now();
  const last = lastUpdateAt.get(riderId) || 0;
  if (now - last < MIN_UPDATE_INTERVAL_MS) {
    const existing = store.get(riderId);
    if (existing) return existing;
  }

  const record: RiderLocationRecord = {
    latitude,
    longitude,
    timestamp: now,
    accuracy,
  };
  store.set(riderId, record);
  lastUpdateAt.set(riderId, now);
  return record;
}

export function getRiderLocation(riderId: string): RiderLocationRecord | null {
  const record = store.get(riderId);
  if (!record) return null;
  if (Date.now() - record.timestamp > TTL_MS) {
    store.delete(riderId);
    return null;
  }
  return record;
}

export function isLocationFresh(riderId: string, maxAgeMs = 30_000): boolean {
  const record = getRiderLocation(riderId);
  if (!record) return false;
  return Date.now() - record.timestamp <= maxAgeMs;
}

/** Reject impossible jumps (> 200 km/h between updates). */
export function isPlausibleMovement(
  riderId: string,
  latitude: number,
  longitude: number
): boolean {
  const prev = store.get(riderId);
  if (!prev) return true;
  const elapsedSec = (Date.now() - prev.timestamp) / 1000;
  if (elapsedSec < 1) return true;
  const dist = Math.sqrt(
    Math.pow((latitude - prev.latitude) * 111_000, 2) +
      Math.pow((longitude - prev.longitude) * 111_000 * Math.cos((latitude * Math.PI) / 180), 2)
  );
  const speedMps = dist / elapsedSec;
  if (speedMps > 60) {
    logger.warn(`[riderLocation] Suspicious movement rider=${riderId} speed=${speedMps.toFixed(1)}m/s`);
    return false;
  }
  return true;
}
