/**
 * Real-time layer (Socket.IO): live notifications, dashboard refresh, order updates.
 */
import io from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { api } from '../components/api/client';

let socket: Socket | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

const HEARTBEAT_INTERVAL = 30000;
const SOCKET_CONNECT_TIMEOUT = 15000;

type QueuedEvent = { event: string; payload: unknown };
const eventQueue: QueuedEvent[] = [];
const MAX_QUEUE = 50;

type ConnectionListener = (connected: boolean) => void;
const connectionListeners = new Set<ConnectionListener>();

const getSocketUrl = () => api.getBaseURL().replace(/\/?api\/?$/, '');

const notifyConnection = (connected: boolean) => {
  connectionListeners.forEach((fn) => {
    try {
      fn(connected);
    } catch {
      /* ignore */
    }
  });
};

const flushEventQueue = () => {
  if (!socket?.connected || eventQueue.length === 0) return;
  while (eventQueue.length > 0) {
    const item = eventQueue.shift();
    if (!item) break;
    socket.emit(item.event, item.payload);
  }
};

const startHeartbeat = () => {
  stopHeartbeat();
  heartbeatInterval = setInterval(() => {
    if (socket?.connected) socket.emit('ping');
  }, HEARTBEAT_INTERVAL);
};

const stopHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
};

export const onSocketConnectionChange = (listener: ConnectionListener) => {
  connectionListeners.add(listener);
  listener(socket?.connected || false);
  return () => connectionListeners.delete(listener);
};

export const initializeSocket = (userId: string, userRole: string, token?: string) => {
  if (socket?.connected) return socket;

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  const socketUrl = getSocketUrl();

  socket = io(socketUrl, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    reconnectionAttempts: Infinity,
    randomizationFactor: 0.5,
    transports: ['websocket'],
    path: '/socket.io',
    timeout: SOCKET_CONNECT_TIMEOUT,
    auth: token ? { token } : undefined,
    query: { userId, userRole },
  });

  socket.on('connect', () => {
    notifyConnection(true);
    socket?.emit('user_join', { userId, role: userRole });
    startHeartbeat();
    flushEventQueue();
  });

  socket.on('disconnect', () => {
    notifyConnection(false);
    stopHeartbeat();
  });

  socket.on('connect_error', (error: unknown) => {
    if (__DEV__) console.error('[Socket] connect_error', error);
    notifyConnection(false);
  });

  socket.io.on('reconnect', () => {
    flushEventQueue();
  });

  socket.on('pong', () => {});

  return socket;
};

export const joinSocketRooms = (options?: { tableIds?: string[] }) => {
  if (!socket?.connected) {
    if (eventQueue.length < MAX_QUEUE) {
      eventQueue.push({ event: 'user_join', payload: options || {} });
    }
    return;
  }
  socket.emit('user_join', options || {});
};

export const emitSocketEvent = (event: string, payload?: unknown) => {
  if (socket?.connected) {
    socket.emit(event, payload);
    return;
  }
  if (eventQueue.length < MAX_QUEUE) {
    eventQueue.push({ event, payload });
  }
};

export const disconnectSocket = () => {
  if (socket) {
    stopHeartbeat();
    socket.disconnect();
    socket = null;
    notifyConnection(false);
  }
};

export const getSocket = () => socket;
export const isSocketConnected = () => Boolean(socket?.connected);

export const subscribeToNotifications = (callback: (notification: unknown) => void) => {
  if (!socket) return;
  const handler = (payload: unknown) => callback(payload);
  socket.off('notification');
  socket.off('notification:new');
  socket.on('notification', handler);
  socket.on('notification:new', handler);
};

export const unsubscribeFromNotifications = () => {
  socket?.off('notification');
  socket?.off('notification:new');
};

export const ORDER_SOCKET_EVENTS = [
  'order:created',
  'order:updated',
  'order:assigned',
  'order:cancelled',
  'order:status_updated',
] as const;

export type OrderSocketEvent = (typeof ORDER_SOCKET_EVENTS)[number];

export const subscribeToOrderEvents = (handler: (event: OrderSocketEvent, payload: unknown) => void) => {
  if (!socket) return () => undefined;
  const wrappers = ORDER_SOCKET_EVENTS.map((eventName) => {
    const wrapped = (payload: unknown) => handler(eventName, payload);
    socket!.on(eventName, wrapped);
    return { eventName, wrapped };
  });
  return () => {
    wrappers.forEach(({ eventName, wrapped }) => socket?.off(eventName, wrapped));
  };
};
