import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { Order } from '../models/Order';

interface NotificationData {
  recipient: string;
  type: string;
  title: string;
  message: string;
  description?: string;
  priority?: string;
  data?: any;
  relatedOrder?: string;
  actionUrl?: string;
  recipientRole?: string;
  recipientBranch?: string;
}

class NotificationService {
  /**
   * Send notification to user
   */
  static async sendNotification(notificationData: NotificationData) {
    try {
      console.log('[Notification] Sending:', {
        recipient: notificationData.recipient,
        type: notificationData.type,
        priority: notificationData.priority || 'NORMAL',
      });

      // Get user for role info
      const user = await User.findById(notificationData.recipient);
      if (!user) {
        console.error('[Notification] User not found:', notificationData.recipient);
        return null;
      }

      // Create in-app notification
      const notification = new Notification({
        recipient: notificationData.recipient,
        recipientRole: notificationData.recipientRole || user.role,
        recipientBranch: notificationData.recipientBranch || user.assignedBranch,
        type: notificationData.type,
        title: notificationData.title,
        body: notificationData.message,
        description: notificationData.description,
        priority: notificationData.priority || 'NORMAL',
        data: notificationData.data,
        relatedOrder: notificationData.relatedOrder,
        actionUrl: notificationData.actionUrl,
        deliveryMethod: 'IN_APP',
        isRead: false,
      });

      await notification.save();
      console.log('[Notification] In-app notification saved:', notification._id);

      // TODO: Send push notification if FCM token exists
      // if (user.fcmToken) {
      //   await this.sendPushNotification(user, notification);
      // }

      // TODO: Send SMS for URGENT priority
      // if (notificationData.priority === 'URGENT' && user.phone) {
      //   await this.sendSMSNotification(user, notificationData.message);
      // }

      return notification;
    } catch (error) {
      console.error('[Notification] Send error:', error);
      return null;
    }
  }

  /**
   * Send to multiple users (bulk notification)
   */
  static async sendBulkNotification(userIds: string[], notificationData: Omit<NotificationData, 'recipient'>) {
    try {
      console.log('[Notification] Bulk send to', userIds.length, 'users');

      const notifications = await Notification.insertMany(
        userIds.map((userId) => ({
          recipient: userId,
          ...notificationData,
          sentAt: new Date(),
        }))
      );

      console.log('[Notification] Bulk notifications created:', notifications.length);
      return notifications;
    } catch (error) {
      console.error('[Notification] Bulk send error:', error);
      return [];
    }
  }

  /**
   * Send to all users with specific role in branch
   */
  static async notifyByRole({
    role,
    branchId,
    type,
    title,
    message,
    data = {},
    priority = 'NORMAL',
  }: {
    role: string;
    branchId?: string;
    type: string;
    title: string;
    message: string;
    data?: any;
    priority?: string;
  }) {
    try {
      console.log('[Notification] Notify role:', { role, branch: branchId, type });

      // Build query
      const query: any = { role, isActive: true };
      if (branchId) {
        query.assignedBranch = branchId;
      }

      // Get all users with this role
      const users = await User.find(query);

      if (users.length === 0) {
        console.log('[Notification] No users found for role:', role);
        return [];
      }

      // Send to each user
      const notifications = await Promise.all(
        users.map((user) =>
          this.sendNotification({
            recipient: user._id.toString(),
            recipientRole: user.role,
            recipientBranch: user.assignedBranch?.toString(),
            type,
            title,
            message,
            data,
            priority,
          })
        )
      );

      console.log('[Notification] Sent to', notifications.filter(Boolean).length, 'users');
      return notifications.filter(Boolean);
    } catch (error) {
      console.error('[Notification] Notify by role error:', error);
      return [];
    }
  }

  /**
   * Get unread count for user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      return await Notification.countDocuments({
        recipient: userId,
        isRead: false,
      });
    } catch (error) {
      console.error('[Notification] Get unread count error:', error);
      return 0;
    }
  }

  /**
   * Get notifications for user
   */
  static async getNotifications(userId: string, limit = 20, skip = 0, read?: boolean) {
    try {
      const filter: any = { recipient: userId };
      if (read !== undefined) {
        filter.isRead = read;
      }

      const notifications = await Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      const total = await Notification.countDocuments(filter);
      const unread = await this.getUnreadCount(userId);

      return {
        notifications,
        total,
        unread,
      };
    } catch (error) {
      console.error('[Notification] Get notifications error:', error);
      return { notifications: [], total: 0, unread: 0 };
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string) {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        recipient: userId,
      });

      if (!notification) {
        return null;
      }

      await notification.markAsRead();
      return notification;
    } catch (error) {
      console.error('[Notification] Mark as read error:', error);
      return null;
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(userId: string) {
    try {
      const result = await Notification.updateMany(
        { recipient: userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );

      return result.modifiedCount;
    } catch (error) {
      console.error('[Notification] Mark all as read error:', error);
      return 0;
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string, userId: string) {
    try {
      const result = await Notification.deleteOne({
        _id: notificationId,
        recipient: userId,
      });

      return result.deletedCount > 0;
    } catch (error) {
      console.error('[Notification] Delete error:', error);
      return false;
    }
  }

  /**
   * Clear all notifications for user
   */
  static async clearAllNotifications(userId: string) {
    try {
      const result = await Notification.deleteMany({
        recipient: userId,
      });

      return result.deletedCount;
    } catch (error) {
      console.error('[Notification] Clear all error:', error);
      return 0;
    }
  }

  /**
   * Send push notification via Firebase (placeholder)
   */
  private static async sendPushNotification(user: any, notificationData: any) {
    try {
      if (!user.fcmToken) return false;

      console.log('[Push] Sending to user:', user._id);

      // TODO: Implement Firebase push notification
      // const message = {
      //   notification: {
      //     title: notificationData.title,
      //     body: notificationData.message,
      //   },
      //   data: {
      //     type: notificationData.type,
      //     notificationId: notificationData._id?.toString(),
      //     ...notificationData.data,
      //   },
      //   token: user.fcmToken,
      // };

      // await admin.messaging().send(message);

      return true;
    } catch (error) {
      console.error('[Push] Error:', error);
      return false;
    }
  }

  /**
   * Send SMS notification (placeholder)
   */
  private static async sendSMSNotification(user: any, message: string) {
    try {
      if (!user.phone) return false;

      console.log('[SMS] Sending to:', user.phone);

      // TODO: Integrate with SMS provider (Twilio, AWS SNS, etc.)

      return true;
    } catch (error) {
      console.error('[SMS] Error:', error);
      return false;
    }
  }
}

export default NotificationService;
