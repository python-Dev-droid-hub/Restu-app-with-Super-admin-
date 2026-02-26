import { Request, Response } from 'express';
import { NotificationService } from './notification.service';
import { sendSuccess } from '@/utils/response';
import { asyncHandler, IAuthRequest } from '@/utils';
import { createError } from '@/middleware/errorHandler';

export class NotificationController {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  // Get admin notifications
  getAdminNotifications = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await this.notificationService.getAdminNotifications(page, limit);
    sendSuccess(res, result, 'Notifications retrieved successfully');
  });

  // Get unread count for admin
  getUnreadCount = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const count = await this.notificationService.getAdminUnreadCount();
    sendSuccess(res, { unreadCount: count }, 'Unread count retrieved successfully');
  });

  // Get notifications for waiter
  getWaiterNotifications = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const waiterId = req.user!._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await this.notificationService.getWaiterNotifications(waiterId, page, limit);
    sendSuccess(res, result, 'Waiter notifications retrieved successfully');
  });

  // Get unread count for waiter
  getWaiterUnreadCount = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const waiterId = req.user!._id;
    const count = await this.notificationService.getWaiterUnreadCount(waiterId);
    sendSuccess(res, { unreadCount: count }, 'Unread count retrieved successfully');
  });

  // Mark notification as read
  markAsRead = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { id } = req.params;

    const notification = await this.notificationService.markAsRead(id);
    if (!notification) {
      throw createError('Notification not found', 404);
    }

    sendSuccess(res, notification, 'Notification marked as read');
  });

  // Mark all notifications as read for waiter
  markAllAsRead = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const waiterId = req.user!._id;
    await this.notificationService.markAllAsReadForWaiter(waiterId);
    sendSuccess(res, { success: true }, 'All notifications marked as read');
  });

  // Get recent notifications for admin
  getRecentNotifications = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;

    const notifications = await this.notificationService.getRecentNotifications(limit);
    sendSuccess(res, notifications, 'Recent notifications retrieved successfully');
  });
}
