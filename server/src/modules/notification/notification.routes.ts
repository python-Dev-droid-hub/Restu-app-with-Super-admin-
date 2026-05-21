import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { authenticate, authorize } from '@/middleware/auth';

const router: Router = Router();
const notificationController = new NotificationController();

const adminRoles = ['ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'] as const;
const adminAuth = [authenticate, authorize(...adminRoles)] as const;

// ============================================
// ADMIN NOTIFICATION ROUTES (before /:id routes)
// ============================================
router.post('/register-device', authenticate, notificationController.registerDevice);
router.post('/send', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), notificationController.sendNotification);

router.get('/admin', ...adminAuth, notificationController.getAdminNotifications);
router.put('/admin/mark-all-read', ...adminAuth, notificationController.markAllAdminAsRead);
router.patch('/admin/mark-all-read', ...adminAuth, notificationController.markAllAdminAsRead);
router.delete('/admin/clear-all', ...adminAuth, notificationController.clearAllAdminNotifications);
router.get('/admin/unread-count', ...adminAuth, notificationController.getUnreadCount);
router.get('/admin/recent', ...adminAuth, notificationController.getRecentNotifications);
router.put('/admin/:id/read', ...adminAuth, notificationController.markAdminNotificationAsRead);
router.patch('/admin/:id/read', ...adminAuth, notificationController.markAdminNotificationAsRead);
router.delete('/admin/:id', ...adminAuth, notificationController.deleteAdminNotification);

// ============================================
// RIDER / CUSTOMER / CHEF / WAITER (static paths)
// ============================================
router.get('/rider', authenticate, authorize('RIDER'), notificationController.getRiderNotifications);
router.get('/rider/unread-count', authenticate, authorize('RIDER'), notificationController.getRiderUnreadCount);

router.get('/customer', authenticate, authorize('CUSTOMER'), notificationController.getCustomerNotifications);
router.get('/customer/unread-count', authenticate, authorize('CUSTOMER'), notificationController.getCustomerUnreadCount);

router.get('/chef', authenticate, authorize('CHEF'), notificationController.getChefNotifications);
router.get('/chef/unread-count', authenticate, authorize('CHEF'), notificationController.getChefUnreadCount);

router.get('/waiter', authenticate, authorize('WAITER'), notificationController.getWaiterNotifications);
router.get('/waiter/unread-count', authenticate, authorize('WAITER'), notificationController.getWaiterUnreadCount);
router.put('/waiter/read-all', authenticate, authorize('WAITER'), notificationController.markAllAsReadForWaiter);

// ============================================
// USER NOTIFICATIONS (parameterized routes last)
// ============================================
router.get('/', authenticate, notificationController.getUserNotifications);
router.get('/unread-count', authenticate, notificationController.getUserUnreadCount);
router.put('/mark-all-read', authenticate, notificationController.markAllAsReadForUser);
router.patch('/mark-all-read', authenticate, notificationController.markAllAsReadForUser);
router.delete('/', authenticate, notificationController.clearAllNotifications);
router.patch('/:id/read', authenticate, notificationController.markAsRead);
router.put('/:id/read', authenticate, notificationController.markAsRead);
router.delete('/:id', authenticate, notificationController.deleteNotification);

export default router;
