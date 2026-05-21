import { Response } from 'express';
import { DashboardService } from './dashboard.service';
import { sendSuccess } from '@/utils/response';
import { asyncHandler, IAuthRequest } from '@/utils';
import { logger } from '@/utils/logger';
import { OrderRepository } from '@/modules/order/order.repository';
import { normalizeOrderPayload } from '@/utils/normalizeOrderPayload';

export class DashboardController {
  private dashboardService: DashboardService;
  private orderRepository: OrderRepository;

  constructor() {
    this.dashboardService = new DashboardService();
    this.orderRepository = new OrderRepository();
  }

  // Super Admin Dashboard Stats
  getSuperAdminStats = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { branchId } = req.query as { branchId?: string };
    logger.info('📊 [SUPER_ADMIN STATS] Request received', {
      user: req.user?.email,
      role: req.user?.role,
      userId: req.user?._id,
      branchId,
    });

    const stats = await (this.dashboardService.getSuperAdminStats as any)({ branchId });

    logger.info('📊 [SUPER_ADMIN STATS] Stats retrieved successfully', {
      ordersToday: stats.ordersToday,
      totalRevenue: stats.totalRevenue,
      totalBranches: stats.totalBranches,
      totalUsers: stats.totalUsers
    });

    sendSuccess(res, stats, 'Super Admin stats retrieved successfully');
  });

  // Super Admin Branches
  getSuperAdminBranches = asyncHandler(async (req: IAuthRequest, res: Response) => {
    logger.info('🏢 [SUPER_ADMIN BRANCHES] Request received', {
      user: req.user?.email,
      role: req.user?.role,
      userId: req.user?._id
    });

    const branches = await this.dashboardService.getSuperAdminBranches();

    logger.info('🏢 [SUPER_ADMIN BRANCHES] Branches retrieved successfully', {
      totalBranches: branches.length,
      branches: branches.map(b => ({ id: b.id, name: b.name, status: b.status }))
    });

    sendSuccess(res, branches, 'Branches retrieved successfully');
  });

  // Super Admin Revenue
  getSuperAdminRevenue = asyncHandler(async (req: IAuthRequest, res: Response) => {
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
      periodCount: revenue.monthlyReport.length
    });

    sendSuccess(res, revenue, 'Revenue data retrieved successfully');
  });

  // Admin Dashboard Stats
  getAdminStats = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { period, branchId } = req.query as { period?: string; branchId?: string };
    logger.info('📊 [ADMIN STATS] Request received', {
      user: req.user?.email,
      role: req.user?.role,
      userId: req.user?._id,
      period,
      branchId,
    });

    const stats = await this.dashboardService.getAdminStats({
      period,
      branchId,
    });

    logger.info('📊 [ADMIN STATS] Stats retrieved successfully', {
      totalOrdersToday: stats.totalOrdersToday,
      totalRevenue: stats.totalRevenue,
      activeRiders: stats.activeRiders,
      activeOrders: stats.activeOrders
    });

    sendSuccess(res, stats, 'Admin stats retrieved successfully');
  });

  getAdminWaitersPerformance = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { period, branchId } = req.query as { period?: string; branchId?: string };

    const data = await this.dashboardService.getAdminWaitersPerformance({
      period,
      branchId,
    });

    sendSuccess(res, data, 'Admin waiters performance retrieved successfully');
  });

  getAdminRidersPerformance = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { period, branchId } = req.query as { period?: string; branchId?: string };

    const data = await this.dashboardService.getAdminRidersPerformance({
      period,
      branchId,
    });

    sendSuccess(res, data, 'Admin riders performance retrieved successfully');
  });

  getAdminBranchesPerformance = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { period } = req.query as { period?: string };

    const data = await this.dashboardService.getAdminBranchesPerformance({
      period,
    });

    sendSuccess(res, data, 'Admin branches performance retrieved successfully');
  });

  private resolveAdminAnalyticsContext = async (
    req: IAuthRequest,
    range: string,
    branchIdQuery?: string,
    customRange?: { startDate?: string; endDate?: string }
  ) => {
    const User = await import('@/models/User').then((m) => m.User);
    const role = String(req.user?.role || '').toUpperCase();
    let branchId =
      branchIdQuery && branchIdQuery !== 'all' ? String(branchIdQuery) : undefined;

    if (role === 'BRANCH_MANAGER') {
      const user = await User.findById(req.user!._id).select('assignedBranch');
      const assigned = user?.assignedBranch as { _id?: { toString(): string }; toString?: () => string } | undefined;
      const assignedStr =
        assigned?._id?.toString?.() ||
        (typeof assigned?.toString === 'function' ? assigned.toString() : undefined);
      branchId = assignedStr || branchId;
    }

    const analytics = await this.dashboardService.getAdminAnalytics(range, branchId, customRange);
    let branchLabel = branchId || 'All Branches';
    if (branchId) {
      const Branch = await import('@/models/Branch').then((m) => m.Branch);
      const branch = await Branch.findById(branchId).select('branchName');
      if (branch?.branchName) {
        branchLabel = branch.branchName;
      }
    }

    const periodLabel =
      customRange?.startDate && customRange?.endDate
        ? `${customRange.startDate} to ${customRange.endDate}`
        : range === '1d'
          ? 'Today'
          : range === '7d'
            ? 'Last 7 days'
            : range === '90d'
              ? 'Last 90 days'
              : range === '1y'
                ? 'Last year'
                : 'Last 30 days';

    return { analytics, branchId, branchLabel, range, periodLabel };
  };

  // Admin Analytics with time range filtering
  getAdminAnalytics = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { range = '30d', branchId, startDate, endDate } = req.query;
    const { assertBranchAccess } = await import('@/middleware/branchAccess');
    if (branchId && branchId !== 'all') {
      assertBranchAccess(req, String(branchId));
    }
    const customRange =
      startDate && endDate
        ? { startDate: String(startDate), endDate: String(endDate) }
        : undefined;

    logger.info('📈 [ADMIN ANALYTICS] Request received', {
      user: req.user?.email,
      role: req.user?.role,
      userId: req.user?._id,
      range,
      branchId,
      startDate,
      endDate,
    });

    const { analytics } = await this.resolveAdminAnalyticsContext(
      req,
      range as string,
      branchId as string | undefined,
      customRange
    );

    logger.info('📈 [ADMIN ANALYTICS] Analytics retrieved successfully', {
      range,
      totalOrders: analytics.totalOrders,
      totalRevenue: analytics.totalRevenue,
    });

    sendSuccess(res, analytics, 'Admin analytics retrieved successfully');
  });

  getAdminAnalyticsExport = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { range = '30d', branchId, startDate, endDate } = req.query;
    const customRange =
      startDate && endDate
        ? { startDate: String(startDate), endDate: String(endDate) }
        : undefined;
    const { analytics, branchLabel, range: resolvedRange, periodLabel } =
      await this.resolveAdminAnalyticsContext(
        req,
        range as string,
        branchId as string | undefined,
        customRange
      );

    const csv = this.dashboardService.buildAnalyticsCsv(analytics, {
      periodLabel,
      branchLabel,
      generatedAt: new Date().toISOString(),
    });

    sendSuccess(
      res,
      {
        csv,
        fileName: `restaurant-report-${resolvedRange}-${Date.now()}.csv`,
      },
      'Report export ready'
    );
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
      sendSuccess(
        res,
        {
          orders: filteredOrders.map((o: any) => normalizeOrderPayload(o)),
          count: filteredOrders.length,
        },
        'Chef orders retrieved successfully'
      );
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
        const chefBranch = chef?.assignedBranch as any;
        branchId = chefBranch?._id?.toString() || chefBranch?.toString() || '';
        console.log('Branch from chef profile:', branchId);
      }

      if (!branchId) {
        console.error('❌ NO BRANCH ID - returning empty');
        sendSuccess(res, { orders: [], count: 0 }, 'No branch specified');
        return;
      }

      // Get active kitchen orders for this branch
      console.log('Querying kitchen orders for branch:', branchId);
      const { orders } = await this.orderRepository.findByBranchId(branchId, 1, 100, undefined);
      console.log('Total orders from repo:', orders.length);
      
      const cookingOrders = orders;
      console.log('Kitchen orders returned (all statuses):', cookingOrders.length);
      console.log('All order statuses:', orders.map((o: any) => o.status));

      console.log('=== /dashboard/kitchen/orders/cooking END ===');
      sendSuccess(
        res,
        {
          orders: cookingOrders.map((o: any) => normalizeOrderPayload(o)),
          count: cookingOrders.length,
        },
        'Cooking orders retrieved successfully'
      );
    } catch (error: any) {
      console.error('=== /dashboard/kitchen/orders/cooking ERROR ===');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      sendSuccess(res, { orders: [], count: 0, error: error.message }, 'Error fetching cooking orders');
    }
  });

  // Most Ordered Items (for Chef Dashboard)
  getMostOrderedItems = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const chefId = req.user?._id;
    const data = await this.dashboardService.getMostOrderedItemsForChef(chefId!.toString(), { days: 7, limit: 5 });
    sendSuccess(res, data, 'Most ordered items retrieved successfully');
  });

  // Notifications endpoint
  getNotifications = asyncHandler(async (_req: IAuthRequest, res: Response): Promise<void> => {
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

  // Branch Manager Analytics (same payload shape as admin analytics)
  getBranchAnalytics = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { range = '30d', startDate, endDate } = req.query;
    const customRange =
      startDate && endDate
        ? { startDate: String(startDate), endDate: String(endDate) }
        : undefined;
    const { analytics } = await this.resolveAdminAnalyticsContext(
      req,
      range as string,
      undefined,
      customRange
    );
    sendSuccess(res, analytics, 'Branch analytics retrieved successfully');
  });

  getBranchAnalyticsExport = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { range = '30d', startDate, endDate } = req.query;
    const customRange =
      startDate && endDate
        ? { startDate: String(startDate), endDate: String(endDate) }
        : undefined;
    const { analytics, branchLabel, range: resolvedRange, periodLabel } =
      await this.resolveAdminAnalyticsContext(req, range as string, undefined, customRange);

    const csv = this.dashboardService.buildAnalyticsCsv(analytics, {
      periodLabel,
      branchLabel,
      generatedAt: new Date().toISOString(),
    });

    sendSuccess(
      res,
      {
        csv,
        fileName: `branch-report-${resolvedRange}-${Date.now()}.csv`,
      },
      'Report export ready'
    );
  });
}
