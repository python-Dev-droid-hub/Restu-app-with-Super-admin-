import io from 'socket.io-client';
import type { Socket } from 'socket.io-client';

let socket: Socket | null = null;

const SOCKET_URL = __DEV__
  ? 'http://192.168.0.140:3000' // replace with your server IP
  : 'https://your-production-api.com';

const RECONNECT_TIMEOUT = 5000;
const HEARTBEAT_INTERVAL = 30000;

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

  console.log('[Socket] Initializing connection...', SOCKET_URL);

  socket = io(SOCKET_URL, {
    reconnection: true,
    reconnectionDelay: RECONNECT_TIMEOUT,
    reconnectionDelayMax: 10000,
    reconnectionAttempts: 5,
    transports: ['websocket', 'polling'],
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
    console.error('[Socket] Connection error:', error);
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
