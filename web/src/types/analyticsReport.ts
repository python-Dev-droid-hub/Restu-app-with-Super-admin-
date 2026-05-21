export type PerformanceTier = 'high' | 'medium' | 'low';

export interface AnalyticsReportKpiTrends {
  revenue?: number;
  orders?: number;
  customers?: number;
  averageOrderValue?: number;
  growthPercent?: number;
}

export interface AnalyticsReportMeta {
  restaurantName: string;
  reportTitle: string;
  generatedAt: string;
  periodLabel: string;
  branchLabel: string;
  logoUrl?: string;
  page?: number;
  totalPages?: number;
}

export interface AnalyticsReportData {
  meta: AnalyticsReportMeta;
  kpis: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    totalCustomers: number;
    growthPercent: number;
    trends: AnalyticsReportKpiTrends;
  };
  revenueByPeriod: Array<{ label: string; revenue: number; orders: number }>;
  topBranches: Array<{
    name: string;
    revenue: number;
    orders: number;
    performance: PerformanceTier;
  }>;
  topProducts: Array<{ name: string; count: number; revenue: number }>;
  userGrowth: Array<{ label: string; users: number }>;
  peakOrderDays: Array<{ label: string; orders: number }>;
  orderStatusDistribution: Record<string, number>;
}
