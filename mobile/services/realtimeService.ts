import io from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { api } from '../components/api/client';

let socket: Socket | null = null;

const RECONNECT_TIMEOUT = 5000;
const HEARTBEAT_INTERVAL = 30000;
const SOCKET_CONNECT_TIMEOUT = 10000;

const getSocketUrl = () => {
  const apiBaseUrl = api.getBaseURL();
  return apiBaseUrl.replace(/\/?api\/?$/, '');
};

let heartbeatInterval: NodeJS.Timeout | null = null;

const startHeartbeat = () => {
  stopHeartbeat();
  heartbeatInterval = setInterval(() => {
    if (socket?.connected) {
      socket.emit('ping');
    }
  }, HEARTBEAT_INTERVAL);
};

const stopHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
};

export const initializeSocket = (userId: string, userRole: string) => {
  if (socket?.connected) {
    console.log('[Socket] Already connected');
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  const socketUrl = getSocketUrl();

  console.log('[Socket] Initializing connection...', socketUrl);

  socket = io(socketUrl, {
    reconnection: true,
    reconnectionDelay: RECONNECT_TIMEOUT,
    reconnectionDelayMax: 10000,
    reconnectionAttempts: 5,
    transports: ['polling', 'websocket'],
    path: '/socket.io',
    upgrade: true,
    forceNew: true,
    timeout: SOCKET_CONNECT_TIMEOUT,
    query: {
      userId,
      userRole,
    },
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
    socket?.emit('user_join', { userId, role: userRole });
    startHeartbeat();
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Disconnected');
    stopHeartbeat();
  });

  socket.on('connect_error', (error: unknown) => {
    console.error('[Socket] Connection error:', error, '| socketUrl:', socketUrl);
  });

  socket.io.on('reconnect_attempt', (attempt) => {
    console.log('[Socket] Reconnect attempt:', attempt, '| socketUrl:', socketUrl);
  });

  socket.on('pong', () => {
    // heartbeat ok
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    stopHeartbeat();
    socket.disconnect();
    socket = null;
    console.log('[Socket] Disconnected');
  }
};

export const getSocket = () => socket;

export const isSocketConnected = () => socket?.connected || false;

export const subscribeToNotifications = (callback: (notification: any) => void) => {
  if (socket) {
    socket.off('notification');
    socket.on('notification', callback);
  }
};

export const unsubscribeFromNotifications = () => {
  if (socket) {
    socket.off('notification');
  }
};
