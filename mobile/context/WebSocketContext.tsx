import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initializeSocket,
  disconnectSocket,
  subscribeToNotifications,
  unsubscribeFromNotifications,
  isSocketConnected,
} from '../services/realtimeService';
import { handleNotificationByType } from '../services/notificationHandler';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: string;
}

interface WebSocketContextType {
  isConnected: boolean;
  notifications: Notification[];
  unreadCount: number;
  initializeWebSocket: (userId: string, userRole: string) => void;
  disconnectWebSocket: () => void;
  markNotificationAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  removeNotification: (id: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  notifications: [],
  unreadCount: 0,
  initializeWebSocket: () => {},
  disconnectWebSocket: () => {},
  markNotificationAsRead: () => {},
  markAllAsRead: () => {},
  clearNotifications: () => {},
  removeNotification: () => {},
});

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Check connection status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setIsConnected(isSocketConnected());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const initializeWebSocket = useCallback(async (userId: string, userRole: string) => {
    try {
      console.log('[WebSocketContext] Initializing socket for user:', userId, 'role:', userRole);
      
      // Initialize socket connection
      initializeSocket(userId, userRole);

      // Subscribe to notifications
      subscribeToNotifications((notification: any) => {
        console.log('[WebSocketContext] Received notification:', notification);

        // Add to notifications list
        const newNotification: Notification = {
          id: notification.id || Date.now().toString(),
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          read: false,
          createdAt: new Date().toISOString(),
        };

        setNotifications((prev) => [newNotification, ...prev]);

        // Handle notification by type (show toast, navigate, etc.)
        handleNotificationByType(notification);
      });

      console.log('[WebSocketContext] Socket initialized and subscribed');
    } catch (error) {
      console.error('[WebSocketContext] Error initializing socket:', error);
    }
  }, []);

  const disconnectWebSocket = useCallback(() => {
    console.log('[WebSocketContext] Disconnecting socket');
    unsubscribeFromNotifications();
    disconnectSocket();
    setIsConnected(false);
  }, []);

  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, read: true }))
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const value: WebSocketContextType = {
    isConnected,
    notifications,
    unreadCount,
    initializeWebSocket,
    disconnectWebSocket,
    markNotificationAsRead,
    markAllAsRead,
    clearNotifications,
    removeNotification,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
