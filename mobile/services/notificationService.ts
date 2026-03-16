import { api } from '../components/api/client';

export interface Notification {
  _id: string;
  type: string;
  title: string;
  body?: string;
  message?: string;
  description?: string;
  read: boolean;
  readAt?: string;
  priority: 'LOW' | 'NORMAL' | 'MEDIUM' | 'HIGH' | 'URGENT';
  createdAt: string;
  data?: {
    orderId?: string;
    orderNumber?: string;
    amount?: number;
    riderId?: string;
    branchId?: string;
    customerId?: string;
    [key: string]: any;
  };
}

const normalizeNotification = (n: any): Notification => {
  const read =
    typeof n?.read === 'boolean'
      ? n.read
      : typeof n?.isRead === 'boolean'
        ? n.isRead
        : false;

  return {
    _id: String(n?._id || n?.id || ''),
    type: String(n?.type || ''),
    title: String(n?.title || 'Notification'),
    body: n?.body,
    message: n?.message,
    description: n?.description,
    read,
    readAt: n?.readAt,
    priority: (n?.priority || 'NORMAL') as any,
    createdAt: n?.createdAt,
    data: n?.data,
  };
};

/**
 * Get all notifications
 */
export const getNotifications = async (limit = 20, skip = 0, read?: boolean, branchId?: string) => {
  try {
    // Build query string
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('skip', skip.toString());
    if (read !== undefined) {
      params.append('read', read.toString());
    }
    if (branchId) {
      params.append('branchId', branchId);
    }

    const queryString = params.toString();
    const url = queryString ? `/notifications?${queryString}` : '/notifications';
    const response: any = await api.get(url);

    // Handle nested data structure - backend wraps response in data field
    const responseData = response.data || response;
    
    if (response.success || responseData.notifications) {
      const normalized = (responseData.notifications || []).map(normalizeNotification);
      const unreadComputed = normalized.filter((n: Notification) => !n.read).length;
      return {
        success: true,
        notifications: normalized,
        total: responseData.total || normalized.length || 0,
        unread: typeof responseData.unread === 'number' ? responseData.unread : unreadComputed,
      };
    }

    return {
      success: false,
      notifications: [],
      total: 0,
      unread: 0,
    };
  } catch (error: any) {
    console.error('[notificationService] Get notifications error:', error);
    return {
      success: false,
      notifications: [],
      total: 0,
      unread: 0,
    };
  }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async () => {
  try {
    const response: any = await api.get('/notifications/unread-count');
    return response.data?.unreadCount || 0;
  } catch (error) {
    console.error('Get unread count error:', error);
    return 0;
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return !!response.success;
  } catch (error) {
    console.error('Mark as read error:', error);
    return false;
  }
};

/**
 * Mark all as read
 */
export const markAllAsRead = async () => {
  try {
    const response = await api.put('/notifications/mark-all-read');
    return !!response.success;
  } catch (error) {
    console.error('Mark all as read error:', error);
    return false;
  }
};

/**
 * Delete notification
 */
export const deleteNotification = async (notificationId: string) => {
  try {
    const response = await api.delete(`/notifications/${notificationId}`);
    return !!response.success;
  } catch (error) {
    console.error('Delete notification error:', error);
    return false;
  }
};

/**
 * Clear all notifications
 */
export const clearAllNotifications = async () => {
  try {
    const response = await api.delete('/notifications');
    return !!response.success;
  } catch (error) {
    console.error('Clear all error:', error);
    return false;
  }
};

/**
 * Get notification icon based on type
 */
export const getNotificationIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    // Order
    ORDER_PLACED: 'receipt',
    ORDER_CONFIRMED: 'checkmark-circle',
    ORDER_PREPARING: 'restaurant',
    ORDER_READY: 'fast-food',
    ORDER_OUT_FOR_DELIVERY: 'bicycle',
    ORDER_DELIVERED: 'checkmark-done',
    ORDER_CANCELLED: 'close-circle',
    ORDER_DELAYED: 'time',

    // Payment
    PAYMENT_SUCCESS: 'card',
    PAYMENT_FAILED: 'warning',

    // Rider
    RIDER_ASSIGNED: 'person',
    DELIVERY_ASSIGNED: 'bicycle',
    DELIVERY_UPDATED: 'navigate',
    DELIVERY_COMPLETED: 'checkmark',
    EARNINGS_UPDATE: 'cash',
    PAYOUT_APPROVED: 'wallet',

    // Kitchen
    NEW_COOKING_ORDER: 'flame',
    KITCHEN_STARTED: 'timer',
    KITCHEN_READY: 'checkmark-circle',

    // Manager
    BRANCH_ORDER: 'storefront',
    KITCHEN_ALERT: 'alert',
    DELIVERY_ALERT: 'navigate',
    REVENUE_UPDATE: 'trending-up',
    STAFF_ALERT: 'people',

    // General
    PROMOTION: 'gift',
    NEW_USER: 'person-add',
    SYSTEM_ALERT: 'alert-circle',
    SECURITY_ALERT: 'shield',
  };

  return iconMap[type] || 'notifications';
};

/**
 * Get notification color based on priority
 */
export const getNotificationColor = (priority: string): string => {
  switch (priority) {
    case 'URGENT':
      return '#E74C3C'; // danger
    case 'HIGH':
      return '#F39C12'; // warning
    case 'MEDIUM':
      return '#FF6B35'; // primary
    case 'LOW':
    default:
      return '#3498DB'; // info
  }
};

/**
 * Format notification time
 */
export const formatNotificationTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
};
