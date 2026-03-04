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

/**
 * Get all notifications
 */
export const getNotifications = async (limit = 20, skip = 0, read?: boolean) => {
  try {
    // Build query string
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('skip', skip.toString());
    if (read !== undefined) {
      params.append('read', read.toString());
    }

    const queryString = params.toString();
    const url = queryString ? `/notifications?${queryString}` : '/notifications';
    const response = await api.get(url);

    if (response.success) {
      return {
        success: true,
        notifications: response.data.notifications as Notification[],
        total: response.data.total,
        unread: response.data.unread,
      };
    }

    return {
      success: false,
      notifications: [],
      total: 0,
      unread: 0,
    };
  } catch (error: any) {
    console.error('Get notifications error:', error);
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
    const response = await api.get('/notifications/unread-count');
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
    return response.data?.success || false;
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
    return response.data?.success || false;
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
    return response.data?.success || false;
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
    return response.data?.success || false;
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
