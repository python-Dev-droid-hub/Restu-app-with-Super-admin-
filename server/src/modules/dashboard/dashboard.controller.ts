import { Request, Response } from 'express';
import { DashboardService } from './dashboard.service';
import { sendSuccess } from '@/utils/response';
import { asyncHandler, IAuthRequest } from '@/utils';

export class DashboardController {
  private dashboardService: DashboardService;

  constructor() {
    this.dashboardService = new DashboardService();
  }

  // Super Admin Dashboard Stats
  getSuperAdminStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await this.dashboardService.getSuperAdminStats();
    sendSuccess(res, stats, 'Super Admin stats retrieved successfully');
  });

  // Super Admin Branches
  getSuperAdminBranches = asyncHandler(async (req: Request, res: Response) => {
    const branches = await this.dashboardService.getSuperAdminBranches();
    sendSuccess(res, branches, 'Branches retrieved successfully');
  });

  // Super Admin Revenue
  getSuperAdminRevenue = asyncHandler(async (req: Request, res: Response) => {
    const { range = '30d' } = req.query;
    const revenue = await this.dashboardService.getSuperAdminRevenue(range as string);
    sendSuccess(res, revenue, 'Revenue data retrieved successfully');
  });

  // Admin Dashboard Stats
  getAdminStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await this.dashboardService.getAdminStats();
    sendSuccess(res, stats, 'Admin stats retrieved successfully');
  });

  // Admin Analytics with time range filtering
  getAdminAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { range = '30d' } = req.query;
    const analytics = await this.dashboardService.getAdminAnalytics(range as string);
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

  // Chef Dashboard Stats
  getChefStats = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const chefId = req.user?._id;
    const stats = await this.dashboardService.getChefStats(chefId!.toString());
    sendSuccess(res, stats, 'Chef stats retrieved successfully');
  });

  // Chef Kitchen Orders
  getChefOrders = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const chefId = req.user?._id;
    const orders = await this.dashboardService.getChefOrders(chefId!.toString());
    sendSuccess(res, orders, 'Chef orders retrieved successfully');
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
