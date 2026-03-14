import { Notification } from '@/models/Notification';
import { User } from '@/models/User';
import { Types } from 'mongoose';

export class NotificationService {
  // ============================================
  // USER NOTIFICATIONS (General - any authenticated user)
  // ============================================
  
  async getUserNotifications(userId: string, page: number = 1, limit: number = 20, read?: boolean) {
    const skip = (page - 1) * limit;
    
    const filter: any = { recipient: new Types.ObjectId(userId) };
    if (read !== undefined) {
      filter.isRead = read;
    }

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('relatedOrder', 'orderNumber status')
        .lean(),
      Notification.countDocuments(filter)
    ]);

    return {
      notifications,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  }

  async getUserUnreadCount(userId: string) {
    return await Notification.countDocuments({
      recipient: new Types.ObjectId(userId),
      isRead: false
    });
  }

  async markAllAsReadForUser(userId: string) {
    await Notification.updateMany(
      { recipient: new Types.ObjectId(userId), isRead: false },
      { isRead: true, readAt: new Date() }
    );
    return true;
  }

  async deleteNotification(notificationId: string, userId: string) {
    const result = await Notification.deleteOne({
      _id: new Types.ObjectId(notificationId),
      recipient: new Types.ObjectId(userId)
    });
    return result.deletedCount > 0;
  }

  async clearAllNotifications(userId: string) {
    const result = await Notification.deleteMany({
      recipient: new Types.ObjectId(userId)
    });
    return result.deletedCount;
  }

  async markAsReadForUser(notificationId: string, userId: string) {
    const notification = await Notification.findOne({
      _id: new Types.ObjectId(notificationId),
      recipient: new Types.ObjectId(userId)
    });
    
    if (notification) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
      return notification;
    }
    return null;
  }

  // ============================================
  // ADMIN NOTIFICATIONS
  // ============================================

  async getAdminNotifications(page: number = 1, limit: number = 20, branchId?: string) {
    const skip = (page - 1) * limit;

    // Build filter - admin sees all system-wide notifications
    const filter: any = {};

    // If branchId is provided, filter notifications related to that branch
    if (branchId) {
      filter.$or = [
        { 'data.branchId': branchId },
        { branch: branchId },
        { recipientBranch: branchId }
      ];
    } else {
      // No branch filter - show all admin-relevant notifications
      // Admin notifications are those without a specific recipient OR with admin-relevant types
      filter.$or = [
        { recipient: null },
        { recipient: { $exists: false } },
        { recipientRole: { $in: ['ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'] } },
        { type: { $in: ['SYSTEM', 'ORDER_ALERT', 'PAYMENT_ALERT', 'SYSTEM_ALERT', 'SECURITY_ALERT', 'NEW_USER', 'TECHNICAL_ISSUE'] } }
      ];
    }

    console.log('[NotificationService] Admin notifications filter:', JSON.stringify(filter));

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('recipient', 'displayName email')
      .populate('relatedOrder', 'orderNumber status')
      .lean(),

      Notification.countDocuments(filter)
    ]);

    console.log('[NotificationService] Found notifications:', notifications.length, 'total:', total);

    return {
      notifications,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  }

  async getAdminUnreadCount() {
    return await Notification.countDocuments({
      $or: [
        { recipient: null },
        { type: { $in: ['SYSTEM', 'ORDER_ALERT', 'PAYMENT_ALERT'] } }
      ],
      isRead: false
    });
  }

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

  // ============================================
  // RIDER NOTIFICATIONS
  // ============================================

  async getRiderNotifications(riderId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find({
        recipient: new Types.ObjectId(riderId),
        type: { $in: ['DELIVERY_ASSIGNED', 'DELIVERY_UPDATED', 'EARNINGS_UPDATE', 'PAYOUT_APPROVED'] }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('relatedOrder', 'orderNumber status deliveryAddress'),

      Notification.countDocuments({
        recipient: new Types.ObjectId(riderId),
        type: { $in: ['DELIVERY_ASSIGNED', 'DELIVERY_UPDATED', 'EARNINGS_UPDATE', 'PAYOUT_APPROVED'] }
      })
    ]);

    return {
      notifications,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  }

  async getRiderUnreadCount(riderId: string) {
    return await Notification.countDocuments({
      recipient: new Types.ObjectId(riderId),
      type: { $in: ['DELIVERY_ASSIGNED', 'DELIVERY_UPDATED', 'EARNINGS_UPDATE', 'PAYOUT_APPROVED'] },
      isRead: false
    });
  }

  // ============================================
  // CUSTOMER NOTIFICATIONS
  // ============================================

  async getCustomerNotifications(customerId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find({
        recipient: new Types.ObjectId(customerId),
        type: { $in: ['ORDER_PLACED', 'ORDER_CONFIRMED', 'ORDER_PREPARING', 'ORDER_READY', 
                      'ORDER_OUT_FOR_DELIVERY', 'ORDER_DELIVERED', 'PAYMENT_SUCCESS', 'PROMOTION'] }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('relatedOrder', 'orderNumber status totalAmount'),

      Notification.countDocuments({
        recipient: new Types.ObjectId(customerId),
        type: { $in: ['ORDER_PLACED', 'ORDER_CONFIRMED', 'ORDER_PREPARING', 'ORDER_READY', 
                      'ORDER_OUT_FOR_DELIVERY', 'ORDER_DELIVERED', 'PAYMENT_SUCCESS', 'PROMOTION'] }
      })
    ]);

    return {
      notifications,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  }

  async getCustomerUnreadCount(customerId: string) {
    return await Notification.countDocuments({
      recipient: new Types.ObjectId(customerId),
      type: { $in: ['ORDER_PLACED', 'ORDER_CONFIRMED', 'ORDER_PREPARING', 'ORDER_READY', 
                    'ORDER_OUT_FOR_DELIVERY', 'ORDER_DELIVERED', 'PAYMENT_SUCCESS', 'PROMOTION'] },
      isRead: false
    });
  }

  // ============================================
  // CHEF NOTIFICATIONS
  // ============================================

  async getChefNotifications(chefId: string, branchId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const filter: any = {
      type: { $in: ['NEW_COOKING_ORDER', 'ORDER_PRIORITY', 'KITCHEN_ALERT', 'EQUIPMENT_ALERT'] }
    };

    // Chef sees notifications sent to them OR to their branch
    filter.$or = [
      { recipient: new Types.ObjectId(chefId) },
      { recipientBranch: branchId ? new Types.ObjectId(branchId) : null }
    ];

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('relatedOrder', 'orderNumber status items'),

      Notification.countDocuments(filter)
    ]);

    return {
      notifications,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  }

  async getChefUnreadCount(chefId: string, branchId: string) {
    const filter: any = {
      type: { $in: ['NEW_COOKING_ORDER', 'ORDER_PRIORITY', 'KITCHEN_ALERT', 'EQUIPMENT_ALERT'] },
      isRead: false
    };

    filter.$or = [
      { recipient: new Types.ObjectId(chefId) },
      { recipientBranch: branchId ? new Types.ObjectId(branchId) : null }
    ];

    return await Notification.countDocuments(filter);
  }

  // ============================================
  // WAITER NOTIFICATIONS
  // ============================================

  async getWaiterNotifications(waiterId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find({
        recipient: new Types.ObjectId(waiterId),
        type: { $in: ['KITCHEN_READY', 'ORDER_UPDATE', 'CALL_BELL', 'RIDER_ARRIVED'] }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('relatedOrder', 'orderNumber status tableNumber')
      .populate('relatedTable', 'tableNumber'),

      Notification.countDocuments({
        recipient: new Types.ObjectId(waiterId),
        type: { $in: ['KITCHEN_READY', 'ORDER_UPDATE', 'CALL_BELL', 'RIDER_ARRIVED'] }
      })
    ]);

    return {
      notifications,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  }

  async getWaiterUnreadCount(waiterId: string) {
    return await Notification.countDocuments({
      recipient: new Types.ObjectId(waiterId),
      type: { $in: ['KITCHEN_READY', 'ORDER_UPDATE', 'CALL_BELL', 'RIDER_ARRIVED'] },
      isRead: false
    });
  }

  async markAllAsReadForWaiter(waiterId: string) {
    await Notification.updateMany(
      { recipient: new Types.ObjectId(waiterId), isRead: false },
      { isRead: true, readAt: new Date() }
    );
    return true;
  }

  // ============================================
  // NOTIFICATION CREATION HELPERS
  // ============================================

  async createKitchenReadyNotification(waiterId: string, orderId: string, tableNumber: string, orderNumber: string) {
    return await Notification.create({
      recipient: new Types.ObjectId(waiterId),
      type: 'KITCHEN_READY',
      title: 'Order Ready!',
      body: `Order ${orderNumber} for Table ${tableNumber} is ready to serve.`,
      relatedOrder: orderId,
      priority: 'HIGH',
      data: { tableNumber, orderNumber, action: 'PICKUP_ORDER' }
    });
  }

  async createOrderStatusNotification(
    waiterId: string,
    orderId: string,
    orderNumber: string,
    status: string,
    title: string,
    body: string
  ) {
    return await Notification.create({
      recipient: new Types.ObjectId(waiterId),
      type: 'ORDER_UPDATE',
      title,
      body,
      relatedOrder: orderId,
      priority: 'HIGH',
      data: { orderNumber, status, action: 'VIEW_ORDER' }
    });
  }

  async createSystemNotification(title: string, body: string, data?: any) {
    return await Notification.create({
      recipient: null,
      type: 'SYSTEM',
      title,
      body,
      data: data || {},
      priority: 'HIGH'
    });
  }

  async createOrderAlert(orderId: string, message: string) {
    return await Notification.create({
      recipient: null,
      type: 'ORDER_ALERT',
      title: 'New Order Alert',
      body: message,
      relatedOrder: orderId,
      priority: 'NORMAL'
    });
  }
}
