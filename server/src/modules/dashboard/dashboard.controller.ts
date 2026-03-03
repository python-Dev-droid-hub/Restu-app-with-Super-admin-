import { Request, Response } from 'express';
import { DashboardService } from './dashboard.service';
import { sendSuccess } from '@/utils/response';
import { asyncHandler, IAuthRequest } from '@/utils';
import { logger } from '@/utils/logger';

export class DashboardController {
  private dashboardService: DashboardService;

  constructor() {
    this.dashboardService = new DashboardService();
  }

  // Super Admin Dashboard Stats
  getSuperAdminStats = asyncHandler(async (req: Request, res: Response) => {
    logger.info('📊 [SUPER_ADMIN STATS] Request received', {
      user: req.user?.email,
      role: req.user?.role,
      userId: req.user?._id
    });

    const stats = await this.dashboardService.getSuperAdminStats();

    logger.info('📊 [SUPER_ADMIN STATS] Stats retrieved successfully', {
      totalOrdersToday: stats.totalOrdersToday,
      totalRevenue: stats.totalRevenue,
      activeRiders: stats.activeRiders,
      activeTables: stats.activeTables
    });

    sendSuccess(res, stats, 'Super Admin stats retrieved successfully');
  });

  // Super Admin Branches
  getSuperAdminBranches = asyncHandler(async (req: Request, res: Response) => {
    logger.info('🏢 [SUPER_ADMIN BRANCHES] Request received', {
      user: req.user?.email,
      role: req.user?.role,
      userId: req.user?._id
    });

    const branches = await this.dashboardService.getSuperAdminBranches();

    logger.info('🏢 [SUPER_ADMIN BRANCHES] Branches retrieved successfully', {
      totalBranches: branches.length,
      branches: branches.map(b => ({ id: b._id, name: b.branchName, code: b.branchCode, status: b.isActive }))
    });

    sendSuccess(res, branches, 'Branches retrieved successfully');
  });

  // Super Admin Revenue
  getSuperAdminRevenue = asyncHandler(async (req: Request, res: Response) => {
    const { range = '30d' } = req.query;

    logger.info('💰 [SUPER_ADMIN REVENUE] Request received', {
      user: req.user?.email,
      role: req.user?.role,
      userId: req.user?._id,
      range
    });

    const revenue = await this.dashboardService.getSuperAdminRevenue(range as string);

    logger.info('💰 [SUPER_ADMIN REVENUE] Revenue data retrieved successfully', {
      range,
      totalRevenue: revenue.totalRevenue,
      periodCount: revenue.data?.length || 0
    });

    sendSuccess(res, revenue, 'Revenue data retrieved successfully');
  });

  // Admin Dashboard Stats
  getAdminStats = asyncHandler(async (req: Request, res: Response) => {
    logger.info('📊 [ADMIN STATS] Request received', {
      user: req.user?.email,
      role: req.user?.role,
      userId: req.user?._id
    });

    const stats = await this.dashboardService.getAdminStats();

    logger.info('📊 [ADMIN STATS] Stats retrieved successfully', {
      totalOrdersToday: stats.totalOrdersToday,
      totalRevenue: stats.totalRevenue,
      activeRiders: stats.activeRiders,
      activeTables: stats.activeTables
    });

    sendSuccess(res, stats, 'Admin stats retrieved successfully');
  });

  // Admin Analytics with time range filtering
  getAdminAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { range = '30d' } = req.query;

    logger.info('📈 [ADMIN ANALYTICS] Request received', {
      user: req.user?.email,
      role: req.user?.role,
      userId: req.user?._id,
      range
    });

    const analytics = await this.dashboardService.getAdminAnalytics(range as string);

    logger.info('📈 [ADMIN ANALYTICS] Analytics retrieved successfully', {
      range,
      totalOrders: analytics.totalOrders,
      totalRevenue: analytics.totalRevenue
    });

