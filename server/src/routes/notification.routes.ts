import { Router, Request, Response } from 'express';
import NotificationService from '../services/notificationService';
import { Notification } from '../models/Notification';
import { authenticate } from '../middleware/auth';
import { IAuthRequest } from '../types';

const router = Router();

// ============================================
// GET NOTIFICATIONS
// ============================================

/**
 * Get user's notifications
 */
router.get('/', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    const { limit = 20, skip = 0, read } = req.query;

    console.log('[API] Get notifications for:', req.user?._id);

    const result = await NotificationService.getNotifications(
      req.user!._id.toString(),
      parseInt(limit as string),
      parseInt(skip as string),
      read !== undefined ? read === 'true' : undefined
    );

    res.json({
      success: true,
      notifications: result.notifications,
      total: result.total,
      unread: result.unread,
    });
  } catch (error: any) {
    console.error('[API] Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * Get unread notification count
 */
router.get('/unread-count', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    const count = await NotificationService.getUnreadCount(req.user!._id.toString());

    res.json({
      success: true,
      unreadCount: count,
    });
  } catch (error: any) {
    console.error('[API] Unread count error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * Get notification by ID
 */
router.get('/:notificationId', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.notificationId,
      recipient: req.user!._id,
    });

    if (!notification) {
      res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
      return;
    }

    res.json({
      success: true,
      notification,
    });
    return;
  } catch (error: any) {
    console.error('[API] Get notification error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// UPDATE NOTIFICATIONS
// ============================================

/**
 * Mark notification as read
 */
router.put('/:notificationId/read', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    const notification = await NotificationService.markAsRead(
      req.params.notificationId,
      req.user!._id.toString()
    );

    if (!notification) {
      res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
      return;
    }

    res.json({
      success: true,
      notification,
    });
    return;
  } catch (error: any) {
    console.error('[API] Mark read error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * Mark all notifications as read
 */
router.put('/mark-all-read', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    const modifiedCount = await NotificationService.markAllAsRead(req.user!._id.toString());

    res.json({
      success: true,
      message: 'All notifications marked as read',
      modifiedCount,
    });
    return;
  } catch (error: any) {
    console.error('[API] Mark all read error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// DELETE NOTIFICATIONS
// ============================================

/**
 * Delete notification
 */
router.delete('/:notificationId', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    const deleted = await NotificationService.deleteNotification(
      req.params.notificationId,
      req.user!._id.toString()
    );

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Notification deleted',
    });
    return;
  } catch (error: any) {
    console.error('[API] Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * Clear all notifications
 */
router.delete('/', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    const deletedCount = await NotificationService.clearAllNotifications(req.user!._id.toString());

    res.json({
      success: true,
      message: 'All notifications cleared',
      deletedCount,
    });
    return;
  } catch (error: any) {
    console.error('[API] Clear all error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// ADMIN: Send Notifications
// ============================================

/**
 * Send notification to user (admin only)
 */
router.post('/send', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    // Check if user is admin
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role || '')) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const notification = await NotificationService.sendNotification(req.body);

    if (notification) {
      res.json({
        success: true,
        notification,
      });
      return;
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to send notification',
      });
      return;
    }
  } catch (error: any) {
    console.error('[API] Send notification error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * Send bulk notification (admin only)
 */
router.post('/send-bulk', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    // Check if user is admin
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role || '')) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const { userIds, ...notificationData } = req.body;
    const notifications = await NotificationService.sendBulkNotification(userIds, notificationData);

    res.json({
      success: true,
      sent: notifications.length,
    });
    return;
  } catch (error: any) {
    console.error('[API] Bulk send error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * Notify by role (admin only)
 */
router.post('/notify-role', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    // Check if user is admin
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role || '')) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const { role, branchId, type, title, message, data, priority } = req.body;
    const notifications = await NotificationService.notifyByRole({
      role,
      branchId,
      type,
      title,
      message,
      data,
      priority,
    });

    res.json({
      success: true,
      sent: notifications.length,
    });
    return;
  } catch (error: any) {
    console.error('[API] Notify role error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
