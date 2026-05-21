import { getAuthToken } from './authStorage';
import { resolveSocketUrl } from './resolveSocketUrl';

/** Shared Socket.IO client options (production proxy + auth). */
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
