import { Response } from 'express';
import { SuperAdmin } from '@/superadmin/models';
import { Tenant, TenantBranch, OnboardingSteps, Plan } from '@/superadmin/models';
import { User } from '@/models/User';
import { ISuperAdminRequest } from '@/superadmin/types';
import { launchTenant } from '@/superadmin/services/tenantLaunch.service';
import {
  changeTenantPlan,
  extendSubscription,
  getTenantSubscriptions,
} from '@/superadmin/services/subscriptionManager.service';
import { getTenantOrFail, logTenantActivity } from '@/superadmin/utils/helpers';
import { validateSlug, slugifyName } from '@/superadmin/utils/slugValidator';
import { sendAccountSuspendedEmail, sendCustomEmail } from '@/superadmin/services/emailNotification.service';
import { notifyDashboardRefresh } from '@/superadmin/services/superadminRealtime.service';
import { createImpersonationSession } from '@/superadmin/services/impersonation.service';
import { updateTenantStatus } from '@/superadmin/services/tenantStatus.service';
import { asyncHandler, sendSuccess, sendCreated, sendPaginatedResponse, createError } from '@/utils';

async function verifySuperAdminPassword(req: ISuperAdminRequest, password: string) {
  if (!password) throw createError('Password confirmation is required.', 400);
  const admin = await SuperAdmin.findById(req.superAdmin!._id).select('+passwordHash');
  if (!admin) throw createError('Unauthorized.', 401);
  const ok = await admin.comparePassword(password);
  if (!ok) throw createError('Incorrect password.', 403);
}

export const listTenants = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  const search = String(req.query.search || '').trim();
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
      { ownerEmail: { $regex: search, $options: 'i' } },
    ];
  }
  if (req.query.planId) filter.planId = req.query.planId;
  if (req.query.subscriptionStatus) filter.subscriptionStatus = req.query.subscriptionStatus;
  if (req.query.city) filter.city = { $regex: String(req.query.city), $options: 'i' };
  if (req.query.dateFrom || req.query.dateTo) {
    filter.createdAt = {};
    if (req.query.dateFrom) (filter.createdAt as any).$gte = new Date(String(req.query.dateFrom));
    if (req.query.dateTo) (filter.createdAt as any).$lte = new Date(String(req.query.dateTo));
  }

  const sortField = String(req.query.sortBy || 'createdAt');
  const allowedSort = ['createdAt', 'name', 'currentMonthOrders', 'subscriptionStatus'];
  const sortKey = allowedSort.includes(sortField) ? sortField : 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
  const sort: Record<string, 1 | -1> = { [sortKey]: sortOrder };

  const [tenants, total] = await Promise.all([
    Tenant.find(filter)
      .populate('planId', 'name slug priceMonthly maxOrdersPerMonth')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Tenant.countDocuments(filter),
  ]);

  const tenantIds = tenants.map((t) => t._id);
  const [branchCounts, staffCounts] = await Promise.all([
    TenantBranch.aggregate([
      { $match: { tenantId: { $in: tenantIds }, deletedAt: null } },
      { $group: { _id: '$tenantId', count: { $sum: 1 } } },
    ]),
    User.aggregate([
      { $match: { tenantId: { $in: tenantIds }, deletedAt: null } },
      { $group: { _id: '$tenantId', count: { $sum: 1 } } },
    ]),
  ]);
  const branchMap = new Map(branchCounts.map((b) => [String(b._id), b.count]));
  const staffMap = new Map(staffCounts.map((b) => [String(b._id), b.count]));

  const data = tenants.map((t) => {
    const plan = t.planId as any;
    return {
      ...t.toObject(),
      branchesCount: branchMap.get(String(t._id)) || 0,
      staffCount: staffMap.get(String(t._id)) || 0,
      ordersLimit: plan?.maxOrdersPerMonth,
    };
  });

  sendPaginatedResponse(res, data, total, page, limit);
});

export const getTenant = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const tenant = await getTenantOrFail(req.params.id);
  const [branches, onboarding, subscriptions] = await Promise.all([
    TenantBranch.find({ tenantId: tenant._id }),
    OnboardingSteps.findOne({ tenantId: tenant._id }),
    getTenantSubscriptions(String(tenant._id)),
  ]);

  sendSuccess(res, { tenant, branches, onboarding, subscriptions });
});

export const createTenant = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const result = await launchTenant({
    ...req.body,
    launchedBy: req.superAdmin ? String(req.superAdmin._id) : undefined,
  });

  sendCreated(res, {
    tenant: result.tenant,
    branch: result.branch,
    owner: result.ownerUser,
    loginUrl: result.loginUrl,
    tempPassword: result.tempPassword,
  }, 'Tenant launched successfully');
});

