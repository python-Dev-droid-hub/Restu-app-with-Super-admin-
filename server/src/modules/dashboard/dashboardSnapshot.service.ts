import { Types } from 'mongoose';
import { Branch } from '@/models/Branch';
import { User } from '@/models/User';
import { DashboardService } from './dashboard.service';
import { MenuRepository } from '@/modules/menu/menu.repository';
import { OrderRepository } from '@/modules/order/order.repository';
import { TableRepository } from '@/modules/table/table.repository';
import { NotificationService } from '@/modules/notification/notification.service';
import { normalizeOrderPayload } from '@/utils/normalizeOrderPayload';
import { tenantBranchFilter, buildTenantOrderScope, tenantDataFilter } from '@/utils/tenantScope';

export async function buildAdminOrderFilter(
  role: string,
  assignedBranchId: string,
  effectiveBranchId: string,
  tenantId?: string
): Promise<{ filter: Record<string, unknown> | null }> {
  const branchObjectId =
    effectiveBranchId && Types.ObjectId.isValid(effectiveBranchId)
      ? new Types.ObjectId(effectiveBranchId)
      : undefined;
  const branchIdForMatch = effectiveBranchId
    ? branchObjectId
      ? { $in: [branchObjectId, effectiveBranchId] }
      : effectiveBranchId
    : undefined;

  const and: Record<string, unknown>[] = [];
  if (tenantId) {
    const tenantScope = await buildTenantOrderScope(tenantId);
    if (Object.keys(tenantScope).length) and.push(tenantScope);
  }

  if (role === 'BRANCH_MANAGER') {
    if (!assignedBranchId) return { filter: null };
    and.push({ branch: branchIdForMatch });
  } else if (effectiveBranchId) {
    and.push({ branch: branchIdForMatch });
  }

  if (!and.length) return { filter: {} };
  if (and.length === 1) return { filter: and[0] };
  return { filter: { $and: and } };
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

  async getAdminBranches(role: string, assignedBranchId: string, tenantId?: string) {
    const query: Record<string, unknown> = { deletedAt: null, ...tenantBranchFilter(tenantId) };
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
    params?: { period?: string; branchId?: string; limit?: number; tenantId?: string }
  ) {
    const tenantId = params?.tenantId;
    const requestedBranchId =
      params?.branchId && params.branchId !== 'all' ? String(params.branchId) : '';
    const effectiveBranchId =
      role === 'BRANCH_MANAGER' ? assignedBranchId || '' : requestedBranchId;
    const period = params?.period && params.period !== 'all' ? String(params.period) : undefined;
    const limit =
      typeof params?.limit === 'number' && params.limit > 0 ? Math.min(params.limit, 200) : 50;

    const orderFilterResult = await buildAdminOrderFilter(role, assignedBranchId, effectiveBranchId, tenantId);
    const orderFilter = orderFilterResult.filter;

    const [stats, waitersPerformance, ridersPerformance, branchesPerformance, ordersResult, unreadCount, recentProducts, totalProducts] =
      await Promise.all([
        this.dashboardService.getAdminStats({
          period,
          branchId: effectiveBranchId || undefined,
          tenantId,
        }),
        this.dashboardService.getAdminWaitersPerformance({
          period,
          branchId: effectiveBranchId || undefined,
          tenantId,
        }),
        this.dashboardService.getAdminRidersPerformance({
          period,
          branchId: effectiveBranchId || undefined,
          tenantId,
        }),
        this.dashboardService.getAdminBranchesPerformance({ period, tenantId }),
        (async () => {
          if (orderFilter === null) return { orders: [], total: 0 };
          const orders = await this.orderRepository.findAllOrders(orderFilter, 1, limit);
          const total = await this.orderRepository.countOrders(orderFilter);
          return { orders: (orders || []).map(normalizeOrder), total };
        })(),
        this.notificationService.getAdminUnreadCount(),
        this.menuRepository.findAllProducts(tenantDataFilter(tenantId), 1, 5),
        this.menuRepository.countProducts(tenantDataFilter(tenantId)),
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
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
    let branchId = isAdmin ? assignedBranchId || '' : assignedBranchId || '';

    if (!branchId && userId) {
      const { User } = await import('@/models/User');
      const chef = await User.findById(userId).select('assignedBranch').lean();
      const ab = (chef as any)?.assignedBranch;
      branchId = ab?._id?.toString?.() || (ab ? String(ab) : '');
    }

    if (!userId) {
      return {
        orders: [],
        cookingOrders: [],
        mostOrdered: [],
        notifications: [],
        unreadCount: 0,
      };
    }

    if (!branchId && !isAdmin) {
      return {
        orders: [],
        cookingOrders: [],
        mostOrdered: [],
        notifications: [],
        unreadCount: 0,
      };
    }

    const branchObjectId = branchId && Types.ObjectId.isValid(branchId) ? new Types.ObjectId(branchId) : undefined;
    const branchMatch = branchId
      ? { $in: [...(branchObjectId ? [branchObjectId] : []), branchId] }
      : undefined;
    const orderBranchFilter = branchMatch ? { branch: branchMatch } : {};

    const [ordersList, cookingResult, mostOrderedResult, notifResult, unreadCount] = await Promise.all([
      this.orderRepository.findAllOrders(orderBranchFilter, 1, 200),
      branchId
        ? this.orderRepository.findByBranchId(branchId, 1, 200, undefined)
        : Promise.resolve({ orders: [], total: 0 }),
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

  async getRiderDashboard(userId: string) {
    if (!userId) {
      return {
        stats: {
          assignedDeliveries: 0,
          completedDeliveries: 0,
          todayEarnings: 0,
          thisWeekEarnings: 0,
        },
        earnings: {
          totalEarnings: 0,
          thisWeekEarnings: 0,
          thisMonthEarnings: 0,
          lastMonthEarnings: 0,
        },
        orders: [],
        availableOrders: [],
        notifications: [],
        unreadCount: 0,
        onDuty: false,
        timestamp: new Date().toISOString(),
      };
    }

    const page = 1;
    const limit = 50;

    const [stats, earnings, assignedResult, availableResult, notifResult, unreadCount, riderUser] =
      await Promise.all([
        this.dashboardService.getRiderStats(userId),
        this.dashboardService.getRiderEarnings(userId),
        this.orderRepository.findByRiderId(userId, page, limit),
        this.orderRepository.getAvailableOrdersForRiders(1, 10),
        this.notificationService.getRiderNotifications(userId, 1, 30),
        this.notificationService.getRiderUnreadCount(userId),
        User.findById(userId).select('onDuty'),
      ]);

    const assignedIds = new Set((assignedResult?.orders || []).map((o: { _id: { toString(): string } }) => o._id.toString()));
    const availableOnly = (availableResult?.orders || []).filter(
      (o: { _id: { toString(): string } }) => !assignedIds.has(o._id.toString())
    );

    return {
      stats,
      earnings,
      orders: (assignedResult?.orders || []).map(normalizeOrder),
      availableOrders: availableOnly.map(normalizeOrder),
      notifications: (notifResult as { notifications?: unknown[] })?.notifications || [],
      unreadCount: typeof unreadCount === 'number' ? unreadCount : 0,
      onDuty: !!(riderUser as { onDuty?: boolean } | null)?.onDuty,
      timestamp: new Date().toISOString(),
    };
  }
}
