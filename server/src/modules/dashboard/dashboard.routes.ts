import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { authenticate, authorize } from '@/middleware/auth';

const router: Router = Router();
const dashboardController = new DashboardController();

// Super Admin Dashboard
router.get('/superadmin/stats', authenticate, authorize('SUPER_ADMIN'), dashboardController.getSuperAdminStats);
router.get('/superadmin/branches', authenticate, authorize('SUPER_ADMIN'), dashboardController.getSuperAdminBranches);
router.get('/superadmin/revenue', authenticate, authorize('SUPER_ADMIN'), dashboardController.getSuperAdminRevenue);

// Admin Dashboard - now also accessible to Branch Managers
router.get('/admin/stats', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), dashboardController.getAdminStats);
router.get('/admin/analytics', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), dashboardController.getAdminAnalytics);

// Customer Dashboard
router.get('/customer/stats', authenticate, authorize('CUSTOMER'), dashboardController.getCustomerStats);

// Rider Dashboard
router.get('/rider/stats', authenticate, authorize('RIDER'), dashboardController.getRiderStats);
router.get('/rider/earnings', authenticate, authorize('RIDER'), dashboardController.getRiderEarnings);

// Waiter Dashboard
router.get('/waiter/stats', authenticate, authorize('WAITER'), dashboardController.getWaiterStats);

// Chef Dashboard
router.get('/chef/stats', authenticate, authorize('CHEF'), dashboardController.getChefStats);
router.get('/chef/orders', authenticate, authorize('CHEF'), dashboardController.getChefOrders);
router.get('/kitchen/orders/cooking', authenticate, authorize('CHEF'), dashboardController.getCookingOrders);
router.get('/kitchen/most-ordered', authenticate, authorize('CHEF'), dashboardController.getMostOrderedItems);
router.get('/notifications', authenticate, dashboardController.getNotifications);

// Branch Manager Dashboard
router.get('/manager/stats', authenticate, authorize('BRANCH_MANAGER', 'ADMIN', 'SUPER_ADMIN'), dashboardController.getManagerStats);
router.get('/manager/staff', authenticate, authorize('BRANCH_MANAGER', 'ADMIN', 'SUPER_ADMIN'), dashboardController.getBranchStaff);
router.get('/manager/inventory', authenticate, authorize('BRANCH_MANAGER', 'ADMIN', 'SUPER_ADMIN'), dashboardController.getBranchInventory);
router.get('/manager/analytics', authenticate, authorize('BRANCH_MANAGER', 'ADMIN', 'SUPER_ADMIN'), dashboardController.getBranchAnalytics);

export default router;
