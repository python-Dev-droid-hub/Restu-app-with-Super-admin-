import { useEffect, useMemo, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getSocketIoOptions, getSocketIoUrl } from '../utils/socketOptions';

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

let sharedSocket: Socket | null = null;

function getSharedSocket(): Socket {
  if (sharedSocket) return sharedSocket;

  sharedSocket = io(getSocketIoUrl(), getSocketIoOptions());

  return sharedSocket;
}

/**
 * Re-run `onRefresh` on Socket.IO notifications (debounced — not HTTP polling).
 */
export function useRealtimeRefresh(
  onRefresh: () => void,
  options?: {
    enabled?: boolean;
    matchTypes?: string[];
    socketEvents?: Array<{ event: string; handler?: (...args: unknown[]) => void }>;
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

    const socket = getSharedSocket();
    const matchTypes =
      options?.matchTypes ?? (JSON.parse(matchKey) as string[] | null) ?? DEFAULT_MATCH_TYPES;

    const onNotification = (notification?: { type?: string }) => {
      const type = String(notification?.type || '').toUpperCase();
      if (!notification || matchTypes.some((token) => type.includes(token))) {
        scheduleRefresh();
      }
    };

    socket.on('notification', onNotification);
    const onInvalidate = () => scheduleRefresh();
    socket.on('admin_dashboard:invalidate', onInvalidate);
    socket.on('admin_orders:invalidate', onInvalidate);
    socket.on('customer_home:invalidate', onInvalidate);
    socket.on('admin_deals:invalidate', onInvalidate);
    socket.on('order:created', onInvalidate);
    socket.on('order:updated', onInvalidate);
    socket.on('order:status_updated', onInvalidate);

    const extraCleanups: Array<() => void> = [];
    for (const binding of socketEventsRef.current || []) {
      const handler =
        binding.handler ||
        (() => {
          scheduleRefresh();
        });
      socket.on(binding.event, handler);
      extraCleanups.push(() => socket.off(binding.event, handler));
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      socket.off('notification', onNotification);
      socket.off('admin_dashboard:invalidate', onInvalidate);
      socket.off('admin_orders:invalidate', onInvalidate);
      socket.off('customer_home:invalidate', onInvalidate);
      socket.off('admin_deals:invalidate', onInvalidate);
      socket.off('order:created', onInvalidate);
      socket.off('order:updated', onInvalidate);
      socket.off('order:status_updated', onInvalidate);
      extraCleanups.forEach((cleanup) => cleanup());
    };
  }, [options?.enabled, matchKey, debounceMs]);
}

export function emitAdminDashboardGet(params?: {
  period?: string;
  branchId?: string;
  limit?: number;
}): void {
  getSharedSocket().emit('admin_dashboard:get', {
    period: params?.period || 'day',
    branchId: params?.branchId,
    limit: params?.limit ?? 50,
  });
}

export function emitRiderDashboardGet(): void {
  getSharedSocket().emit('rider_dashboard:get');
}

export function getRealtimeSocket(): Socket {
  return getSharedSocket();
}
