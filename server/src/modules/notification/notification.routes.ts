import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { authenticate, authorize } from '@/middleware/auth';

const router: Router = Router();
const notificationController = new NotificationController();

// Admin notification routes - accessible to Admin, Super Admin, and Branch Managers
router.get('/admin', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), notificationController.getAdminNotifications);
router.get('/admin/unread-count', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), notificationController.getUnreadCount);
router.get('/admin/recent', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), notificationController.getRecentNotifications);
router.put('/:id/read', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'WAITER'), notificationController.markAsRead);

// Waiter notification routes
router.get('/waiter', authenticate, authorize('WAITER'), notificationController.getWaiterNotifications);
router.get('/waiter/unread-count', authenticate, authorize('WAITER'), notificationController.getWaiterUnreadCount);
router.put('/waiter/read-all', authenticate, authorize('WAITER'), notificationController.markAllAsRead);
router.put('/:id/read', authenticate, authorize('WAITER'), notificationController.markAsRead);

export default router;
