import {
  Tenant,
  Plan,
  Subscription,
  TenantActivityLog,
  SupportTicket,
} from '@/superadmin/models';
import { Order } from '@/models/Order';

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1).toLocaleString('en', { month: 'short', year: '2-digit' });
}

function calcMrrFromSub(sub: any): number {
  const plan = sub.planId;
  if (!plan) return 0;
  return sub.billingCycle === 'YEARLY'
    ? (plan.priceYearly || plan.priceMonthly * 12) / 12
    : plan.priceMonthly;
}

export async function getDashboardMetrics() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);
  const trialWarningDate = new Date(now);
  trialWarningDate.setDate(now.getDate() + 3);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thirtyDaysAgo = new Date(startOfToday);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

  const [
    totalTenants,
    activeTenants,
    trialTenants,
    newTenantsThisMonth,
    newTenantsLastMonth,
    newSignupsThisWeek,
    newSignupsLast24h,
    tenantsByPlan,
    recentActivity,
    trialExpiringSoon,
    pastDueTenants,
    suspendedTenants,
    urgentTickets,
    activeSubscriptions,
    allSubscriptions,
    totalOrdersToday,
    orderVolumeAgg,
  ] = await Promise.all([
    Tenant.countDocuments({}),
    Tenant.countDocuments({ subscriptionStatus: 'ACTIVE', isActive: true }),
    Tenant.countDocuments({ subscriptionStatus: 'TRIAL', isActive: true }),
    Tenant.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Tenant.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
    Tenant.countDocuments({ createdAt: { $gte: startOfWeek } }),
    Tenant.countDocuments({ createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } }),
    Tenant.aggregate([{ $group: { _id: '$planId', count: { $sum: 1 } } }]),
    TenantActivityLog.find({}).sort({ createdAt: -1 }).limit(10).populate('tenantId', 'name slug'),
    Tenant.find({
      subscriptionStatus: 'TRIAL',
      trialEndsAt: { $lte: trialWarningDate, $gte: now },
      isActive: true,
    }).select('name slug ownerEmail trialEndsAt').limit(10),
    Tenant.find({ subscriptionStatus: 'PAST_DUE', isActive: true }).select('name slug ownerEmail').limit(10),
    Tenant.find({ subscriptionStatus: 'SUSPENDED' }).select('name slug ownerEmail subscriptionStatus').limit(10),
    SupportTicket.find({
      priority: { $in: ['HIGH', 'URGENT'] },
      status: { $nin: ['RESOLVED', 'CLOSED'] },
    }).populate('tenantId', 'name slug').limit(10),
    Subscription.find({ status: 'ACTIVE' }).populate('planId', 'name priceMonthly priceYearly'),
    Subscription.find({}).populate('planId', 'name priceMonthly priceYearly'),
    Order.countDocuments({ createdAt: { $gte: startOfToday }, deletedAt: null }),
    Order.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, deletedAt: null } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const nearLimitTenants = await Tenant.find({ isActive: true }).populate('planId');
  const orderLimitAlerts = nearLimitTenants
    .filter((t) => {
      const plan = t.planId as any;
      return plan && t.currentMonthOrders >= plan.maxOrdersPerMonth * 0.8;
    })
    .slice(0, 10)
    .map((t) => {
      const plan = t.planId as any;
      const limit = plan?.maxOrdersPerMonth ?? 0;
      const usage = t.currentMonthOrders || 0;
      return {
        _id: t._id,
        name: t.name,
        slug: t.slug,
        usage,
        limit,
        exceeded: limit > 0 && usage >= limit,
      };
    });

  const planIds = tenantsByPlan.map((p) => p._id).filter(Boolean);
  const plans = await Plan.find({ _id: { $in: planIds } });
  const planMap = new Map(plans.map((p) => [String(p._id), p]));

  let mrr = 0;
  for (const sub of activeSubscriptions) {
    mrr += calcMrrFromSub(sub);
  }

  const tenantGrowthPercent =
    newTenantsLastMonth > 0
      ? Math.round(((newTenantsThisMonth - newTenantsLastMonth) / newTenantsLastMonth) * 100)
      : newTenantsThisMonth > 0 ? 100 : 0;

  const planDistribution = tenantsByPlan.map((entry) => {
    const plan = planMap.get(String(entry._id));
    return { planId: entry._id, planName: plan?.name || 'Unknown', count: entry.count };
  });

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const tenantGrowthByMonth = await Tenant.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const tenantGrowthChart = tenantGrowthByMonth.map((row) => ({
    label: monthLabel(row._id.year, row._id.month),
    count: row.count,
  }));

  // Revenue by month (last 12 months) from subscription records
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const revenueByMonth: { label: string; monthly: number; yearly: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const label = monthLabel(d.getFullYear(), d.getMonth() + 1);

    let monthly = 0;
    let yearly = 0;
    for (const sub of allSubscriptions) {
      if (sub.createdAt >= d && sub.createdAt <= monthEnd) {
        if (sub.billingCycle === 'YEARLY') yearly += sub.amount;
        else monthly += sub.amount;
      }
    }
    revenueByMonth.push({ label, monthly: Math.round(monthly), yearly: Math.round(yearly) });
  }

  const orderVolumeMap = new Map(orderVolumeAgg.map((r: any) => [r._id, r.count]));
  const orderVolumeByDay = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(startOfToday);
    d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().slice(0, 10);
    return {
      label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      orders: orderVolumeMap.get(key) || 0,
    };
  });

  return {
    metrics: {
      totalTenants,
      activeTenants,
      trialTenants,
      mrr: Math.round(mrr),
      newSignupsThisWeek,
      newSignupsLast24h,
      tenantGrowthPercent,
      totalOrdersToday,
    },
    alerts: {
      trialExpiringSoon,
      pastDueTenants,
      suspendedTenants,
      urgentTickets,
      orderLimitAlerts,
      newSignupsLast24h: await Tenant.find({
        createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      }).select('name slug ownerEmail createdAt').limit(5),
    },
    charts: {
      revenueByMonth,
      tenantGrowthChart,
      planDistribution,
      orderVolumeByDay,
    },
    recentActivity,
  };
}

