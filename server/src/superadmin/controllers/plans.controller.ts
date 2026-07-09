import { Response } from 'express';
import { Plan, Tenant } from '@/superadmin/models';
import { ISuperAdminRequest } from '@/superadmin/types';
import { validateSlug, slugifyName } from '@/superadmin/utils/slugValidator';
import { getPlanLimitWarnings } from '@/superadmin/services/subscriptionManager.service';
import { asyncHandler, sendSuccess, sendCreated, createError } from '@/utils';

export const listPlans = asyncHandler(async (_req: ISuperAdminRequest, res: Response) => {
  const plans = await Plan.find({}).sort({ priceMonthly: 1 });
  const tenantCounts = await Tenant.aggregate([
    { $group: { _id: '$planId', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(tenantCounts.map((t) => [String(t._id), t.count]));

  const data = plans.map((p) => ({
    ...p.toObject(),
    tenantCount: countMap.get(String(p._id)) || 0,
  }));

  sendSuccess(res, { plans: data });
});

export const getPlan = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const plan = await Plan.findById(req.params.id);
  if (!plan) throw createError('Plan not found.', 404);
  const tenantCount = await Tenant.countDocuments({ planId: plan._id });
  sendSuccess(res, { plan: { ...plan.toObject(), tenantCount } });
});

export const createPlan = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const slug = req.body.slug || slugifyName(req.body.name);
  const check = validateSlug(slug);
  if (!check.valid) throw createError(check.error!, 400);

  const plan = await Plan.create({ ...req.body, slug });
  sendCreated(res, { plan }, 'Plan created');
});

export const updatePlan = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const plan = await Plan.findById(req.params.id);
  if (!plan) throw createError('Plan not found.', 404);

  const allowed = [
    'name', 'priceMonthly', 'priceYearly', 'maxBranches', 'maxStaffAccounts',
    'maxMenuItems', 'maxOrdersPerMonth', 'features', 'isActive', 'isPublic',
  ];
  for (const key of allowed) {
    if (req.body[key] !== undefined) (plan as any)[key] = req.body[key];
  }

  if (req.body.slug && req.body.slug !== plan.slug) {
    const check = validateSlug(req.body.slug);
    if (!check.valid) throw createError(check.error!, 400);
    plan.slug = req.body.slug;
  }

  await plan.save();

  const { warnings, tenantsExceedingLimits } = await getPlanLimitWarnings(String(plan._id));

  sendSuccess(res, { plan, warnings, tenantsExceedingLimits }, 'Plan updated');
});

export const togglePlanActive = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const plan = await Plan.findById(req.params.id);
  if (!plan) throw createError('Plan not found.', 404);
  plan.isActive = !plan.isActive;
  await plan.save();
  sendSuccess(res, { plan }, `Plan ${plan.isActive ? 'activated' : 'deactivated'}`);
});

export const comparePlans = asyncHandler(async (_req: ISuperAdminRequest, res: Response) => {
  const plans = await Plan.find({ isPublic: true, isActive: true }).sort({ priceMonthly: 1 });
  sendSuccess(res, { plans });
});

export const getPlanWarnings = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const data = await getPlanLimitWarnings(req.params.id);
  sendSuccess(res, data);
});
