import { useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSocket, initializeSocket } from '../services/realtimeService';
import { useDebouncedCallback } from './useDebouncedCallback';

interface UseAdminOrdersRealtimeOptions {
  branchId?: string;
  limit?: number;
  enabled?: boolean;
  onData: (orders: unknown[]) => void;
  onError?: (message: string) => void;
}

export function useAdminOrdersRealtime({
  branchId,
  limit = 200,
  enabled = true,
  onData,
  onError,
}: UseAdminOrdersRealtimeOptions) {
  const onDataRef = useRef(onData);
  const onErrorRef = useRef(onError);
  const listenersReadyRef = useRef(false);

  onDataRef.current = onData;
  onErrorRef.current = onError;

  const emitOrdersRequest = useCallback(
    (socket: NonNullable<ReturnType<typeof getSocket>>) => {
      socket.emit('admin_orders:get', {
        branchId: branchId && branchId !== 'all' ? branchId : undefined,
        limit,
      });
    },
    [branchId, limit]
  );

  const requestOrders = useCallback(() => {
    const socket = getSocket();
    if (!socket?.connected || !listenersReadyRef.current) return false;
    emitOrdersRequest(socket);
    return true;
  }, [emitOrdersRequest]);

  const debouncedRequest = useDebouncedCallback(requestOrders, 1500);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const onOrdersData = (payload: { orders?: unknown[] }) => {
      if (Array.isArray(payload?.orders)) {
        onDataRef.current(payload.orders);
      }
    };

    const onOrdersError = (payload: { message?: string }) => {
      onErrorRef.current?.(payload?.message || 'Failed to load orders');
    };

    const onNotification = (notification: { type?: string }) => {
      const type = String(notification?.type || '').toUpperCase();
      if (type.includes('ORDER') || type.includes('PAYMENT')) {
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

      socket.on('admin_orders:data', onOrdersData);
      socket.on('admin_orders:error', onOrdersError);
      socket.on('notification', onNotification);
      listenersReadyRef.current = true;

      const emitWhenReady = () => emitOrdersRequest(socket);

      if (socket.connected) emitWhenReady();
      else socket.once('connect', emitWhenReady);
    };

    void setup();

    return () => {
      cancelled = true;
      listenersReadyRef.current = false;
      const socket = getSocket();
      if (!socket) return;
      socket.off('admin_orders:data', onOrdersData);
      socket.off('admin_orders:error', onOrdersError);
      socket.off('notification', onNotification);
    };
  }, [branchId, debouncedRequest, enabled, emitOrdersRequest]);

  return { refresh: requestOrders };
}
