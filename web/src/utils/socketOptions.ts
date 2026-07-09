import { getAuthToken } from './authStorage';
import { resolveSocketUrl } from './resolveSocketUrl';

/** Shared Socket.IO client options (production proxy + auth).
 *  `transports: ['polling', 'websocket']` is Socket.IO’s connection upgrade — not HTTP dashboard polling. */
export function getSocketIoOptions() {
  const token = getAuthToken() || '';
  return {
    path: '/socket.io',
    transports: ['polling', 'websocket'],
    withCredentials: true,
    auth: token ? { token } : undefined,
    reconnectionAttempts: 8,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    timeout: 15000,
  };
}

export function getSocketIoUrl(): string {
  return resolveSocketUrl();
}
