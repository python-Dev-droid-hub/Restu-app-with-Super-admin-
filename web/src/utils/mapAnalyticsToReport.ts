import type { AnalyticsReportData, PerformanceTier } from '../types/analyticsReport';

const pctChange = (current: number, previous: number): number => {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
};

const tierForRank = (index: number, total: number): PerformanceTier => {
  if (total <= 1) return 'high';
  const ratio = index / (total - 1);
  if (ratio <= 0.33) return 'high';
  if (ratio <= 0.66) return 'medium';
  return 'low';
};

export interface MapAnalyticsOptions {
  restaurantName: string;
  periodLabel: string;
  branchLabel: string;
  logoUrl?: string;
  previousPeriod?: {
    totalRevenue?: number;
    totalOrders?: number;
    totalCustomers?: number;
    averageOrderValue?: number;
  };
}

export function mapApiToAnalyticsReport(
  apiData: Record<string, unknown>,
  options: MapAnalyticsOptions
): AnalyticsReportData {
  const revenueByPeriod = (
    (apiData.revenueByMonth as Array<{ month?: string; label?: string; revenue: number; orders: number }>) ||
    []
  ).map((r) => ({
    label: r.month || r.label || '—',
    revenue: Number(r.revenue || 0),
    orders: Number(r.orders || 0),
  }));

  const topBranchesRaw =
    (apiData.revenueByBranch as Array<{ branchName?: string; name?: string; revenue: number; orders?: number }>) ||
    (apiData.topRestaurants as Array<{ name: string; revenue: number; orders: number }>) ||
    [];

  const sortedBranches = [...topBranchesRaw].sort(
    (a, b) => Number(b.revenue || 0) - Number(a.revenue || 0)
  );

  const topBranches = sortedBranches.map((b, i) => ({
    name: (b as { branchName?: string }).branchName || (b as { name?: string }).name || 'Unknown',
    revenue: Number(b.revenue || 0),
    orders: Number(b.orders || 0),
    performance: tierForRank(i, sortedBranches.length),
  }));

  const topProducts = (
    (apiData.topProducts as Array<{ name: string; count: number; revenue: number }>) || []
  ).map((p) => ({
    name: p.name || 'Unknown',
    count: Number(p.count || 0),
    revenue: Number(p.revenue || 0),
  }));

  const userGrowth = (
    (apiData.userGrowth as Array<{ month?: string; label?: string; users: number }>) || []
  ).map((u) => ({
    label: u.month || u.label || '—',
    users: Number(u.users || 0),
  }));

  const peakOrderDays = [...revenueByPeriod]
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 5)
    .map((r) => ({ label: r.label, orders: r.orders }));

  const orderStatusDistribution =
    (apiData.orderStatusDistribution as Record<string, number>) || {};

  const totalRevenue = Number(apiData.totalRevenue || 0);
  const totalOrders = Number(apiData.totalOrders || 0);
  const totalCustomers = Number(apiData.totalCustomers || 0);
  const averageOrderValue = Number(
    apiData.averageOrderValue || (totalOrders > 0 ? totalRevenue / totalOrders : 0)
  );

  const prev = options.previousPeriod || {};
  const trends = {
    revenue: pctChange(totalRevenue, Number(prev.totalRevenue || 0)),
    orders: pctChange(totalOrders, Number(prev.totalOrders || 0)),
    customers: pctChange(totalCustomers, Number(prev.totalCustomers || 0)),
    averageOrderValue: pctChange(averageOrderValue, Number(prev.averageOrderValue || 0)),
  };

  const growthPercent =
    revenueByPeriod.length >= 2
      ? pctChange(
          revenueByPeriod[revenueByPeriod.length - 1].revenue,
          revenueByPeriod[0].revenue
        )
      : trends.revenue;

  return {
    meta: {
      restaurantName: options.restaurantName,
      reportTitle: 'Restaurant Analytics Report',
      generatedAt: new Date().toISOString(),
      periodLabel: options.periodLabel,
      branchLabel: options.branchLabel,
      logoUrl: options.logoUrl,
      page: 1,
      totalPages: 1,
    },
    kpis: {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      totalCustomers,
      growthPercent,
      trends: { ...trends, growthPercent },
    },
    revenueByPeriod,
    topBranches,
    topProducts,
    userGrowth,
    peakOrderDays,
    orderStatusDistribution,
  };
}

export function getPeriodLabel(
  dateRange: string,
  custom?: { start: string; end: string }
): string {
  if (dateRange === 'custom' && custom) return `${custom.start} → ${custom.end}`;
  const labels: Record<string, string> = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    quarter: 'This Quarter',
    year: 'This Year',
  };
  return labels[dateRange] || dateRange;
}
