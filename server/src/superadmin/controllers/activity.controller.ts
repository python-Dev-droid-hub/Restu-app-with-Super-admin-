import { Response } from 'express';
import { TenantActivityLog, Tenant } from '@/superadmin/models';
import { ISuperAdminRequest } from '@/superadmin/types';
import { asyncHandler, sendPaginatedResponse, createError } from '@/utils';

export const list = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
  const limit = Math.min(100, parseInt(String(req.query.limit || '30'), 10));
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = {};

  if (req.query.tenantId) filter.tenantId = req.query.tenantId;
  if (req.query.action) filter.action = { $regex: req.query.action, $options: 'i' };
  if (req.query.dateFrom || req.query.dateTo) {
    filter.createdAt = {};
    if (req.query.dateFrom) (filter.createdAt as any).$gte = new Date(String(req.query.dateFrom));
    if (req.query.dateTo) (filter.createdAt as any).$lte = new Date(String(req.query.dateTo));
  }

  const search = String(req.query.search || '').trim();
  if (search) {
    const tenants = await Tenant.find({ name: { $regex: search, $options: 'i' } }).select('_id').limit(50);
    const tenantIds = tenants.map((t) => t._id);
    filter.$or = [
      { action: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { performedByType: { $regex: search, $options: 'i' } },
      ...(tenantIds.length ? [{ tenantId: { $in: tenantIds } }] : []),
    ];
  }

  const [logs, total] = await Promise.all([
    TenantActivityLog.find(filter)
      .populate('tenantId', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    TenantActivityLog.countDocuments(filter),
  ]);

  sendPaginatedResponse(res, logs, total, page, limit);
});

export const tenantLog = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const tenant = await Tenant.findById(req.params.tenantId);
  if (!tenant) throw createError('Tenant not found.', 404);

  const logs = await TenantActivityLog.find({ tenantId: tenant._id })
    .sort({ createdAt: -1 })
    .limit(200);

  sendSuccess(res, { logs });
});
