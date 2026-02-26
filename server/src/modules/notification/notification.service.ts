import { Notification } from '@/models/Notification';
import { User } from '@/models/User';
import { Types } from 'mongoose';

export class NotificationService {
  // Get admin notifications (system-wide notifications for admin)
  async getAdminNotifications(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find({
        // Admin can see all notifications or system notifications
        $or: [
          { recipient: null }, // System notifications
          { type: { $in: ['SYSTEM', 'ORDER_ALERT', 'PAYMENT_ALERT'] } }
        ]
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('recipient', 'displayName email')
      .populate('relatedOrder', 'orderNumber status'),

      Notification.countDocuments({
        $or: [
          { recipient: null },
          { type: { $in: ['SYSTEM', 'ORDER_ALERT', 'PAYMENT_ALERT'] } }
        ]
      })
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get admin unread count
  async getAdminUnreadCount() {
    return await Notification.countDocuments({
      $or: [
        { recipient: null },
        { type: { $in: ['SYSTEM', 'ORDER_ALERT', 'PAYMENT_ALERT'] } }
      ],
      isRead: false
    });
  }

  // Get notifications for a specific waiter
  async getWaiterNotifications(waiterId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find({
        recipient: new Types.ObjectId(waiterId),
        type: { $in: ['KITCHEN_READY', 'ORDER_UPDATE'] }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('relatedOrder', 'orderNumber status tableNumber')
      .populate('relatedTable', 'tableNumber'),

      Notification.countDocuments({
        recipient: new Types.ObjectId(waiterId),
        type: { $in: ['KITCHEN_READY', 'ORDER_UPDATE'] }
      })
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get unread notification count for waiter
  async getWaiterUnreadCount(waiterId: string) {
    return await Notification.countDocuments({
      recipient: new Types.ObjectId(waiterId),
      type: { $in: ['KITCHEN_READY', 'ORDER_UPDATE'] },
      isRead: false
    });
  }

  // Create kitchen-ready notification for waiter
  async createKitchenReadyNotification(waiterId: string, orderId: string, tableNumber: string, orderNumber: string) {
    return await (Notification as any).createNotification({
      recipient: new Types.ObjectId(waiterId),
      type: 'KITCHEN_READY',
      title: 'Order Ready!',
      body: `Order ${orderNumber} for Table ${tableNumber} is ready to serve.`,
      relatedOrder: orderId,
      priority: 'HIGH',
      data: {
        tableNumber,
        orderNumber,
        action: 'PICKUP_ORDER'
      }
    });
  }

  // Mark notification as read
  async markAsRead(notificationId: string) {
    const notification = await Notification.findById(notificationId);
    if (notification) {
      (notification as any).markAsRead();
      return notification;
    }
    return null;
  }

  // Mark all notifications as read for a waiter
  async markAllAsReadForWaiter(waiterId: string) {
    await Notification.updateMany(
      { recipient: new Types.ObjectId(waiterId), isRead: false },
      { isRead: true, readAt: new Date() }
    );
    return true;
  }

  // Create system notification
  async createSystemNotification(title: string, body: string, data?: any) {
    return await (Notification as any).createNotification({
      recipient: null, // System notification
      type: 'SYSTEM',
      title,
      body,
      data: data || {},
      priority: 'HIGH'
    });
  }

  // Create order alert notification
  async createOrderAlert(orderId: string, message: string) {
    return await (Notification as any).createNotification({
      recipient: null, // Admin notification
      type: 'ORDER_ALERT',
      title: 'New Order Alert',
      body: message,
      relatedOrder: orderId,
      priority: 'NORMAL'
    });
  }

  // Get recent notifications for admin
  async getRecentNotifications(limit: number = 10) {
    return await Notification.find({
      $or: [
        { recipient: null },
        { type: { $in: ['SYSTEM', 'ORDER_ALERT', 'PAYMENT_ALERT'] } }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('recipient', 'displayName email')
    .populate('relatedOrder', 'orderNumber status');
  }
}
