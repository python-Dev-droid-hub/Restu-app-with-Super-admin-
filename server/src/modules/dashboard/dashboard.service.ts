import { User } from '@/models/User';
import { Order } from '@/models/Order';
import { Branch } from '@/models/Branch';
import { Payment } from '@/models/Payment';
import { Product } from '@/models/Product';
import { Types } from 'mongoose';

export class DashboardService {
  // Super Admin Dashboard Stats
  async getSuperAdminStats(params?: { branchId?: string }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const branchIdRaw = params?.branchId && params.branchId !== 'all' ? params.branchId : undefined;
    const branchObjectId = branchIdRaw && Types.ObjectId.isValid(branchIdRaw) ? new Types.ObjectId(branchIdRaw) : undefined;

    const branchMatch = (() => {
      if (!branchIdRaw) return null;
      const inList: any[] = [];
      if (branchObjectId) inList.push(branchObjectId);
      if (branchIdRaw) inList.push(branchIdRaw);
      return { branch: { $in: inList } };
    })();

    const selectedBranch = branchIdRaw
      ? await Branch.findById(branchObjectId || branchIdRaw).select('_id branchName isActive')
      : null;
    
    // Today's orders
    const ordersToday = await Order.countDocuments({
      createdAt: { $gte: today },
      ...(branchMatch || {}),
    });
    
    // Total items sold today
    const todayOrders = await Order.find({
      createdAt: { $gte: today },
      ...(branchMatch || {}),
    }).select('items');
    
    const totalItemsSold = todayOrders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0);
    }, 0);
    
    // Today's revenue
    const todayRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: today }, ...(branchMatch || {}) } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]).then(result => result[0]?.total || 0);
    
    // TOTAL orders (all-time)
    const totalOrders = await Order.countDocuments({
      ...(branchMatch || {}),
    });
    
    // TOTAL revenue (all-time)
    const totalRevenue = await Order.aggregate([
      ...(branchMatch ? [{ $match: branchMatch }] : []),
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]).then(result => result[0]?.total || 0);
    
    // Total branches - count ALL branches (active and inactive)
    const totalBranches = branchIdRaw ? (selectedBranch ? 1 : 0) : await Branch.countDocuments();

    const activeBranches = branchIdRaw
      ? (selectedBranch?.isActive ? 1 : 0)
      : await Branch.countDocuments({ isActive: true });
    
    // Total users (customers)
    const totalUsers = branchIdRaw
      ? (await Order.distinct('customer', { ...(branchMatch || {}) })).length
      : await User.countDocuments({ role: 'CUSTOMER' });
    
    // Top performing branches (by orders)
    const topPerformingBranches = branchIdRaw
      ? []
      : await (async () => {
          const topBranches = await Order.aggregate([
            { $match: { createdAt: { $gte: today } } },
            { $group: { _id: '$branch', orderCount: { $sum: 1 } } },
            { $sort: { orderCount: -1 } },
            { $limit: 5 }
          ]);

          const branchIds = topBranches.map(b => b._id);
          const branches = await Branch.find({ _id: { $in: branchIds } }).select('branchName');

          return topBranches.map(tb => {
            const branch = branches.find(b => b._id.toString() === tb._id.toString());
            return {
              name: branch?.branchName || 'Unknown Branch',
              performance: Math.min(Math.round((tb.orderCount / ordersToday) * 100) || 0, 100)
            };
          });
        })();
    
    return {
      ordersToday,
      totalItemsSold,
      todayRevenue,
      totalOrders,      // All-time total
      totalRevenue,   // All-time total
      totalBranches,
      activeBranches,
      totalUsers,
      topPerformingBranches
    };
  }

  async getAdminWaitersPerformance(params?: { period?: string; branchId?: string }) {
    const period = params?.period;
    const branchIdRaw = params?.branchId && params.branchId !== 'all' ? params.branchId : undefined;
    const branchObjectId = branchIdRaw && Types.ObjectId.isValid(branchIdRaw) ? new Types.ObjectId(branchIdRaw) : undefined;

    console.log('[DEBUG Waiters] Params:', { period, branchIdRaw, branchObjectId: branchObjectId?.toString() });

    const now = new Date();
    const startDate = (() => {
      if (!period || period === 'all') return null;
      const d = new Date(now);
      if (period === 'day') {
        d.setHours(0, 0, 0, 0);
        return d;
      }
      if (period === 'week') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (period === 'month') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      // Extended periods to catch older orders
      if (period === 'quarter') return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      if (period === 'year') return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      return null;
    })();

    // Build simplified match - just branch and date, no status/orderType restrictions
    const match: any = {};
    
    if (branchIdRaw) {
      match.$or = [
        { branch: branchObjectId },
        { branch: branchIdRaw }
      ];
    }
    
    if (startDate) {
      match.$and = match.$and || [];
      match.$and.push({ $or: [{ updatedAt: { $gte: startDate } }, { createdAt: { $gte: startDate } }] });
    }

    console.log('[DEBUG Waiters] Simplified match:', JSON.stringify(match, null, 2));

    // Count ALL orders matching branch/date
    const totalOrdersInBranch = await Order.countDocuments(match);
    console.log('[DEBUG Waiters] Total orders in branch/date range:', totalOrdersInBranch);

    // Aggregate by waiter field (fallback to customer if no waiter)
    const aggregationMatch = { ...match };
    
    const rows = await Order.aggregate([
      { $match: aggregationMatch },
      {
        $project: {
          performerId: {
            $cond: {
              if: { $and: [
                { $ne: ['$waiter', null] },
                { $ne: ['$waiter', ''] },
                { $ne: [{ $type: '$waiter' }, 'missing'] }
              ]},
              then: '$waiter',
              else: '$customer'
            }
          },
          totalAmount: 1,
          status: 1,
          orderType: 1,
        }
      },
      { $match: { performerId: { $exists: true, $ne: null } } },
      { $group: { _id: '$performerId', servedOrders: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { servedOrders: -1 } },
    ]);

    console.log('[DEBUG Waiters] Aggregation result count:', rows.length);
    console.log('[DEBUG Waiters] Aggregation rows:', rows.slice(0, 5));

    // Lookup user names for these performer IDs
    const performerIds = rows.map((r: any) => r._id).filter(Boolean);
    const users = await User.find({ _id: { $in: performerIds } }).select('_id displayName email role');
    console.log('[DEBUG Waiters] Found users:', users.length);

    const userMap = new Map();
    users.forEach((u: any) => userMap.set(u._id.toString(), { name: u.displayName || u.email, role: u.role }));

    const resultRows = rows.map((r: any) => {
      const userInfo = userMap.get(r._id.toString()) || { name: 'Unknown User', role: 'CUSTOMER' };
      return {
        waiterId: r._id,
        name: userInfo.name,
        role: userInfo.role,
        servedOrders: r.servedOrders,
        revenue: r.revenue,
      };
    });

    console.log('[DEBUG Waiters] Final result rows count:', resultRows.length);

    // If branch selected, merge with staff list (show all staff even with 0 orders)
    if (branchIdRaw) {
      const staffBranchFilter: any = {
        isActive: true,
        role: 'WAITER',
        ...(branchObjectId || branchIdRaw
          ? {
              assignedBranch: {
                $in: [
                  ...(branchObjectId ? [branchObjectId] : []),
                  ...(branchIdRaw ? [branchIdRaw] : []),
                ],
              },
            }
          : {}),
      };
      const allWaiters = await User.find(staffBranchFilter).select('_id displayName email');
      console.log('[DEBUG Waiters] Staff waiters found:', allWaiters.length);

      const perfMap = new Map<string, { servedOrders: number; revenue: number; name?: string }>();
      resultRows.forEach((r: any) => {
        perfMap.set(String(r.waiterId), {
          servedOrders: Number(r.servedOrders || 0),
          revenue: Number(r.revenue || 0),
          name: r.name,
        });
      });

      const fullRows = (allWaiters || []).map((u: any) => {
        const key = u._id.toString();
        const perf = perfMap.get(key) || { servedOrders: 0, revenue: 0 };
        return {
          waiterId: u._id,
          name: u.displayName || u.email,
          servedOrders: perf.servedOrders,
          revenue: perf.revenue,
        };
      });

      // Also include any performers from orders who aren't in the staff list (e.g., customers as waiters)
      const seen = new Set(fullRows.map((r: any) => String(r.waiterId)));
      resultRows.forEach((r: any) => {
        const id = String(r?.waiterId);
        if (!id || seen.has(id)) return;
        fullRows.push({
          waiterId: r.waiterId,
          name: r.name || 'Unknown User',
          servedOrders: Number(r.servedOrders || 0),
          revenue: Number(r.revenue || 0),
        });
        seen.add(id);
      });

      fullRows.sort((a: any, b: any) => Number(b.servedOrders || 0) - Number(a.servedOrders || 0));
      console.log('[DEBUG Waiters] Final fullRows count:', fullRows.length);
      return { waiters: fullRows };
    }

    return { waiters: resultRows };
  }

  async getAdminRidersPerformance(params?: { period?: string; branchId?: string }) {
    const period = params?.period;
    const branchIdRaw = params?.branchId && params.branchId !== 'all' ? params.branchId : undefined;
    const branchObjectId = branchIdRaw && Types.ObjectId.isValid(branchIdRaw) ? new Types.ObjectId(branchIdRaw) : undefined;

    console.log('[DEBUG Riders] Params:', { period, branchIdRaw, branchObjectId: branchObjectId?.toString() });

    const now = new Date();
    const startDate = (() => {
      if (!period || period === 'all') return null;
      const d = new Date(now);
      if (period === 'day') {
        d.setHours(0, 0, 0, 0);
        return d;
      }
      if (period === 'week') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (period === 'month') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      // Extended periods to catch older orders
      if (period === 'quarter') return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      if (period === 'year') return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      return null;
    })();

    // Build simplified match - just branch, date, and rider must exist
    const match: any = {
      rider: { $exists: true, $ne: null },
    };
    
    if (branchIdRaw) {
      match.$or = [
        { branch: branchObjectId },
        { branch: branchIdRaw }
      ];
    }
    
    if (startDate) {
      match.$and = match.$and || [];
      match.$and.push({ $or: [{ updatedAt: { $gte: startDate } }, { createdAt: { $gte: startDate } }] });
    }

    console.log('[DEBUG Riders] Simplified match:', JSON.stringify(match, null, 2));

    // Count ALL orders with rider field matching branch/date
    const totalOrdersWithRider = await Order.countDocuments(match);
    console.log('[DEBUG Riders] Total orders with rider in branch/date range:', totalOrdersWithRider);

    const rows = await Order.aggregate([
      { $match: match },
      { $group: { _id: '$rider', deliveredOrders: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { deliveredOrders: -1 } },
    ]);

    console.log('[DEBUG Riders] Aggregation result count:', rows.length);
    console.log('[DEBUG Riders] Aggregation rows:', rows.slice(0, 5));

    // Lookup user names
    const riderIds = rows.map((r: any) => r._id).filter(Boolean);
    const users = await User.find({ _id: { $in: riderIds } }).select('_id displayName email role');
    console.log('[DEBUG Riders] Found users:', users.length);

    const userMap = new Map();
    users.forEach((u: any) => userMap.set(u._id.toString(), u.displayName || u.email));

    const resultRows = rows.map((r: any) => ({
      riderId: r._id,
      name: userMap.get(r._id.toString()) || 'Unknown',
      deliveredOrders: r.deliveredOrders,
      revenue: r.revenue,
    }));

    console.log('[DEBUG Riders] Final result rows count:', resultRows.length);

    if (!branchIdRaw) {
      return { riders: resultRows };
    }

    const staffBranchFilter: any = {
      isActive: true,
      role: 'RIDER',
      ...(branchObjectId || branchIdRaw
        ? {
            assignedBranch: {
              $in: [
                ...(branchObjectId ? [branchObjectId] : []),
                ...(branchIdRaw ? [branchIdRaw] : []),
              ],
            },
          }
        : {}),
    };

    const allRiders = await User.find(staffBranchFilter).select('_id displayName email');
    console.log('[DEBUG Riders] Staff riders found:', allRiders.length);

    const perfMap = new Map<string, { deliveredOrders: number; revenue: number; name?: string }>();
    resultRows.forEach((r: any) => {
      perfMap.set(String(r.riderId), {
        deliveredOrders: Number(r.deliveredOrders || 0),
        revenue: Number(r.revenue || 0),
        name: r.name,
      });
    });

    const fullRows = (allRiders || []).map((u: any) => {
      const key = u._id.toString();
      const perf = perfMap.get(key) || { deliveredOrders: 0, revenue: 0 };
      return {
        riderId: u._id,
        name: u.displayName || u.email,
        deliveredOrders: perf.deliveredOrders,
        revenue: perf.revenue,
      };
    });

    const seen = new Set(fullRows.map((r: any) => String(r.riderId)));
    resultRows.forEach((r: any) => {
      const id = String(r?.riderId);
      if (!id || seen.has(id)) return;
      fullRows.push({
        riderId: r.riderId,
        name: r.name || 'Unknown',
        deliveredOrders: Number(r.deliveredOrders || 0),
        revenue: Number(r.revenue || 0),
      });
      seen.add(id);
    });

    fullRows.sort((a: any, b: any) => Number(b.deliveredOrders || 0) - Number(a.deliveredOrders || 0));
    console.log('[DEBUG Riders] Final fullRows count:', fullRows.length);
    return { riders: fullRows };
  }

  async getAdminBranchesPerformance(params?: { period?: string; branchId?: string }) {
    const period = params?.period;
    const branchIdRaw = params?.branchId && params.branchId !== 'all' ? params.branchId : undefined;
    const branchObjectId = branchIdRaw && Types.ObjectId.isValid(branchIdRaw) ? new Types.ObjectId(branchIdRaw) : undefined;

    const now = new Date();
    const startDate = (() => {
      if (!period) return null;
      const d = new Date(now);
      if (period === 'day') {
        d.setHours(0, 0, 0, 0);
        return d;
      }
      if (period === 'week') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (period === 'month') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return null;
    })();

    const branches = await Branch.find(
      branchObjectId ? { _id: branchObjectId } : branchIdRaw ? { _id: branchIdRaw as any } : {}
    ).select('_id branchName name isActive');
    const branchList = branches.map((b: any) => ({
      branchId: b._id.toString(),
      name: b.branchName || b.name,
      isActive: !!b.isActive,
    }));

    const match: any = {};
    if (branchObjectId || branchIdRaw) {
      const branchIn: any[] = [];
      if (branchObjectId) branchIn.push(branchObjectId);
      if (branchIdRaw) branchIn.push(branchIdRaw);
      match.branch = { $in: branchIn };
    }
    if (startDate) {
      match.$or = [{ updatedAt: { $gte: startDate } }, { createdAt: { $gte: startDate } }];
    }

    const perfRows = await Order.aggregate([
      { $match: match },
      { $addFields: { branchStr: { $toString: '$branch' } } },
      {
        $group: {
          _id: '$branchStr',
          orders: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
        },
      },
    ]);

    const perfMap = new Map<string, { orders: number; revenue: number }>();
    (perfRows || []).forEach((r: any) => {
      if (!r?._id) return;
      perfMap.set(String(r._id), { orders: Number(r.orders || 0), revenue: Number(r.revenue || 0) });
    });

    const riderCounts = await User.aggregate([
      {
        $match: {
          isActive: true,
          role: 'RIDER',
          assignedBranch: { $exists: true, $ne: null },
          ...(branchObjectId || branchIdRaw
            ? {
                assignedBranch: {
                  $in: [
                    ...(branchObjectId ? [branchObjectId] : []),
                    ...(branchIdRaw ? [branchIdRaw] : []),
                  ],
                },
              }
            : {}),
        },
      },
      { $addFields: { branchStr: { $toString: '$assignedBranch' } } },
      { $group: { _id: '$branchStr', riders: { $sum: 1 } } },
    ]);
    const ridersMap = new Map<string, number>();
    (riderCounts || []).forEach((r: any) => {
      if (!r?._id) return;
      ridersMap.set(String(r._id), Number(r.riders || 0));
    });

    const results = branchList.map((b) => {
      const perf = perfMap.get(b.branchId) || { orders: 0, revenue: 0 };
      const riders = ridersMap.get(b.branchId) || 0;
      return {
        branchId: b.branchId,
        name: b.name,
        isActive: b.isActive,
        orders: perf.orders,
        revenue: perf.revenue,
        riders,
      };
    });

    results.sort((a, b) => (b.orders || 0) - (a.orders || 0));

    return { branches: results };
  }

  // Super Admin Branches Data
  async getSuperAdminBranches() {
    const branches = await Branch.find()
      .select('branchName addressLine city isActive createdAt');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const branchesWithStats = await Promise.all(
      branches.map(async (branch) => {
        // Get today's orders for this branch
        const todayOrders = await Order.countDocuments({
          branch: branch._id,
          createdAt: { $gte: today }
        });
        
        // Get total orders
        const totalOrders = await Order.countDocuments({
          branch: branch._id
        });
        
        // Get today's revenue
        const revenue = await Order.aggregate([
          { $match: { branch: branch._id, createdAt: { $gte: today } } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]).then(result => result[0]?.total || 0);
        
        // Calculate performance (mock logic based on today's orders)
        const performance = Math.min(Math.round((todayOrders / 50) * 100), 100); // Assuming 50 orders is 100%
        
        return {
          id: branch._id,
          name: branch.branchName,
          location: `${branch.addressLine}, ${branch.city}`,
          manager: 'No Manager',
          performance,
          orders: todayOrders,
          revenue,
          status: branch.isActive ? 'active' : 'inactive'
        };
      })
    );
    
    return branchesWithStats;
  }

  // Super Admin Revenue Data
  async getSuperAdminRevenue(timeRange: string = '30d') {
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    // Total revenue in period
    const totalRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]).then(result => result[0]?.total || 0);
    
    // Pending payouts (mock calculation - 70% of revenue)
    const pendingPayouts = Math.round(totalRevenue * 0.7);
    
    // Monthly report data
    const monthlyReport = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    // Branch-wise revenue
    const branchRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$branch', revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);
    
    const branchIds = branchRevenue.map(b => b._id);
    const branches = await Branch.find({ _id: { $in: branchIds } }).select('branchName');
    
    const branchWiseData = branchRevenue.map(br => {
      const branch = branches.find(b => b._id.toString() === br._id.toString());
      return {
        name: branch?.branchName || 'Unknown Branch',
        revenue: br.revenue,
        orders: br.orders,
        percentage: totalRevenue > 0 ? Math.round((br.revenue / totalRevenue) * 100) : 0
      };
    });
    
    return {
      totalRevenue,
      pendingPayouts,
      monthlyReport: monthlyReport.map(m => ({
        month: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
        revenue: m.revenue,
        orders: m.orders
      })),
      branchWise: branchWiseData
    };
  }

  // Admin Dashboard Stats
  async getAdminStats(params?: { period?: string; branchId?: string }) {
    const period = params?.period;
    const branchIdRaw = params?.branchId && params.branchId !== 'all' ? params.branchId : undefined;
    const branchObjectId = branchIdRaw && Types.ObjectId.isValid(branchIdRaw) ? new Types.ObjectId(branchIdRaw) : undefined;

    const now = new Date();
    const startDate = (() => {
      if (!period) return null;
      const d = new Date(now);
      if (period === 'day') {
        d.setHours(0, 0, 0, 0);
        return d;
      }
      if (period === 'week') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (period === 'month') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return null;
    })();

    const ordersBaseMatch: any = {};
    if (branchObjectId || branchIdRaw) {
      const branchIn: any[] = [];
      if (branchObjectId) branchIn.push(branchObjectId);
      if (branchIdRaw) branchIn.push(branchIdRaw);
      ordersBaseMatch.branch = { $in: branchIn };
    }
    if (startDate) {
      ordersBaseMatch.$or = [{ updatedAt: { $gte: startDate } }, { createdAt: { $gte: startDate } }];
    }

    const completedRevenueMatch: any = {
      ...ordersBaseMatch,
      status: { $in: ['COMPLETED', 'DELIVERED', 'SERVED'] },
      $or: [{ paymentStatus: 'SUCCESS' }, { paymentMethod: { $exists: true, $ne: null } }],
    };

    const activeOrdersMatch: any = {
      ...ordersBaseMatch,
      status: { $in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'KITCHEN_ACCEPTED', 'PICKED_UP', 'COOKING_URGENT'] },
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrdersMatch: any = { ...ordersBaseMatch };
    todayOrdersMatch.$or = [{ updatedAt: { $gte: today } }, { createdAt: { $gte: today } }];

    const [
      totalUsersAll,
      totalCustomers,
      totalRestaurants,
      totalOrders,
      activeOrders,
      totalProducts,
      revenueResult,
      totalOrdersToday,
      activeRiders,
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: true, role: 'CUSTOMER' }),
      Branch.countDocuments({ isActive: true }),
      Order.countDocuments(ordersBaseMatch),
      Order.countDocuments(activeOrdersMatch),
      Product.countDocuments({
        deletedAt: null,
        ...(branchObjectId
          ? {
              $or: [
                { branchId: branchObjectId },
                { branchId: { $exists: false } },
                { branchId: null },
              ],
            }
          : {}),
      }),
      Order.aggregate([
        { $match: completedRevenueMatch },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Order.countDocuments(todayOrdersMatch),
      User.countDocuments({
        isActive: true,
        role: 'RIDER',
        ...(branchObjectId || branchIdRaw
          ? {
              assignedBranch: {
                $in: [
                  ...(branchObjectId ? [branchObjectId] : []),
                  ...(branchIdRaw ? [branchIdRaw] : []),
                ],
              },
            }
          : {}),
      }),
    ]);

    // Calculate branch-specific or all-users count based on branch filter
    let totalUsers;
    if (branchObjectId || branchIdRaw) {
      // When branch is selected, count users assigned to that branch (staff) + customers who ordered from that branch
      const branchFilter = branchObjectId || branchIdRaw;
      const staffInBranch = await User.countDocuments({
        isActive: true,
        assignedBranch: branchFilter,
      });
      
      // Count unique customers who have orders in this branch
      const customersWithOrdersInBranch = await Order.distinct('customer', {
        branch: branchFilter,
      });
      
      totalUsers = staffInBranch + customersWithOrdersInBranch.length;
    } else {
      // When "All Branches" selected, count ALL active users in the app
      totalUsers = totalUsersAll;
    }

    const totalRevenue = revenueResult[0]?.total || 0;

    return {
      // Web dashboard fields
      totalOrders,
      activeOrders,
      totalRevenue,
      totalProducts,
      totalOrdersToday,
      activeRiders,

      // Existing fields kept for backward compatibility
      totalUsers,
      totalCustomers,
      totalRestaurants,
      usersChange: 12,
      restaurantsChange: 5,
      ordersChange: 18,
      revenueChange: 23,
    };
  }

  // Admin Analytics with time range filtering
  async getAdminAnalytics(timeRange: string = '30d', branchId?: string) {
    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const branchMatch = branchId ? { branch: (branchId as any) } : {};

    // Total revenue for the period
    const totalRevenue = branchId
      ? await Payment.aggregate([
          { $match: { status: 'COMPLETED', createdAt: { $gte: startDate } } },
          {
            $lookup: {
              from: 'orders',
              localField: 'order',
              foreignField: '_id',
              as: 'order'
            }
          },
          { $unwind: '$order' },
          { $match: { 'order.branch': (branchId as any) } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]).then(result => result[0]?.total || 0)
      : await Payment.aggregate([
          { $match: { status: 'COMPLETED', createdAt: { $gte: startDate } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]).then(result => result[0]?.total || 0);

    // Total orders for the period
    const totalOrders = await Order.countDocuments({ createdAt: { $gte: startDate }, ...branchMatch });

    // Average order value
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // Revenue by month
    const revenueByMonth = branchId
      ? await Payment.aggregate([
          { $match: { status: 'COMPLETED', createdAt: { $gte: startDate } } },
          {
            $lookup: {
              from: 'orders',
              localField: 'order',
              foreignField: '_id',
              as: 'order'
            }
          },
          { $unwind: '$order' },
          { $match: { 'order.branch': (branchId as any) } },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' }
              },
              revenue: { $sum: '$amount' },
              orders: { $sum: 1 }
            }
          },
          {
            $project: {
              month: {
                $concat: [
                  { $arrayElemAt: [['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], '$_id.month'] },
                  ' ',
                  { $toString: '$_id.year' }
                ]
              },
              revenue: 1,
              orders: 1
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } }
        ])
      : await Payment.aggregate([
          { $match: { status: 'COMPLETED', createdAt: { $gte: startDate } } },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' }
              },
              revenue: { $sum: '$amount' },
              orders: { $sum: 1 }
            }
          },
          {
            $project: {
              month: {
                $concat: [
                  { $arrayElemAt: [['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], '$_id.month'] },
                  ' ',
                  { $toString: '$_id.year' }
                ]
              },
              revenue: 1,
              orders: 1
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

    // Top restaurants
    const topRestaurants = await Payment.aggregate([
      { $match: { status: 'COMPLETED', createdAt: { $gte: startDate } } },
      {
        $lookup: {
          from: 'orders',
          localField: 'order',
          foreignField: '_id',
          as: 'order'
        }
      },
      { $unwind: '$order' },
      ...(branchId ? [{ $match: { 'order.branch': (branchId as any) } }] : []),
      {
        $lookup: {
          from: 'branches',
          localField: 'order.branch',
          foreignField: '_id',
          as: 'branch'
        }
      },
      { $unwind: '$branch' },
      {
        $group: {
          _id: '$branch._id',
          name: { $first: '$branch.branchName' },
          revenue: { $sum: '$amount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 }
    ]);

    // User growth data (simplified - using user registration dates)
    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          users: { $sum: 1 }
        }
      },
      {
        $project: {
          month: {
            $concat: [
              { $arrayElemAt: [['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], '$_id.month'] },
              ' ',
              { $toString: '$_id.year' }
            ]
          },
          users: 1
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Order status distribution
    const orderStatusDistribution = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate }, ...branchMatch } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    // Convert status distribution to expected format
    const statusMap: { [key: string]: number } = {
      PENDING: 0,
      CONFIRMED: 0,
      PREPARING: 0,
      READY: 0,
      OUT_FOR_DELIVERY: 0,
      DELIVERED: 0,
      CANCELLED: 0
    };

    orderStatusDistribution.forEach((item: any) => {
      const status = item.status.toLowerCase().replace(/\s+/g, '_');
      if (statusMap.hasOwnProperty(status.toUpperCase())) {
        statusMap[status.toUpperCase()] = item.count;
      }
    });

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      topRestaurants: topRestaurants.map(r => ({
        name: r.name || 'Unknown Restaurant',
        revenue: r.revenue,
        orders: r.orders
      })),
      revenueByMonth: revenueByMonth.map(r => ({
        month: r.month,
        revenue: r.revenue,
        orders: r.orders
      })),
      userGrowth: userGrowth.map(u => ({
        month: u.month,
        users: u.users
      })),
      orderStatusDistribution: statusMap
    };
  }

  // Customer Dashboard Stats
  async getCustomerStats(userId: string) {
    const totalOrders = await Order.countDocuments({ customer: userId });
    const recentOrders = await Order.find({ customer: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('items.product');

    return {
      totalOrders,
      recentOrders,
      favorites: []
    };
  }

  // Rider Dashboard Stats
  async getRiderStats(riderId: string) {
    const assignedDeliveries = await Order.countDocuments({
      rider: riderId,
      status: { $in: ['RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'IN_DELIVERY'] },
    });
    const completedDeliveries = await Order.countDocuments({
      rider: riderId,
      status: { $in: ['DELIVERED', 'COMPLETED'] },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const [todayEarnings, thisWeekEarnings] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            rider: (typeof riderId === 'string' ? (new (require('mongoose').Types.ObjectId)(riderId)) : riderId) as any,
            status: { $in: ['DELIVERED', 'COMPLETED'] },
            updatedAt: { $gte: todayStart },
          },
        },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$deliveryFee', 0] } } } },
      ]).then((r) => r[0]?.total || 0),
      Order.aggregate([
        {
          $match: {
            rider: (typeof riderId === 'string' ? (new (require('mongoose').Types.ObjectId)(riderId)) : riderId) as any,
            status: { $in: ['DELIVERED', 'COMPLETED'] },
            updatedAt: { $gte: weekStart },
          },
        },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$deliveryFee', 0] } } } },
      ]).then((r) => r[0]?.total || 0),
    ]);

    return {
      assignedDeliveries,
      completedDeliveries,
      todayEarnings,
      thisWeekEarnings,
    };
  }

  // Rider Earnings
  async getRiderEarnings(riderId: string) {
    const rider = await User.findById(riderId);
    if (!rider) {
      return {
        totalEarnings: 0,
        thisWeekEarnings: 0,
        thisMonthEarnings: 0,
        lastMonthEarnings: 0,
        weeklyBreakdown: []
      };
    }

    // NOTE: This codebase does not persist rider earnings in Payment documents.
    // Calculate earnings from delivered/completed rider orders using deliveryFee.
    const totalEarnings = await Order.aggregate([
      { $match: { rider: rider._id, status: { $in: ['DELIVERED', 'COMPLETED'] } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$deliveryFee', 0] } } } },
    ]).then((result) => result[0]?.total || 0);

    // Calculate this week's earnings
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const thisWeekEarnings = await Order.aggregate([
      {
        $match: {
          rider: rider._id,
          status: { $in: ['DELIVERED', 'COMPLETED'] },
          updatedAt: { $gte: weekStart },
        },
      },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$deliveryFee', 0] } } } },
    ]).then((result) => result[0]?.total || 0);

    // Calculate this month's earnings
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const thisMonthEarnings = await Order.aggregate([
      {
        $match: {
          rider: rider._id,
          status: { $in: ['DELIVERED', 'COMPLETED'] },
          updatedAt: { $gte: monthStart },
        },
      },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$deliveryFee', 0] } } } },
    ]).then((result) => result[0]?.total || 0);

    // Calculate last month's earnings
    const lastMonthStart = new Date(monthStart);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    const lastMonthEnd = new Date(monthStart);
    lastMonthEnd.setDate(0); // Last day of previous month

    const lastMonthEarnings = await Order.aggregate([
      {
        $match: {
          rider: rider._id,
          status: { $in: ['DELIVERED', 'COMPLETED'] },
          updatedAt: { $gte: lastMonthStart, $lt: lastMonthEnd },
        },
      },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$deliveryFee', 0] } } } },
    ]).then((result) => result[0]?.total || 0);

    return {
      totalEarnings,
      thisWeekEarnings,
      thisMonthEarnings,
      lastMonthEarnings,
      weeklyBreakdown: [] // Could implement daily breakdown if needed
    };
  }

  // Waiter Dashboard Stats
  async getWaiterStats(waiterId: string) {
    const waiter = await User.findById(waiterId);
    const branchId = waiter?.assignedBranch;

    const baseFilter: any = {
      orderType: 'DINE_IN',
    };

    if (branchId) {
      baseFilter.branch = branchId;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [activeOrders, readyToServe, servedToday] = await Promise.all([
      Order.countDocuments({
        ...baseFilter,
        status: { $in: ['PENDING', 'KITCHEN_ACCEPTED', 'PREPARING', 'PICKED_UP'] },
      }),
      Order.countDocuments({
        ...baseFilter,
        status: 'READY',
      }),
      Order.countDocuments({
        ...baseFilter,
        status: { $in: ['COMPLETED', 'SERVED', 'DELIVERED'] },
        updatedAt: { $gte: todayStart },
      }),
    ]);

    // Keep legacy fields for older clients
    const activeTables = await Order.countDocuments({
      ...baseFilter,
      status: { $in: ['PENDING', 'PREPARING', 'READY'] },
    });

    return {
      active_orders: activeOrders,
      ready_to_serve: readyToServe,
      served_today: servedToday,
      activeTables,
      ordersToServe: readyToServe,
      recentOrders: [],
    };
  }

  // Chef Dashboard Stats
  async getChefStats(chefId: string) {
    const pendingOrders = await Order.countDocuments({
      status: 'PENDING'
    });
    const preparingOrders = await Order.countDocuments({
      status: 'PREPARING'
    });
    const completedToday = await Order.countDocuments({
      status: 'READY',
      updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    return {
      pendingOrders,
      preparingOrders,
      completedToday,
      avgPreparationTime: 15
    };
  }

  // Chef Kitchen Orders
  async getChefOrders(chefId: string) {
    // Get orders that are pending or preparing (kitchen queue)
    const orders = await Order.find({
      status: { $in: ['PENDING', 'PREPARING'] }
    })
    .sort({ createdAt: 1 }) // FIFO order
    .limit(20) // Limit to prevent overwhelming the UI
    .populate('items.product')
    .populate('customer', 'displayName email')
    .populate('branch', 'branchName');

    return orders.map((order: any) => ({
      id: order._id,
      orderNumber: order.orderNumber || `ORD-${order._id.toString().slice(-6).toUpperCase()}`,
      tableNumber: order.tableNumber || (order.orderType === 'DELIVERY' ? 'DEL' : 'TAKE'),
      orderType: order.orderType,
      items: order.items.map((item: any) => ({
        id: item._id,
        name: item.product?.name || item.productName || 'Unknown Item',
        quantity: item.quantity,
        status: item.status || 'PENDING',
        preparationTime: item.preparationTime || 15,
        specialInstructions: item.specialInstructions,
        image: item.product?.image || item.product?.imageUrl || null
      })),
      priority: this.calculateOrderPriority(order),
      orderTime: order.createdAt ? new Date(order.createdAt).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      }) : 'Unknown',
      estimatedReadyTime: this.calculateEstimatedReadyTime(order),
      createdAt: order.createdAt,
      status: order.status,
      specialInstructions: order.specialInstructions
    }));
  }

  // Helper method to calculate order priority
  private calculateOrderPriority(order: any): 'NORMAL' | 'HIGH' | 'URGENT' {
    const ageInMinutes = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60);
    
    if (order.orderType === 'DELIVERY' && ageInMinutes > 30) return 'URGENT';
    if (order.orderType === 'DINE_IN' && ageInMinutes > 20) return 'HIGH';
    if (order.status === 'PREPARING' && ageInMinutes > 15) return 'HIGH';
    
    return 'NORMAL';
  }

  // Helper method to calculate estimated ready time
  private calculateEstimatedReadyTime(order: any): string {
    const totalPrepTime = order.items.reduce((total: number, item: any) => 
      total + (item.preparationTime || 15), 0);
    
    const estimatedTime = new Date(Date.now() + totalPrepTime * 60 * 1000);
    return estimatedTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  }

  // Branch Manager Dashboard Stats
  async getManagerStats(managerId: string) {
    const manager = await User.findById(managerId);
    const branchId = manager?.assignedBranch;

    const totalOrders = await Order.countDocuments({ branch: branchId });
    const todayOrders = await Order.countDocuments({
      branch: branchId,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    // Calculate revenue from completed orders with successful payment
    const revenueResult = await Order.aggregate([
      { 
        $match: { 
          branch: branchId,
          status: 'COMPLETED',
          $or: [
            { paymentStatus: 'SUCCESS' },
            { paymentMethod: { $exists: true, $ne: null } }
          ]
        } 
      },
      { 
        $group: { 
          _id: null, 
          totalRevenue: { $sum: '$totalAmount' } 
        } 
      }
    ]);
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;
    
    // Calculate today's revenue
    const todayRevenueResult = await Order.aggregate([
      { 
        $match: { 
          branch: branchId,
          status: 'COMPLETED',
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          $or: [
            { paymentStatus: 'SUCCESS' },
            { paymentMethod: { $exists: true, $ne: null } }
          ]
        } 
      },
      { 
        $group: { 
          _id: null, 
          totalRevenue: { $sum: '$totalAmount' } 
        } 
      }
    ]);
    const todayRevenue = todayRevenueResult[0]?.totalRevenue || 0;
    
    // Count total users (staff + manager) for this branch
    const totalUsers = await User.countDocuments({
      $or: [
        { assignedBranch: branchId },
        { _id: managerId }
      ],
      role: { $in: ['WAITER', 'CHEF', 'RIDER', 'BRANCH_MANAGER', 'ADMIN'] }
    });

    return {
      totalOrders,
      todayOrders,
      totalUsers,
      totalRevenue,
      todayRevenue,
      activeStaff: 0
    };
  }

  // Branch Manager Staff
  async getBranchStaff(managerId: string) {
    const manager = await User.findById(managerId);
    const branchId = manager?.assignedBranch;

    if (!branchId) {
      return [];
    }

    const staff = await User.find({
      assignedBranch: branchId,
      role: { $in: ['WAITER', 'CHEF', 'RIDER'] }
    }).select('name email phoneNumber role isActive assignedSection specialization');

    return staff.map((member: any) => ({
      id: member._id,
      name: member.name,
      email: member.email,
      role: member.role,
      phone: member.phoneNumber,
      isActive: member.isActive,
      shift: member.assignedSection || 'Not Assigned'
    }));
  }

  // Branch Manager Inventory
  async getBranchInventory(managerId: string) {
    // For now, return mock inventory data as we don't have an inventory model yet
    // This should be replaced with actual inventory queries when the inventory system is implemented
    return [
      { id: '1', name: 'Chicken Breast', quantity: 25, reorderLevel: 10, unit: 'kg', lastRestocked: new Date().toISOString().split('T')[0] },
      { id: '2', name: 'Tomatoes', quantity: 8, reorderLevel: 15, unit: 'kg', lastRestocked: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
      { id: '3', name: 'Pizza Dough', quantity: 50, reorderLevel: 20, unit: 'pcs', lastRestocked: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
      { id: '4', name: 'Olive Oil', quantity: 12, reorderLevel: 5, unit: 'liters', lastRestocked: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
      { id: '5', name: 'Cheese', quantity: 18, reorderLevel: 10, unit: 'kg', lastRestocked: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
    ];
  }

  // Branch Manager Analytics
  async getBranchAnalytics(managerId: string, timeRange: string = '30d') {
    const manager = await User.findById(managerId);
    const branchId = manager?.assignedBranch;

    if (!branchId) {
      return {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        topRestaurants: [],
        revenueByMonth: [],
        userGrowth: [],
        orderStatusDistribution: {
          PENDING: 0,
          CONFIRMED: 0,
          PREPARING: 0,
          READY: 0,
          OUT_FOR_DELIVERY: 0,
          DELIVERED: 0,
          CANCELLED: 0,
        },
      };
    }

    return this.getAdminAnalytics(timeRange, branchId.toString());
  }
}
