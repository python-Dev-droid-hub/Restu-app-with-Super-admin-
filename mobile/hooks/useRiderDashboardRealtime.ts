import { useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSocket, initializeSocket } from '../services/realtimeService';
import { useDebouncedCallback } from './useDebouncedCallback';

export interface RiderDashboardPayload {
  stats?: Record<string, unknown>;
  earnings?: Record<string, unknown>;
  orders?: unknown[];
  availableOrders?: unknown[];
  notifications?: unknown[];
  unreadCount?: number;
  onDuty?: boolean;
  timestamp?: string;
}

interface UseRiderDashboardRealtimeOptions {
  enabled?: boolean;
  onData: (payload: RiderDashboardPayload) => void;
  onError?: (message: string) => void;
}

export function useRiderDashboardRealtime({
  enabled = true,
  onData,
  onError,
}: UseRiderDashboardRealtimeOptions) {
  const onDataRef = useRef(onData);
  const onErrorRef = useRef(onError);

  onDataRef.current = onData;
  onErrorRef.current = onError;

  const requestDashboard = useCallback(() => {
    const socket = getSocket();
    if (!socket?.connected) return false;
    socket.emit('rider_dashboard:get');
    return true;
  }, []);

  const debouncedRequest = useDebouncedCallback(requestDashboard, 2000);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const onDashboardData = (payload: RiderDashboardPayload) => {
      onDataRef.current(payload);
    };

    const onDashboardError = (payload: { message?: string }) => {
      onErrorRef.current?.(payload?.message || 'Failed to load rider dashboard');
    };

    const onNotification = (notification: { type?: string }) => {
      const type = String(notification?.type || '').toUpperCase();
      if (
        type.includes('ORDER') ||
        type.includes('DELIVERY') ||
        type.includes('RIDER') ||
        type.includes('PAYMENT')
      ) {
        debouncedRequest();
      }
    };

    const setup = async () => {
      const stored = await AsyncStorage.getItem('userData');
      const { getAccessToken } = await import('../utils/secureAuthStorage');
      const token = await getAccessToken();
      if (!stored || cancelled) return;

      const user = JSON.parse(stored);
      const userId = user?._id || user?.id;
      const userRole = user?.role;
      if (!userId || !userRole) return;

      const socket = initializeSocket(String(userId), String(userRole), token || undefined);
      if (!socket || cancelled) return;

      socket.on('rider_dashboard:data', onDashboardData);
      socket.on('rider_dashboard:error', onDashboardError);
      socket.on('notification', onNotification);

      const emitWhenReady = () => socket.emit('rider_dashboard:get');
      if (socket.connected) emitWhenReady();
      else socket.once('connect', emitWhenReady);
    };

    void setup();

    return () => {
      cancelled = true;
      const socket = getSocket();
      if (!socket) return;
      socket.off('rider_dashboard:data', onDashboardData);
      socket.off('rider_dashboard:error', onDashboardError);
      socket.off('notification', onNotification);
    };
  }, [debouncedRequest, enabled]);

  return { refresh: requestDashboard };
}
