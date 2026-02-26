import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { authenticate, authorize } from '@/middleware/auth';

const router: Router = Router();
const notificationController = new NotificationController();

// Admin notification routes
router.get('/admin', authenticate, authorize('ADMIN'), notificationController.getAdminNotifications);
router.get('/admin/unread-count', authenticate, authorize('ADMIN'), notificationController.getUnreadCount);
router.get('/admin/recent', authenticate, authorize('ADMIN'), notificationController.getRecentNotifications);
router.put('/:id/read', authenticate, authorize('ADMIN'), notificationController.markAsRead);

// Waiter notification routes
router.get('/waiter', authenticate, authorize('WAITER'), notificationController.getWaiterNotifications);
router.get('/waiter/unread-count', authenticate, authorize('WAITER'), notificationController.getWaiterUnreadCount);
router.put('/waiter/read-all', authenticate, authorize('WAITER'), notificationController.markAllAsRead);
router.put('/:id/read', authenticate, authorize('WAITER'), notificationController.markAsRead);

export default router;
