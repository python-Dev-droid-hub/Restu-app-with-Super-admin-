import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { authenticate, authorize } from '@/middleware/auth';

const router: Router = Router();
const notificationController = new NotificationController();

// ============================================
// USER NOTIFICATIONS (Any authenticated user)
// ============================================
router.get('/', authenticate, notificationController.getUserNotifications);
router.get('/unread-count', authenticate, notificationController.getUserUnreadCount);
router.put('/mark-all-read', authenticate, notificationController.markAllAsReadForUser);
router.put('/:id/read', authenticate, notificationController.markAsRead);
router.delete('/:id', authenticate, notificationController.deleteNotification);
router.delete('/', authenticate, notificationController.clearAllNotifications);

// ============================================
// ADMIN NOTIFICATION ROUTES
// ============================================
router.get('/admin', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), notificationController.getAdminNotifications);
router.get('/admin/unread-count', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), notificationController.getUnreadCount);
router.get('/admin/recent', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), notificationController.getRecentNotifications);

// ============================================
// RIDER NOTIFICATION ROUTES
// ============================================
router.get('/rider', authenticate, authorize('RIDER'), notificationController.getRiderNotifications);
router.get('/rider/unread-count', authenticate, authorize('RIDER'), notificationController.getRiderUnreadCount);

// ============================================
// CUSTOMER NOTIFICATION ROUTES
// ============================================
router.get('/customer', authenticate, authorize('CUSTOMER'), notificationController.getCustomerNotifications);
router.get('/customer/unread-count', authenticate, authorize('CUSTOMER'), notificationController.getCustomerUnreadCount);

// ============================================
// CHEF NOTIFICATION ROUTES
// ============================================
router.get('/chef', authenticate, authorize('CHEF'), notificationController.getChefNotifications);
router.get('/chef/unread-count', authenticate, authorize('CHEF'), notificationController.getChefUnreadCount);

// ============================================
// WAITER NOTIFICATION ROUTES
// ============================================
router.get('/waiter', authenticate, authorize('WAITER'), notificationController.getWaiterNotifications);
router.get('/waiter/unread-count', authenticate, authorize('WAITER'), notificationController.getWaiterUnreadCount);
router.put('/waiter/read-all', authenticate, authorize('WAITER'), notificationController.markAllAsReadForWaiter);

export default router;
