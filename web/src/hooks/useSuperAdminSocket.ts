import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getSuperAdminToken } from '../utils/superAdminAuthStorage';
import { resolveApiOrigin } from '../utils/resolveApiBaseUrl';

export function useSuperAdminSocket(onRefresh?: () => void) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = getSuperAdminToken();
    if (!token) return;

    const origin = resolveApiOrigin();
    const socket = io(origin, {
      auth: { superAdminToken: token },
      transports: ['websocket', 'polling'],
    });

    socket.on('tenant:launched', () => onRefresh?.());
    socket.on('dashboard:refresh', () => onRefresh?.());

    socketRef.current = socket;
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [onRefresh]);

  return socketRef;
}
