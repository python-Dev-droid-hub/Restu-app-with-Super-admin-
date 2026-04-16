import { createServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Express } from 'express';
import { verifyAccessToken } from '@/utils/jwt';
import { User } from '@/models/User';

// Store connected users
interface ConnectedUser {
  socketId: string;
  userId: string;
  role: string;
  connectedAt: Date;
}

const connectedUsers = new Map<string, ConnectedUser>();

export const initWebSocket = (app: Express) => {
  const httpServer = createServer(app);

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.use(async (socket, next) => {
    try {
      const authToken = (socket.handshake.auth as any)?.token;
      const headerToken = socket.handshake.headers?.authorization?.toString().replace('Bearer ', '');
      const token = authToken || headerToken;

      if (!token) {
        return next(new Error('unauthorized'));
      }

      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId).select('_id role isActive');
      if (!user || !user.isActive) {
        return next(new Error('unauthorized'));
      }

      (socket.data as any).user = {
        userId: user._id.toString(),
        role: String(user.role || '').toUpperCase(),
      };

      next();
    } catch (e) {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[WebSocket] User connected: ${socket.id}`);

    const authed = (socket.data as any)?.user as { userId?: string; role?: string } | undefined;
    const userId = authed?.userId;
    const role = authed?.role;

    if (userId && role) {
      const user: ConnectedUser = {
        socketId: socket.id,
        userId,
        role,
        connectedAt: new Date(),
      };

      connectedUsers.set(socket.id, user);
      socket.join(`user_${userId}`);
      socket.join(`role_${role}`);
    }

    socket.on('user_join', () => {});

    socket.on('disconnect', () => {
      connectedUsers.delete(socket.id);
      console.log(`[WebSocket] User disconnected: ${socket.id}. Total: ${connectedUsers.size}`);
    });

    socket.on('ping', () => {
      socket.emit('pong');
    });
  });

  const sendNotification = (
    recipientId: string,
    notificationData: {
      type: string;
      title: string;
      message: string;
      data?: any;
    }
  ) => {
    io.to(`user_${recipientId}`).emit('notification', notificationData);
    console.log(`[WebSocket] Notification sent to user ${recipientId}:`, notificationData?.type);
  };

  const notifyByRole = (
    role: string,
    notificationData: {
      type: string;
      title: string;
      message: string;
      data?: any;
    }
  ) => {
    io.to(`role_${role}`).emit('notification', notificationData);
    console.log(`[WebSocket] Notification sent to role ${role}:`, notificationData?.type);
  };

  const broadcastNotification = (notificationData: any) => {
    io.emit('notification', notificationData);
    console.log('[WebSocket] Broadcast sent to all users');
  };

  const getOnlineUsers = () => connectedUsers.size;

  const getUsersByRole = (role: string) => {
    return Array.from(connectedUsers.values()).filter((u) => u.role === role).length;
  };

  return {
    io,
    httpServer,
    sendNotification,
    notifyByRole,
    broadcastNotification,
    getOnlineUsers,
    getUsersByRole,
  };
};
