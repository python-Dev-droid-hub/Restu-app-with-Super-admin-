import { useEffect, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSocket, initializeSocket, ORDER_SOCKET_EVENTS } from '../services/realtimeService';

const DEFAULT_MATCH_TYPES = [
  'ORDER',
  'PAYMENT',
  'DEAL',
  'DELIVERY',
  'RIDER',
  'KITCHEN',
  'WAITER',
  'NOTIFICATION',
];

const DEFAULT_DEBOUNCE_MS = 2000;

type SocketEventBinding = {
  event: string;
  handler?: (...args: unknown[]) => void;
};

/**
 * Re-run `onRefresh` when Socket.IO pushes relevant events (debounced — not HTTP polling).
 */
export function useRealtimeRefresh(
  onRefresh: () => void,
  options?: {
    enabled?: boolean;
    matchTypes?: string[];
    socketEvents?: SocketEventBinding[];
    debounceMs?: number;
  }
) {
  const onRefreshRef = useRef(onRefresh);
  const socketEventsRef = useRef(options?.socketEvents);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRunRef = useRef(0);

  onRefreshRef.current = onRefresh;
  socketEventsRef.current = options?.socketEvents;

  const matchKey = useMemo(
    () => JSON.stringify(options?.matchTypes ?? null),
    [options?.matchTypes]
  );

  const debounceMs = options?.debounceMs ?? DEFAULT_DEBOUNCE_MS;

  const scheduleRefresh = () => {
    const now = Date.now();
    const elapsed = now - lastRunRef.current;

    const run = () => {
      lastRunRef.current = Date.now();
      onRefreshRef.current();
    };

    if (elapsed >= debounceMs) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      run();
      return;
    }

    if (debounceTimerRef.current) return;

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      run();
    }, debounceMs - elapsed);
  };

  useEffect(() => {
    if (options?.enabled === false) return;

    let cancelled = false;
    const cleanups: Array<() => void> = [];

    const setup = async () => {
      const stored = await AsyncStorage.getItem('userData');
      const { getAccessToken } = await import('../utils/secureAuthStorage');
      const token = await getAccessToken();
      if (!stored || cancelled) return;

      const user = JSON.parse(stored);
      const userId = user?._id || user?.id;
      const role = user?.role;
      if (!userId || !role) return;

      const socket = initializeSocket(String(userId), String(role), token || undefined);
      if (!socket || cancelled) return;

      const matchTypes =
        options?.matchTypes ?? (JSON.parse(matchKey) as string[] | null) ?? DEFAULT_MATCH_TYPES;

      const onNotification = (notification?: { type?: string }) => {
        const type = String(notification?.type || '').toUpperCase();
        if (!notification || matchTypes.some((token) => type.includes(token))) {
          scheduleRefresh();
        }
      };

      socket.on('notification', onNotification);
      cleanups.push(() => socket.off('notification', onNotification));

      const orderRefreshHandler = () => scheduleRefresh();
      for (const eventName of ORDER_SOCKET_EVENTS) {
        socket.on(eventName, orderRefreshHandler);
        cleanups.push(() => socket.off(eventName, orderRefreshHandler));
      }

      for (const binding of socketEventsRef.current || []) {
        const handler =
          binding.handler ||
          (() => {
            scheduleRefresh();
          });
        socket.on(binding.event, handler);
        cleanups.push(() => socket.off(binding.event, handler));
      }
    };

    void setup();

    return () => {
      cancelled = true;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [options?.enabled, matchKey, debounceMs]);
}

export function emitChefDashboardGet(): void {
  getSocket()?.emit('chef_dashboard:get');
}

export function emitWaiterDashboardGet(): void {
  getSocket()?.emit('waiter_dashboard:get');
}

export function emitAdminOrdersGet(params?: { branchId?: string; limit?: number }): void {
  getSocket()?.emit('admin_orders:get', params);
}

export function emitRiderDashboardGet(): void {
  getSocket()?.emit('rider_dashboard:get');
}
