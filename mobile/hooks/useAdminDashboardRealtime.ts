import { useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSocket, initializeSocket } from '../services/realtimeService';
import { useDebouncedCallback } from './useDebouncedCallback';

export interface AdminDashboardPayload {
  stats: Record<string, unknown> | null;
  orders: unknown[];
  ordersTotal?: number;
  unreadCount?: number;
  waitersPerformance?: unknown;
  ridersPerformance?: unknown;
  branchesPerformance?: unknown;
  recentProducts?: unknown[];
  timestamp?: string;
}

interface UseAdminDashboardRealtimeOptions {
  period: string;
  branchId?: string;
  limit?: number;
  enabled?: boolean;
  onData: (payload: AdminDashboardPayload) => void;
  onError?: (message: string) => void;
}

export function useAdminDashboardRealtime({
  period,
  branchId,
  limit = 10,
  enabled = true,
  onData,
  onError,
}: UseAdminDashboardRealtimeOptions) {
  const onDataRef = useRef(onData);
  const onErrorRef = useRef(onError);

  onDataRef.current = onData;
  onErrorRef.current = onError;

  const requestDashboard = useCallback(() => {
    const socket = getSocket();
    if (!socket?.connected) return false;
    socket.emit('admin_dashboard:get', {
      period,
      branchId: branchId && branchId !== 'all' ? branchId : undefined,
      limit,
    });
    return true;
  }, [branchId, limit, period]);

  const debouncedRequest = useDebouncedCallback(requestDashboard, 1500);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const ensureSocket = async () => {
      const stored = await AsyncStorage.getItem('userData');
      const { getAccessToken } = await import('../utils/secureAuthStorage');
      const token = await getAccessToken();
      if (!stored || cancelled) return null;

      const user = JSON.parse(stored);
      const userId = user?._id || user?.id;
      const userRole = user?.role;
      if (!userId || !userRole) return null;

      return initializeSocket(String(userId), String(userRole), token || undefined);
    };

    const onDashboardData = (payload: AdminDashboardPayload) => {
      onDataRef.current(payload);
    };

    const onDashboardError = (payload: { message?: string }) => {
      onErrorRef.current?.(payload?.message || 'Failed to load dashboard');
    };

    const onNotification = (notification: { type?: string }) => {
      const type = String(notification?.type || '').toUpperCase();
      if (type.includes('ORDER') || type.includes('PAYMENT') || type.includes('DEAL')) {
        debouncedRequest();
      }
    };

    const setup = async () => {
      const socket = (await ensureSocket()) || getSocket();
      if (!socket || cancelled) return;

      const emitWhenReady = () => {
        socket.emit('admin_dashboard:get', {
          period,
          branchId: branchId && branchId !== 'all' ? branchId : undefined,
          limit,
        });
      };

      socket.on('admin_dashboard:data', onDashboardData);
      socket.on('admin_dashboard:error', onDashboardError);
      socket.on('notification', onNotification);

      if (socket.connected) {
        emitWhenReady();
      } else {
        socket.once('connect', emitWhenReady);
      }
    };

    void setup();

    return () => {
      cancelled = true;
      const socket = getSocket();
      if (!socket) return;
      socket.off('admin_dashboard:data', onDashboardData);
      socket.off('admin_dashboard:error', onDashboardError);
      socket.off('notification', onNotification);
    };
  }, [branchId, debouncedRequest, enabled, limit, period, requestDashboard]);

  return { refresh: requestDashboard };
}
