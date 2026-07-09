import { Response } from 'express';
import { ISuperAdminRequest } from '@/superadmin/types';
import { getBillingAnalytics } from '@/superadmin/services/analytics.service';
import { asyncHandler, sendSuccess } from '@/utils';

export const getDashboard = asyncHandler(async (_req: ISuperAdminRequest, res: Response) => {
  const { getDashboardMetrics } = await import('@/superadmin/services/analytics.service');
  const data = await getDashboardMetrics();
  sendSuccess(res, data);
});

export const getBilling = asyncHandler(async (_req: ISuperAdminRequest, res: Response) => {
  const data = await getBillingAnalytics();
  sendSuccess(res, data);
});
