import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { authenticate, authorize } from '@/middleware/auth';

const router: Router = Router();
const dashboardController = new DashboardController();

// Super Admin Dashboard
router.get('/superadmin/stats', authenticate, authorize('SUPER_ADMIN'), dashboardController.getSuperAdminStats);
router.get('/superadmin/branches', authenticate, authorize('SUPER_ADMIN'), dashboardController.getSuperAdminBranches);
router.get('/superadmin/revenue', authenticate, authorize('SUPER_ADMIN'), dashboardController.getSuperAdminRevenue);

// Admin Dashboard
router.get('/admin/stats', authenticate, authorize('ADMIN'), dashboardController.getAdminStats);
router.get('/admin/analytics', authenticate, authorize('ADMIN'), dashboardController.getAdminAnalytics);

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

// Branch Manager Dashboard
router.get('/manager/stats', authenticate, authorize('BRANCH_MANAGER'), dashboardController.getManagerStats);
router.get('/manager/staff', authenticate, authorize('BRANCH_MANAGER'), dashboardController.getBranchStaff);
router.get('/manager/inventory', authenticate, authorize('BRANCH_MANAGER'), dashboardController.getBranchInventory);
router.get('/manager/analytics', authenticate, authorize('BRANCH_MANAGER'), dashboardController.getBranchAnalytics);

export default router;
