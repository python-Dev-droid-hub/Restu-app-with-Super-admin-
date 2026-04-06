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

  private toIdString(value: any): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && '_id' in value) {
      return String((value as any)._id);
    }
    return String(value);
  }

  // ============================================
  // USER NOTIFICATIONS (Any authenticated user)
  // ============================================
  
  // Get notifications for current user
  getUserNotifications = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const userId = this.toIdString(req.user!._id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const read = req.query.read !== undefined ? req.query.read === 'true' : undefined;

    const result = await this.notificationService.getUserNotifications(userId, page, limit, read);
    sendSuccess(res, result, 'Notifications retrieved successfully');
  });

  // Get unread count for current user
  getUserUnreadCount = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const userId = this.toIdString(req.user!._id);
    const count = await this.notificationService.getUserUnreadCount(userId);
    sendSuccess(res, { unreadCount: count }, 'Unread count retrieved successfully');
  });

  // Mark all as read for current user
  markAllAsReadForUser = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const userId = this.toIdString(req.user!._id);
    await this.notificationService.markAllAsReadForUser(userId);
    sendSuccess(res, { success: true }, 'All notifications marked as read');
  });

  // Delete single notification
  deleteNotification = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = this.toIdString(req.user!._id);
    
    const deleted = await this.notificationService.deleteNotification(id, userId);
    if (!deleted) {
      throw createError('Notification not found or already deleted', 404);
    }
    
    sendSuccess(res, { success: true }, 'Notification deleted successfully');
  });

  // Clear all notifications for user
  clearAllNotifications = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const userId = this.toIdString(req.user!._id);
    const count = await this.notificationService.clearAllNotifications(userId);
    sendSuccess(res, { deletedCount: count }, 'All notifications cleared successfully');
  });

  // ============================================
  // ADMIN NOTIFICATIONS
  // ============================================

  // Get admin notifications (system-wide)
  getAdminNotifications = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const branchId = req.query.branchId as string;

    const result = await this.notificationService.getAdminNotifications(page, limit, branchId);
    sendSuccess(res, result, 'Notifications retrieved successfully');
  });

  // Get admin unread count
  getUnreadCount = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const count = await this.notificationService.getAdminUnreadCount();
    sendSuccess(res, { unreadCount: count }, 'Unread count retrieved successfully');
  });

  // Get recent notifications for admin
  getRecentNotifications = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;

    const notifications = await this.notificationService.getRecentNotifications(limit);
    sendSuccess(res, notifications, 'Recent notifications retrieved successfully');
  });

  // ============================================
  // RIDER NOTIFICATIONS
  // ============================================

  // Get rider notifications
  getRiderNotifications = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const riderId = this.toIdString(req.user!._id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await this.notificationService.getRiderNotifications(riderId, page, limit);
    sendSuccess(res, result, 'Rider notifications retrieved successfully');
  });

  // Get rider unread count
  getRiderUnreadCount = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const riderId = this.toIdString(req.user!._id);
    const count = await this.notificationService.getRiderUnreadCount(riderId);
    sendSuccess(res, { unreadCount: count }, 'Unread count retrieved successfully');
  });

  // ============================================
  // CUSTOMER NOTIFICATIONS
  // ============================================

  // Get customer notifications
  getCustomerNotifications = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const customerId = this.toIdString(req.user!._id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await this.notificationService.getCustomerNotifications(customerId, page, limit);
    sendSuccess(res, result, 'Customer notifications retrieved successfully');
  });

  // Get customer unread count
  getCustomerUnreadCount = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const customerId = this.toIdString(req.user!._id);
    const count = await this.notificationService.getCustomerUnreadCount(customerId);
    sendSuccess(res, { unreadCount: count }, 'Unread count retrieved successfully');
  });

  // ============================================
  // CHEF NOTIFICATIONS
  // ============================================

  // Get chef notifications
  getChefNotifications = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const chefId = this.toIdString(req.user!._id);
    const branchId = this.toIdString(req.user!.assignedBranch);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await this.notificationService.getChefNotifications(chefId, branchId, page, limit);
    sendSuccess(res, result, 'Chef notifications retrieved successfully');
  });

  // Get chef unread count
  getChefUnreadCount = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const chefId = this.toIdString(req.user!._id);
    const branchId = this.toIdString(req.user!.assignedBranch);
    const count = await this.notificationService.getChefUnreadCount(chefId, branchId);
    sendSuccess(res, { unreadCount: count }, 'Unread count retrieved successfully');
  });

  // ============================================
  // WAITER NOTIFICATIONS
  // ============================================

  // Get notifications for waiter
  getWaiterNotifications = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const waiterId = this.toIdString(req.user!._id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await this.notificationService.getWaiterNotifications(waiterId, page, limit);
    sendSuccess(res, result, 'Waiter notifications retrieved successfully');
  });

  // Get unread count for waiter
  getWaiterUnreadCount = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const waiterId = this.toIdString(req.user!._id);
    const count = await this.notificationService.getWaiterUnreadCount(waiterId);
    sendSuccess(res, { unreadCount: count }, 'Unread count retrieved successfully');
  });

  // Mark all notifications as read for waiter
  markAllAsReadForWaiter = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const waiterId = this.toIdString(req.user!._id);
    await this.notificationService.markAllAsReadForWaiter(waiterId);
    sendSuccess(res, { success: true }, 'All notifications marked as read');
  });

  // ============================================
  // COMMON ACTIONS
  // ============================================

  // Mark notification as read
  markAsRead = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = this.toIdString(req.user!._id);

    const notification = await this.notificationService.markAsReadForUser(id, userId);
    if (!notification) {
      throw createError('Notification not found', 404);
    }

    sendSuccess(res, notification, 'Notification marked as read');
  });
}
