import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getSocket,
  initializeSocket,
  isSocketConnected,
  joinSocketRooms,
  onSocketConnectionChange,
  subscribeToOrderEvents,
  type OrderSocketEvent,
} from '../services/realtimeService';
import { getAccessToken } from '../utils/secureAuthStorage';

export type UseSocketOptions = {
  enabled?: boolean;
  tableIds?: string[];
  onOrderEvent?: (event: OrderSocketEvent, payload: unknown) => void;
};

export function useSocket(options: UseSocketOptions = {}) {
  const { enabled = true, tableIds, onOrderEvent } = options;
  const [connected, setConnected] = useState(isSocketConnected());
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const connect = async () => {
      setConnecting(true);
      try {
        const stored = await AsyncStorage.getItem('userData');
        const token = await getAccessToken();
        if (!stored || cancelled) return;

        const user = JSON.parse(stored);
        const userId = user?._id || user?.id;
        const role = user?.role;
        if (!userId || !role) return;

        initializeSocket(String(userId), String(role), token || undefined);
        joinSocketRooms({ tableIds });
      } finally {
        if (!cancelled) setConnecting(false);
      }
    };

    void connect();

    const unsubConn = onSocketConnectionChange((isConnected) => {
      if (!cancelled) setConnected(isConnected);
      if (isConnected && tableIds?.length) {
        joinSocketRooms({ tableIds });
      }
    });

    return () => {
      cancelled = true;
      unsubConn();
    };
  }, [enabled, JSON.stringify(tableIds)]);

  useEffect(() => {
    if (!enabled || !onOrderEvent) return;
    return subscribeToOrderEvents(onOrderEvent);
  }, [enabled, onOrderEvent]);

  const refreshWaiterDashboard = useCallback(() => {
    getSocket()?.emit('waiter_dashboard:get');
  }, []);

  const refreshChefDashboard = useCallback(() => {
    getSocket()?.emit('chef_dashboard:get');
  }, []);

  const refreshAdminOrders = useCallback((params?: { branchId?: string; limit?: number }) => {
    getSocket()?.emit('admin_orders:get', params);
  }, []);

  const refreshRiderDashboard = useCallback(() => {
    getSocket()?.emit('rider_dashboard:get');
  }, []);

  return {
    socket: getSocket(),
    connected,
    connecting,
    refreshWaiterDashboard,
    refreshChefDashboard,
    refreshAdminOrders,
    refreshRiderDashboard,
  };
}
