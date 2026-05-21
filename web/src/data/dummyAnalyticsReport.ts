import type { AnalyticsReportData } from '../types/analyticsReport';

export const dummyAnalyticsReport: AnalyticsReportData = {
  meta: {
    restaurantName: 'Bella Vista Kitchen',
    reportTitle: 'Restaurant Analytics Report',
    generatedAt: new Date().toISOString(),
    periodLabel: 'Mar 1, 2026 – Mar 31, 2026',
    branchLabel: 'All Branches',
    logoUrl: undefined,
    page: 1,
    totalPages: 2,
  },
  kpis: {
    totalRevenue: 2847500,
    totalOrders: 1842,
    averageOrderValue: 1546,
    totalCustomers: 967,
    growthPercent: 12.4,
    trends: {
      revenue: 8.2,
      orders: 5.1,
      customers: 14.3,
      averageOrderValue: 2.8,
      growthPercent: 12.4,
    },
  },
  revenueByPeriod: [
    { label: 'Week 1', revenue: 620000, orders: 410 },
    { label: 'Week 2', revenue: 710000, orders: 455 },
    { label: 'Week 3', revenue: 748000, orders: 488 },
    { label: 'Week 4', revenue: 769500, orders: 489 },
  ],
  topBranches: [
    { name: 'Downtown', revenue: 980000, orders: 612, performance: 'high' },
    { name: 'Airport', revenue: 720000, orders: 498, performance: 'high' },
    { name: 'Mall Plaza', revenue: 610000, orders: 421, performance: 'medium' },
    { name: 'Suburb', revenue: 537500, orders: 311, performance: 'low' },
  ],
  topProducts: [
    { name: 'Truffle Pasta', count: 312, revenue: 468000 },
    { name: 'Smash Burger', count: 289, revenue: 346800 },
    { name: 'Wood-fired Pizza', count: 256, revenue: 307200 },
  ],
  userGrowth: [
    { label: 'Week 1', users: 180 },
    { label: 'Week 2', users: 220 },
    { label: 'Week 3', users: 265 },
    { label: 'Week 4', users: 302 },
  ],
  peakOrderDays: [
    { label: 'Friday', orders: 412 },
    { label: 'Saturday', orders: 398 },
    { label: 'Sunday', orders: 356 },
    { label: 'Thursday', orders: 298 },
  ],
  orderStatusDistribution: {
    COMPLETED: 820,
    DELIVERED: 540,
    READY: 120,
    CANCELLED: 86,
    PREPARING: 176,
    PENDING: 100,
  },
};