    sendSuccess(res, analytics, 'Admin analytics retrieved successfully');
  });

  // Customer Dashboard Stats
  getCustomerStats = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const userId = req.user?._id;
    const stats = await this.dashboardService.getCustomerStats(userId!.toString());
    sendSuccess(res, stats, 'Customer stats retrieved successfully');
  });

  // Rider Dashboard Stats
  getRiderStats = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const riderId = req.user?._id;
    const stats = await this.dashboardService.getRiderStats(riderId!.toString());
    sendSuccess(res, stats, 'Rider stats retrieved successfully');
  });

  // Rider Earnings
  getRiderEarnings = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const riderId = req.user?._id;
    const earnings = await this.dashboardService.getRiderEarnings(riderId!.toString());
    sendSuccess(res, earnings, 'Rider earnings retrieved successfully');
  });

  // Waiter Dashboard Stats
  getWaiterStats = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const waiterId = req.user?._id;
    const stats = await this.dashboardService.getWaiterStats(waiterId!.toString());
    sendSuccess(res, stats, 'Waiter stats retrieved successfully');
  });

  // Chef Dashboard
  getChefStats = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const chefId = req.user?._id;
    const stats = await this.dashboardService.getChefStats(chefId!.toString());
    sendSuccess(res, stats, 'Chef stats retrieved successfully');
  });

  // Chef Kitchen Orders
  getChefOrders = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
      console.log('=== /dashboard/chef/orders START ===');
      const chefId = req.user?._id;
      console.log('Chef ID from token:', chefId);

      // Get chef's assigned branch from user record
      const User = await import('@/models/User').then(m => m.User);
      const chef = await User.findById(chefId).select('assignedBranch');
      console.log('Chef found:', !!chef);
      console.log('Chef assignedBranch:', chef?.assignedBranch);
      
      const branchId = chef?.assignedBranch || req.query.branch;
      console.log('Using branch ID:', branchId);

      if (!branchId) {
        console.error('❌ NO BRANCH ID - returning empty');
        sendSuccess(res, { orders: [], count: 0 }, 'Chef not assigned to any branch');
        return;
      }

      // Query orders with branch filter and active statuses
      console.log('Querying orders for branch:', branchId.toString());
      const { orders } = await this.orderRepository.findByBranchId(branchId.toString(), 1, 100, undefined);
      console.log('Total orders from repo:', orders.length);
      
      const filteredOrders = orders.filter((o: any) => ['PENDING', 'PREPARING', 'COOKING'].includes(o.status));
      console.log('Filtered orders (PENDING/PREPARING/COOKING):', filteredOrders.length);
      console.log('Order statuses:', orders.map((o: any) => o.status));

      console.log('=== /dashboard/chef/orders END ===');
      sendSuccess(res, { orders: filteredOrders, count: filteredOrders.length }, 'Chef orders retrieved successfully');
    } catch (error: any) {
      console.error('=== /dashboard/chef/orders ERROR ===');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      sendSuccess(res, { orders: [], count: 0, error: error.message }, 'Error fetching orders');
    }
  });

  // Cooking Orders (for Chef Dashboard - orders being prepared)
  getCookingOrders = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
      console.log('=== /dashboard/kitchen/orders/cooking START ===');
      const chefId = req.user?._id;
      let branchId = req.query.branch as string;
      console.log('Query branch from params:', branchId);

      // If no branch from query, get chef's assigned branch
      if (!branchId) {
        const User = await import('@/models/User').then(m => m.User);
        const chef = await User.findById(chefId).select('assignedBranch');
        branchId = chef?.assignedBranch?.toString();
        console.log('Branch from chef profile:', branchId);
      }

      if (!branchId) {
        console.error('❌ NO BRANCH ID - returning empty');
        sendSuccess(res, { orders: [], count: 0 }, 'No branch specified');
        return;
      }

      // Get orders with COOKING status for this branch
      console.log('Querying COOKING orders for branch:', branchId);
      const { orders } = await this.orderRepository.findByBranchId(branchId, 1, 100, undefined);
      console.log('Total orders from repo:', orders.length);
      
      const cookingOrders = orders.filter((o: any) => o.status === 'COOKING');
      console.log('COOKING orders only:', cookingOrders.length);
      console.log('All order statuses:', orders.map((o: any) => o.status));

      console.log('=== /dashboard/kitchen/orders/cooking END ===');
      sendSuccess(res, { orders: cookingOrders, count: cookingOrders.length }, 'Cooking orders retrieved successfully');
    } catch (error: any) {
      console.error('=== /dashboard/kitchen/orders/cooking ERROR ===');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      sendSuccess(res, { orders: [], count: 0, error: error.message }, 'Error fetching cooking orders');
    }
  });

  // Most Ordered Items (for Chef Dashboard)
  getMostOrderedItems = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    // Return mock data for now - can be enhanced later with real analytics
    const mockItems = [
      { rank: 1, name: 'Biryani', time: '12:30 PM' },
      { rank: 2, name: 'Karahi', time: '1:15 PM' },
      { rank: 3, name: 'Naan', time: '11:45 AM' },
    ];
    sendSuccess(res, { items: mockItems }, 'Most ordered items retrieved successfully');
  });

  // Notifications endpoint
  getNotifications = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    // Return empty notifications for now - can be enhanced later
    sendSuccess(res, { notifications: [], unreadCount: 0 }, 'Notifications retrieved successfully');
  });

  // Branch Manager Dashboard Stats
  getManagerStats = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const managerId = req.user?._id;
    const stats = await this.dashboardService.getManagerStats(managerId!.toString());
    sendSuccess(res, stats, 'Manager stats retrieved successfully');
  });

  // Branch Manager Staff
  getBranchStaff = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const managerId = req.user?._id;
    const staff = await this.dashboardService.getBranchStaff(managerId!.toString());
    sendSuccess(res, staff, 'Branch staff retrieved successfully');
  });

  // Branch Manager Inventory
  getBranchInventory = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const managerId = req.user?._id;
    const inventory = await this.dashboardService.getBranchInventory(managerId!.toString());
    sendSuccess(res, inventory, 'Branch inventory retrieved successfully');
  });

  // Branch Manager Analytics
  getBranchAnalytics = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const managerId = req.user?._id;
    const { range = '30d' } = req.query;
    const analytics = await this.dashboardService.getBranchAnalytics(managerId!.toString(), range as string);
    sendSuccess(res, analytics, 'Branch analytics retrieved successfully');
  });
}
