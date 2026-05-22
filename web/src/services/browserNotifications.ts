import { getRealtimeSocket } from '../hooks/useRealtimeRefresh';

export type BrowserNotificationPayload = {
  id?: string;
  _id?: string;
  type?: string;
  title?: string;
  message?: string;
  body?: string;
  data?: Record<string, unknown>;
  orderId?: string;
  relatedOrderId?: string;
  actionUrl?: string;
};

const seenIds = new Set<string>();
const MAX_SEEN = 200;

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

function pruneSeen() {
  if (seenIds.size <= MAX_SEEN) return;
  const drop = seenIds.size - MAX_SEEN;
  let i = 0;
  for (const id of seenIds) {
    seenIds.delete(id);
    if (++i >= drop) break;
  }
}

function resolveTitleBody(payload: BrowserNotificationPayload): { title: string; body: string; id: string } {
  const title = String(payload.title || 'Restaurant App').trim() || 'Restaurant App';
  const body = String(payload.message || payload.body || '').trim() || 'You have a new notification';
  const id = String(
    payload.id || payload._id || payload.data?.notificationId || `${title}:${body}:${Date.now()}`
  );
  return { title, body, id };
}

export function showBrowserNotification(payload: BrowserNotificationPayload): boolean {
  if (!isBrowserNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
    // Still show when tab is visible — user asked for popup like other sites
  }

  const { title, body, id } = resolveTitleBody(payload);
  if (seenIds.has(id)) return false;
  seenIds.add(id);
  pruneSeen();

  try {
    const n = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: id,
      requireInteraction: false,
      data: {
        ...payload.data,
        orderId: payload.orderId || payload.relatedOrderId || payload.data?.orderId,
        actionUrl: payload.actionUrl,
        type: payload.type,
      },
    });

    n.onclick = () => {
      window.focus();
      n.close();
      const orderId = String(
        payload.orderId ||
          payload.relatedOrderId ||
          payload.data?.orderId ||
          payload.data?.order_id ||
          ''
      ).trim();
      const actionUrl = String(payload.actionUrl || '').trim();
      if (actionUrl && actionUrl.startsWith('/')) {
        window.location.href = actionUrl;
      } else if (orderId) {
        const role = String(localStorage.getItem('userRole') || '').toUpperCase();
        if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'BRANCH_MANAGER') {
          window.location.href = '/admin/orders';
        } else if (role === 'CHEF') {
          window.location.href = '/chef/notifications';
        } else if (role === 'WAITER') {
          window.location.href = '/waiter/notifications';
        } else if (role === 'RIDER') {
          window.location.href = '/rider';
        }
      }
    };

    return true;
  } catch {
    return false;
  }
}

let socketBound = false;

/** Subscribe to Socket.IO `notification` events and show native browser notifications. */
export function bindBrowserNotificationsFromSocket(): () => void {
  if (!isBrowserNotificationSupported()) return () => undefined;

  const socket = getRealtimeSocket();

  const onNotification = (payload: unknown) => {
    if (Notification.permission !== 'granted') return;
    showBrowserNotification((payload || {}) as BrowserNotificationPayload);
  };

  if (!socketBound) {
    socket.on('notification', onNotification);
    socketBound = true;
  }

  return () => {
    socket.off('notification', onNotification);
    socketBound = false;
  };
}