export async function getBillingAnalytics() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [
    activeSubscriptions,
    totalTenants,
    cancelledThisMonth,
    cancelledLastMonth,
    newSubsThisMonth,
    allPlans,
  ] = await Promise.all([
    Subscription.find({ status: 'ACTIVE' }).populate('planId'),
    Tenant.countDocuments({ isActive: true }),
    Subscription.countDocuments({ status: 'CANCELLED', cancelledAt: { $gte: startOfMonth } }),
    Subscription.countDocuments({
      status: 'CANCELLED',
      cancelledAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
    }),
    Subscription.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Plan.find({}),
  ]);

  let mrr = 0;
  const revenueByPlan: Record<string, number> = {};

  for (const sub of activeSubscriptions) {
    const mrrAmount = calcMrrFromSub(sub);
    mrr += mrrAmount;
    const planName = (sub.planId as any)?.name || 'Unknown';
    revenueByPlan[planName] = (revenueByPlan[planName] || 0) + mrrAmount;
  }

  const arr = mrr * 12;
  const arpu = totalTenants > 0 ? mrr / totalTenants : 0;

  const churnRate =
    cancelledLastMonth > 0
      ? Math.round((cancelledThisMonth / Math.max(totalTenants, 1)) * 1000) / 10
      : 0;

  const mrrGrowth: { label: string; mrr: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    let monthMrr = 0;
    for (const sub of activeSubscriptions) {
      if (sub.startedAt <= monthEnd && sub.endsAt >= d) {
        monthMrr += calcMrrFromSub(sub);
      }
    }
    mrrGrowth.push({
      label: monthLabel(d.getFullYear(), d.getMonth() + 1),
      mrr: Math.round(monthMrr),
    });
  }

  const planBreakdown = await Promise.all(
    allPlans.map(async (p) => ({
      planName: p.name,
      mrr: Math.round(revenueByPlan[p.name] || 0),
      tenantCount: await Tenant.countDocuments({ planId: p._id, isActive: true }),
    }))
  );

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const cancelledByMonth = await Subscription.aggregate([
    { $match: { status: 'CANCELLED', cancelledAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: { year: { $year: '$cancelledAt' }, month: { $month: '$cancelledAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const churnByMonth = cancelledByMonth.map((row) => ({
    label: monthLabel(row._id.year, row._id.month),
    churned: row.count,
  }));

  const statusCounts = await Subscription.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const totalSubs = statusCounts.reduce((s, r) => s + r.count, 0);
  const activeCount = statusCounts.find((s) => s._id === 'ACTIVE')?.count || 0;
  const failedCount = statusCounts.find((s) => s._id === 'PAST_DUE')?.count || 0;
  const paymentSuccessRate = totalSubs > 0
    ? Math.round(((totalSubs - failedCount) / totalSubs) * 1000) / 10
    : 100;

  const expansionMrr = await Subscription.countDocuments({
    createdAt: { $gte: startOfMonth },
    status: 'ACTIVE',
  });

  return {
    metrics: {
      mrr: Math.round(mrr),
      arr: Math.round(arr),
      arpu: Math.round(arpu),
      churnRate,
      newMrrThisMonth: Math.round(newSubsThisMonth * (mrr / Math.max(activeSubscriptions.length, 1))),
      expansionMrr,
      churnedMrr: Math.round(cancelledThisMonth * (mrr / Math.max(activeSubscriptions.length, 1))),
      totalActiveSubscriptions: activeSubscriptions.length,
      paymentSuccessRate,
    },
    charts: {
      mrrGrowth,
      revenueByPlan: Object.entries(revenueByPlan).map(([planName, mrrVal]) => ({
        planName,
        mrr: Math.round(mrrVal),
      })),
      planBreakdown,
      subscriptionStatusCounts: statusCounts.map((s) => ({ status: s._id, count: s.count })),
      churnByMonth,
    },
  };
}
