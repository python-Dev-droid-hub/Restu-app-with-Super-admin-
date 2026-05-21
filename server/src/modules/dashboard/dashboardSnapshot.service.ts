import { Types } from 'mongoose';
import { Branch } from '@/models/Branch';
import { DashboardService } from './dashboard.service';
import { MenuRepository } from '@/modules/menu/menu.repository';
import { OrderRepository } from '@/modules/order/order.repository';
import { TableRepository } from '@/modules/table/table.repository';
import { NotificationService } from '@/modules/notification/notification.service';
import { normalizeOrderPayload } from '@/utils/normalizeOrderPayload';

export function buildAdminOrderFilter(
  role: string,
  assignedBranchId: string,
  effectiveBranchId: string
): { filter: Record<string, unknown> | null } {
  const branchObjectId =
    effectiveBranchId && Types.ObjectId.isValid(effectiveBranchId)
      ? new Types.ObjectId(effectiveBranchId)
      : undefined;
  const branchIdForMatch = effectiveBranchId
    ? branchObjectId
      ? { $in: [branchObjectId, effectiveBranchId] }
      : effectiveBranchId
    : undefined;

  const filter: Record<string, unknown> = {};
  if (role === 'BRANCH_MANAGER') {
    if (!assignedBranchId) return { filter: null };
    filter.branch = branchIdForMatch;
  } else if (effectiveBranchId) {
    filter.branch = branchIdForMatch;
  }
  return { filter };
}

function normalizeOrder(o: unknown) {
  return normalizeOrderPayload(o as Record<string, unknown>);
}

export class DashboardSnapshotService {
  private dashboardService = new DashboardService();
  private menuRepository = new MenuRepository();
  private orderRepository = new OrderRepository();
  private tableRepository = new TableRepository();
  private notificationService = new NotificationService();

  async getAdminBranches(role: string, assignedBranchId: string) {
    const query: Record<string, unknown> = { deletedAt: null };
    if (role === 'BRANCH_MANAGER') {
      if (!assignedBranchId) return { branches: [] };
      query._id = assignedBranchId;
    }

    const branches = await Branch.find(query)
      .select('_id branchName currency isActive')
      .sort({ branchName: 1 });

    return {
      branches: (branches || []).map((b) => {
        const doc = b as { _id?: { toString(): string }; branchName?: string; currency?: string; isActive?: boolean };
        return {
          _id: doc._id?.toString?.() || '',
          branchName: doc.branchName,
          currency: doc.currency,
          isActive: doc.isActive,
        };
      }),
    };
  }

  async getAdminDashboard(
    role: string,
    assignedBranchId: string,
    params?: { period?: string; branchId?: string; limit?: number }
  ) {
    const requestedBranchId =
      params?.branchId && params.branchId !== 'all' ? String(params.branchId) : '';
    const effectiveBranchId =
      role === 'BRANCH_MANAGER' ? assignedBranchId || '' : requestedBranchId;
    const period = params?.period && params.period !== 'all' ? String(params.period) : undefined;
    const limit =
      typeof params?.limit === 'number' && params.limit > 0 ? Math.min(params.limit, 200) : 50;

    const orderFilterResult = buildAdminOrderFilter(role, assignedBranchId, effectiveBranchId);
    const orderFilter = orderFilterResult.filter;

    const [stats, waitersPerformance, ridersPerformance, branchesPerformance, ordersResult, unreadCount, recentProducts, totalProducts] =
      await Promise.all([
        this.dashboardService.getAdminStats({
          period,
          branchId: effectiveBranchId || undefined,
        }),
        this.dashboardService.getAdminWaitersPerformance({
          period,
          branchId: effectiveBranchId || undefined,
        }),
        this.dashboardService.getAdminRidersPerformance({
          period,
          branchId: effectiveBranchId || undefined,
        }),
        this.dashboardService.getAdminBranchesPerformance({ period }),
        (async () => {
          if (orderFilter === null) return { orders: [], total: 0 };
          const orders = await this.orderRepository.findAllOrders(orderFilter, 1, limit);
          const total = await this.orderRepository.countOrders(orderFilter);
          return { orders: (orders || []).map(normalizeOrder), total };
        })(),
        this.notificationService.getAdminUnreadCount(),
        this.menuRepository.findAllProducts({}, 1, 5),
        this.menuRepository.countProducts({}),
      ]);

    return {
      stats: stats
        ? { ...(stats as object), totalProducts: typeof totalProducts === 'number' ? totalProducts : 0 }
        : stats,
      waitersPerformance,
      ridersPerformance,
      branchesPerformance,
      orders: ordersResult.orders,
      ordersTotal: ordersResult.total,
      recentProducts: (recentProducts || []).map((p: { toObject?: () => unknown }) =>
        p?.toObject ? p.toObject() : p
      ),
      unreadCount,
      timestamp: new Date().toISOString(),
    };
  }

  async getChefDashboard(userId: string, role: string, assignedBranchId: string) {
    const branchId = role === 'ADMIN' || role === 'SUPER_ADMIN' ? '' : assignedBranchId || '';
    if (!userId || !branchId) {
      return {
        orders: [],
        cookingOrders: [],
        mostOrdered: [],
        notifications: [],
        unreadCount: 0,
      };
    }

    const branchObjectId = Types.ObjectId.isValid(branchId) ? new Types.ObjectId(branchId) : undefined;
    const branchMatch = branchObjectId ? { $in: [branchObjectId, branchId] } : branchId;

    const [ordersList, cookingResult, mostOrderedResult, notifResult, unreadCount] = await Promise.all([
      this.orderRepository.findAllOrders({ branch: branchMatch }, 1, 200),
      this.orderRepository.findByBranchId(branchId, 1, 100, undefined),
      this.dashboardService.getMostOrderedItemsForChef(userId, { days: 7, limit: 5 }),
      this.notificationService.getChefNotifications(userId, branchId, 1, 30),
      this.notificationService.getChefUnreadCount(userId, branchId),
    ]);

    return {
      orders: (ordersList || []).map(normalizeOrder),
      cookingOrders: (cookingResult?.orders || []).map(normalizeOrder),
      mostOrdered: (mostOrderedResult as { items?: unknown[] })?.items || [],
      notifications: (notifResult as { notifications?: unknown[] })?.notifications || [],
      unreadCount: typeof unreadCount === 'number' ? unreadCount : 0,
    };
  }

  async getWaiterDashboard(userId: string, assignedBranchId: string) {
    if (!userId) {
      return {
        stats: null,
        orders: [],
        tables: [],
        timestamp: new Date().toISOString(),
      };
    }

    const stats = await this.dashboardService.getWaiterStats(userId);
    const branchId = assignedBranchId || '';
    const branchObjectId =
      branchId && Types.ObjectId.isValid(branchId) ? new Types.ObjectId(branchId) : undefined;
    const branchMatch = branchId
      ? { $in: [...(branchObjectId ? [branchObjectId] : []), branchId] }
      : undefined;

    const [ordersList, tablesList] = await Promise.all([
      this.orderRepository.findAllOrders(
        {
          ...(branchMatch ? { branch: branchMatch } : {}),
          orderType: 'DINE_IN',
        },
        1,
        500
      ),
      branchId ? this.tableRepository.findAll({ branch: branchObjectId || branchId }) : [],
    ]);

    return {
      stats,
      orders: (ordersList || []).map(normalizeOrder),
      tables: tablesList || [],
      timestamp: new Date().toISOString(),
    };
  }
}