export const updateTenant = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const tenant = await getTenantOrFail(req.params.id);
  const allowed = [
    'name', 'legalName', 'logoUrl', 'faviconUrl', 'primaryColor', 'secondaryColor',
    'ownerName', 'ownerPhone', 'businessType', 'cuisineType', 'city', 'country',
    'settings', 'featureOverrides', 'planId', 'billingCycle',
  ];

  for (const key of allowed) {
    if (req.body[key] !== undefined) (tenant as any)[key] = req.body[key];
  }

  if (req.body.slug && req.body.slug !== tenant.slug) {
    const check = validateSlug(req.body.slug);
    if (!check.valid) throw createError(check.error!, 400);
    const exists = await Tenant.findOne({ slug: req.body.slug });
    if (exists) throw createError('Slug already taken.', 409);
    tenant.slug = req.body.slug;
  }

  await tenant.save();

  await logTenantActivity(String(tenant._id), 'TENANT_UPDATED', {
    performedBy: req.superAdmin ? String(req.superAdmin._id) : undefined,
    metadata: req.body,
  });

  sendSuccess(res, { tenant }, 'Tenant updated');
});

export const setTenantStatus = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const { subscriptionStatus, reason, password } = req.body;
  if (!subscriptionStatus) throw createError('subscriptionStatus is required.', 400);
  if (subscriptionStatus === 'SUSPENDED') {
    await verifySuperAdminPassword(req, password);
  }

  const result = await updateTenantStatus(req.params.id, subscriptionStatus, {
    reason,
    performedBy: req.superAdmin ? String(req.superAdmin._id) : undefined,
  });

  sendSuccess(res, result, result.changed ? 'Tenant status updated' : 'No change');
});

export const suspendTenant = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const tenant = await getTenantOrFail(req.params.id);
  const { reason, password } = req.body;
  if (!reason) throw createError('Suspension reason is required.', 400);
  await verifySuperAdminPassword(req, password);

  tenant.isActive = false;
  tenant.subscriptionStatus = 'SUSPENDED';
  tenant.suspendedReason = reason;
  tenant.suspendedAt = new Date();
  await tenant.save();

  await logTenantActivity(String(tenant._id), 'TENANT_SUSPENDED', {
    performedBy: req.superAdmin ? String(req.superAdmin._id) : undefined,
    description: reason,
  });

  void sendAccountSuspendedEmail(tenant.ownerEmail, tenant.name, reason);
  notifyDashboardRefresh();

  sendSuccess(res, { tenant }, 'Tenant suspended');
});

export const reactivateTenant = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const tenant = await getTenantOrFail(req.params.id);

  tenant.isActive = true;
  tenant.subscriptionStatus = tenant.trialEndsAt && tenant.trialEndsAt > new Date() ? 'TRIAL' : 'ACTIVE';
  tenant.suspendedReason = undefined;
  tenant.suspendedAt = undefined;
  await tenant.save();

  await logTenantActivity(String(tenant._id), 'TENANT_REACTIVATED', {
    performedBy: req.superAdmin ? String(req.superAdmin._id) : undefined,
  });

  sendSuccess(res, { tenant }, 'Tenant reactivated');
});

export const deleteTenant = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const { password } = req.body;
  await verifySuperAdminPassword(req, password);

  const tenant = await getTenantOrFail(req.params.id);
  tenant.deletedAt = new Date();
  tenant.isActive = false;
  await tenant.save();

  await logTenantActivity(String(tenant._id), 'TENANT_DELETED', {
    performedBy: req.superAdmin ? String(req.superAdmin._id) : undefined,
  });

  notifyDashboardRefresh();
  sendSuccess(res, null, 'Tenant soft-deleted');
});

export const suggestSlug = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const name = String(req.query.name || '');
  const slug = slugifyName(name);
  const check = validateSlug(slug);
  const available = check.valid && !(await Tenant.findOne({ slug }));
  sendSuccess(res, { slug, valid: check.valid, available, error: check.error });
});

export const listTenantBranches = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  await getTenantOrFail(req.params.id);
  const branches = await TenantBranch.find({ tenantId: req.params.id });
  sendSuccess(res, { branches });
});

export const createTenantBranch = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const tenant = await getTenantOrFail(req.params.id);
  const plan = await Plan.findById(tenant.planId);
  const branchCount = await TenantBranch.countDocuments({ tenantId: tenant._id });

  if (plan && branchCount >= plan.maxBranches) {
    throw createError(`Plan limit reached (${plan.maxBranches} branches).`, 403);
  }

  const branch = await TenantBranch.create({ ...req.body, tenantId: tenant._id });

  await logTenantActivity(String(tenant._id), 'BRANCH_CREATED', {
    performedBy: req.superAdmin ? String(req.superAdmin._id) : undefined,
    metadata: { branchId: String(branch._id) },
  });

  sendCreated(res, { branch }, 'Branch created');
});

