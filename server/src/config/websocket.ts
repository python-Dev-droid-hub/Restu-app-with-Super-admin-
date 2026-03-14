import { createServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Express } from 'express';

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

  io.on('connection', (socket: Socket) => {
    console.log(`[WebSocket] User connected: ${socket.id}`);

    socket.on('user_join', (data: { userId: string; role: string }) => {
      const user: ConnectedUser = {
        socketId: socket.id,
        userId: data.userId,
        role: data.role,
        connectedAt: new Date(),
      };

      connectedUsers.set(socket.id, user);
      socket.join(`user_${data.userId}`);
      socket.join(`role_${data.role}`);

      console.log(
        `[WebSocket] User ${data.userId} (${data.role}) joined. Total: ${connectedUsers.size}`
      );
    });

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
    console.log(`[WebSocket] Notification sent to user ${recipientId}:`, notificationData);
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
    console.log(`[WebSocket] Notification sent to role ${role}:`, notificationData);
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
