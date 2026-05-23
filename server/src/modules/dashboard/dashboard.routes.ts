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
router.get('/admin/branches', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), dashboardController.getAdminBranchesOverview);
router.get('/admin/overview', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), dashboardController.getAdminDashboardOverview);
router.get('/admin/stats', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), dashboardController.getAdminStats);
router.get('/admin/analytics', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), dashboardController.getAdminAnalytics);
router.get('/admin/analytics/export', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), dashboardController.getAdminAnalyticsExport);
router.get('/admin/performance/waiters', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), dashboardController.getAdminWaitersPerformance);
router.get('/admin/performance/riders', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), dashboardController.getAdminRidersPerformance);
router.get('/admin/performance/branches', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), dashboardController.getAdminBranchesPerformance);

// Customer Dashboard
router.get('/customer/stats', authenticate, authorize('CUSTOMER'), dashboardController.getCustomerStats);

// Rider Dashboard
router.get('/rider/overview', authenticate, authorize('RIDER'), dashboardController.getRiderDashboardOverview);
router.get('/rider/stats', authenticate, authorize('RIDER'), dashboardController.getRiderStats);
router.get('/rider/earnings', authenticate, authorize('RIDER'), dashboardController.getRiderEarnings);

// Waiter Dashboard
router.get('/waiter/overview', authenticate, authorize('WAITER', 'ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), dashboardController.getWaiterDashboardOverview);
router.get('/waiter/stats', authenticate, authorize('WAITER'), dashboardController.getWaiterStats);

// Chef Dashboard
router.get('/chef/overview', authenticate, authorize('CHEF', 'KITCHEN', 'COOK', 'HEAD_CHEF', 'SOUS_CHEF', 'KITCHEN_MANAGER', 'ADMIN', 'SUPER_ADMIN'), dashboardController.getChefDashboardOverview);
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
router.get('/manager/analytics/export', authenticate, authorize('BRANCH_MANAGER', 'ADMIN', 'SUPER_ADMIN'), dashboardController.getBranchAnalyticsExport);

export default router;
