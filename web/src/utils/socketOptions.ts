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
  };
}

export function getSocketIoUrl(): string {
  return resolveSocketUrl();
}