export const updateTenantBranch = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const branch = await TenantBranch.findOne({ _id: req.params.branchId, tenantId: req.params.id });
  if (!branch) throw createError('Branch not found.', 404);

  Object.assign(branch, req.body);
  await branch.save();
  sendSuccess(res, { branch }, 'Branch updated');
});

export const deactivateTenantBranch = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const branch = await TenantBranch.findOne({ _id: req.params.branchId, tenantId: req.params.id });
  if (!branch) throw createError('Branch not found.', 404);
  branch.isActive = false;
  branch.isAcceptingOrders = false;
  await branch.save();
  sendSuccess(res, { branch }, 'Branch deactivated');
});

export const deleteTenantBranch = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const branch = await TenantBranch.findOne({ _id: req.params.branchId, tenantId: req.params.id });
  if (!branch) throw createError('Branch not found.', 404);
  branch.deletedAt = new Date();
  branch.isActive = false;
  await branch.save();
  sendSuccess(res, null, 'Branch deleted');
});

export const exportTenantsCsv = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const ids = String(req.query.ids || '').split(',').filter(Boolean);
  const filter: Record<string, unknown> = ids.length ? { _id: { $in: ids } } : {};
  const tenants = await Tenant.find(filter).populate('planId', 'name');

  const header = 'Name,Slug,Owner Email,Owner Phone,Plan,Status,City,Created\n';
  const rows = tenants.map((t) =>
    [
      `"${t.name}"`, t.slug, t.ownerEmail, t.ownerPhone,
      (t.planId as any)?.name || '', t.subscriptionStatus, t.city || '',
      t.createdAt.toISOString(),
    ].join(',')
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=tenants.csv');
  res.send(header + rows);
});

export const changePlan = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const { planId, billingCycle } = req.body;
  if (!planId) throw createError('planId is required.', 400);

  const result = await changeTenantPlan(
    req.params.id,
    planId,
    billingCycle || 'MONTHLY',
    req.superAdmin ? String(req.superAdmin._id) : undefined
  );

  sendSuccess(res, result, 'Plan changed successfully');
});

export const extendTenantSubscription = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const days = parseInt(String(req.body.days || '0'), 10);
  if (!days) throw createError('days is required.', 400);

  const result = await extendSubscription(
    req.params.id,
    days,
    req.superAdmin ? String(req.superAdmin._id) : undefined
  );

  sendSuccess(res, result, `Subscription extended by ${days} days`);
});

export const bulkSuspend = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const { tenantIds, reason, password } = req.body;
  if (!Array.isArray(tenantIds) || !tenantIds.length) throw createError('tenantIds required.', 400);
  if (!reason) throw createError('reason required.', 400);
  await verifySuperAdminPassword(req, password);

  await Tenant.updateMany(
    { _id: { $in: tenantIds } },
    { isActive: false, subscriptionStatus: 'SUSPENDED', suspendedReason: reason, suspendedAt: new Date() }
  );

  notifyDashboardRefresh();
  sendSuccess(res, { count: tenantIds.length }, 'Tenants suspended');
});

export const bulkReactivate = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const { tenantIds, password } = req.body;
  if (!Array.isArray(tenantIds) || !tenantIds.length) throw createError('tenantIds required.', 400);
  await verifySuperAdminPassword(req, password);

  const tenants = await Tenant.find({ _id: { $in: tenantIds } });
  for (const tenant of tenants) {
    tenant.isActive = true;
    tenant.subscriptionStatus =
      tenant.trialEndsAt && tenant.trialEndsAt > new Date() ? 'TRIAL' : 'ACTIVE';
    tenant.suspendedReason = undefined;
    tenant.suspendedAt = undefined;
    await tenant.save();
    await logTenantActivity(String(tenant._id), 'TENANT_REACTIVATED', {
      performedBy: req.superAdmin ? String(req.superAdmin._id) : undefined,
    });
  }

  notifyDashboardRefresh();
  sendSuccess(res, { count: tenants.length }, 'Tenants reactivated');
});

export const bulkEmail = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const { tenantIds, subject, body, password } = req.body;
  if (!Array.isArray(tenantIds) || !tenantIds.length) throw createError('tenantIds required.', 400);
  if (!subject || !body) throw createError('subject and body are required.', 400);
  await verifySuperAdminPassword(req, password);

  const tenants = await Tenant.find({ _id: { $in: tenantIds }, isActive: true });
  let sent = 0;
  for (const tenant of tenants) {
    if (!tenant.ownerEmail) continue;
    await sendCustomEmail(tenant.ownerEmail, subject, body);
    sent += 1;
  }

  sendSuccess(res, { sent, total: tenants.length }, 'Bulk email sent');
});

export const impersonateTenant = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  if (!req.superAdmin?._id) throw createError('Unauthorized.', 401);
  const result = await createImpersonationSession(req.params.id, String(req.superAdmin._id));
  sendSuccess(res, result, 'Impersonation session created');
});
