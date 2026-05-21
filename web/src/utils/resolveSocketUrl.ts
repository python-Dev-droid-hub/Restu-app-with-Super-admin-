import { resolveApiOrigin } from './resolveApiBaseUrl';

/** Socket.IO server URL — same origin when API uses /api proxy. */
export function resolveSocketUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:3101';
  }
  return resolveApiOrigin();
}
