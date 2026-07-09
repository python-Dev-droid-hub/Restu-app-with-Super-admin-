import mongoose from 'mongoose';
import { Tenant, Plan, Subscription, TenantBranch } from '@/superadmin/models';
import { logTenantActivity } from '@/superadmin/utils/helpers';
import { createError } from '@/utils';
import { sendSubscriptionRenewedEmail, sendPaymentFailedEmail } from './emailNotification.service';

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function calcAmount(plan: any, billingCycle: string): number {
  return billingCycle === 'YEARLY'
    ? plan.priceYearly || plan.priceMonthly * 12
    : plan.priceMonthly;
}

export async function getTenantSubscriptions(tenantId: string) {
  return Subscription.find({ tenantId }).sort({ createdAt: -1 }).populate('planId');
}

export async function listSubscriptions(filters: {
  status?: string;
  planId?: string;
  overdueOnly?: boolean;
  page?: number;
  limit?: number;
}) {
  const page = filters.page || 1;
  const limit = Math.min(100, filters.limit || 20);
  const skip = (page - 1) * limit;
  const query: Record<string, unknown> = {};

  if (filters.status) query.status = filters.status;
  if (filters.planId) query.planId = filters.planId;
  if (filters.overdueOnly) {
    query.status = 'PAST_DUE';
    query.endsAt = { $lt: new Date() };
  }

  const [subscriptions, total] = await Promise.all([
    Subscription.find(query)
      .populate('tenantId', 'name slug ownerEmail subscriptionStatus')
      .populate('planId', 'name slug priceMonthly priceYearly')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Subscription.countDocuments(query),
  ]);

  return { subscriptions, total, page, limit };
}

export async function markSubscriptionPaid(
  subscriptionId: string,
  options: { transactionRef?: string; paymentMethod?: string; performedBy?: string }
) {
  const subscription = await Subscription.findById(subscriptionId).populate('planId');
  if (!subscription) throw createError('Subscription not found.', 404);

  const tenant = await Tenant.findById(subscription.tenantId).populate('planId');
  if (!tenant) throw createError('Tenant not found.', 404);

  subscription.status = 'ACTIVE';
  subscription.transactionRef = options.transactionRef;
  subscription.paymentMethod = options.paymentMethod || 'MANUAL';
  await subscription.save();

  tenant.subscriptionStatus = 'ACTIVE';
  tenant.subscriptionStartsAt = subscription.startedAt;
  tenant.subscriptionEndsAt = subscription.endsAt;
  tenant.isActive = true;
  await tenant.save();

  await logTenantActivity(String(tenant._id), 'SUBSCRIPTION_MARKED_PAID', {
    performedBy: options.performedBy,
    metadata: { subscriptionId, transactionRef: options.transactionRef },
  });

  void sendSubscriptionRenewedEmail({
    ownerEmail: tenant.ownerEmail,
    restaurantName: tenant.name,
    planName: (tenant.planId as any)?.name || 'Plan',
    amount: subscription.amount,
    nextRenewal: subscription.endsAt,
  });

  return { subscription, tenant };
}

export async function extendSubscription(
  tenantId: string,
  days: number,
  performedBy?: string
) {
  if (days < 1 || days > 365) throw createError('Extension must be 1–365 days.', 400);

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw createError('Tenant not found.', 404);

  const currentEnd = tenant.subscriptionEndsAt || tenant.trialEndsAt || new Date();
  const newEnd = addDays(currentEnd > new Date() ? currentEnd : new Date(), days);

  tenant.subscriptionEndsAt = newEnd;
  if (tenant.subscriptionStatus === 'TRIAL') tenant.trialEndsAt = newEnd;
  if (tenant.subscriptionStatus === 'EXPIRED' || tenant.subscriptionStatus === 'PAST_DUE') {
    tenant.subscriptionStatus = tenant.trialEndsAt && tenant.trialEndsAt > new Date() ? 'TRIAL' : 'ACTIVE';
  }
  await tenant.save();

  const activeSub = await Subscription.findOne({ tenantId, status: 'ACTIVE' }).sort({ createdAt: -1 });
  if (activeSub) {
    activeSub.endsAt = newEnd;
    await activeSub.save();
  }

  await logTenantActivity(tenantId, 'SUBSCRIPTION_EXTENDED', {
    performedBy,
    description: `Extended by ${days} days until ${newEnd.toISOString()}`,
    metadata: { days, newEnd },
  });

  return { tenant, newEnd };
}

export async function cancelSubscription(
  tenantId: string,
  reason: string,
  performedBy?: string
) {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw createError('Tenant not found.', 404);

  tenant.subscriptionStatus = 'CANCELLED';
  await tenant.save();

  await Subscription.updateMany(
    { tenantId, status: 'ACTIVE' },
    { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason }
  );

  await logTenantActivity(tenantId, 'SUBSCRIPTION_CANCELLED', {
    performedBy,
    description: reason,
  });

  return { tenant };
}

export async function changeTenantPlan(
  tenantId: string,
  newPlanId: string,
  billingCycle: 'MONTHLY' | 'YEARLY',
  performedBy?: string
) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const tenant = await Tenant.findById(tenantId).session(session);
    if (!tenant) throw createError('Tenant not found.', 404);

    const newPlan = await Plan.findById(newPlanId).session(session);
    if (!newPlan || !newPlan.isActive) throw createError('Invalid plan.', 400);

    const branchCount = await TenantBranch.countDocuments({ tenantId }).session(session);
    if (branchCount > newPlan.maxBranches) {
      throw createError(
        `Tenant has ${branchCount} branches but new plan allows ${newPlan.maxBranches}.`,
        403
      );
    }

    const oldPlanId = tenant.planId;
    tenant.planId = newPlan._id;
    tenant.billingCycle = billingCycle;
    await tenant.save({ session });

    await Subscription.updateMany(
      { tenantId, status: 'ACTIVE' },
      { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: 'Plan changed' }
    ).session(session);

    const startedAt = new Date();
    const endsAt = billingCycle === 'YEARLY' ? addMonths(startedAt, 12) : addMonths(startedAt, 1);
    const amount = calcAmount(newPlan, billingCycle);

    const [subscription] = await Subscription.create(
      [{
        tenantId,
        planId: newPlan._id,
        amount,
        billingCycle,
        status: 'ACTIVE',
        startedAt,
        endsAt,
      }],
      { session }
    );

    if (tenant.subscriptionStatus !== 'TRIAL') {
      tenant.subscriptionStatus = 'ACTIVE';
      tenant.subscriptionStartsAt = startedAt;
      tenant.subscriptionEndsAt = endsAt;
      await tenant.save({ session });
    }

    await session.commitTransaction();

    await logTenantActivity(tenantId, 'PLAN_CHANGED', {
      performedBy,
      metadata: { oldPlanId: String(oldPlanId), newPlanId, billingCycle },
    });

    return { tenant, subscription, plan: newPlan };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

export async function markTenantPastDue(tenantId: string, performedBy?: string) {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw createError('Tenant not found.', 404);

  tenant.subscriptionStatus = 'PAST_DUE';
  await tenant.save();

  await Subscription.updateMany({ tenantId, status: 'ACTIVE' }, { status: 'PAST_DUE' });

  void sendPaymentFailedEmail({
    ownerEmail: tenant.ownerEmail,
    restaurantName: tenant.name,
    amount: 0,
  });

  await logTenantActivity(tenantId, 'SUBSCRIPTION_PAST_DUE', { performedBy });
  return { tenant };
}

export async function getPlanLimitWarnings(planId: string) {
  const plan = await Plan.findById(planId);
  if (!plan) throw createError('Plan not found.', 404);

  const tenants = await Tenant.find({ planId });
  const warnings: { tenantId: string; tenantName: string; issue: string }[] = [];

  for (const tenant of tenants) {
    const branches = await TenantBranch.countDocuments({ tenantId: tenant._id });
    if (branches > plan.maxBranches) {
      warnings.push({
        tenantId: String(tenant._id),
        tenantName: tenant.name,
        issue: `${branches} branches exceeds limit of ${plan.maxBranches}`,
      });
    }
    if (tenant.currentMonthOrders > plan.maxOrdersPerMonth) {
      warnings.push({
        tenantId: String(tenant._id),
        tenantName: tenant.name,
        issue: `${tenant.currentMonthOrders} orders exceeds monthly limit of ${plan.maxOrdersPerMonth}`,
      });
    }
  }

  return { plan, warnings, tenantsExceedingLimits: warnings.length };
}

export async function applySubscriptionCredit(
  tenantId: string,
  amount: number,
  performedBy?: string
) {
  if (amount <= 0) throw createError('Credit amount must be positive.', 400);
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw createError('Tenant not found.', 404);

  const settings = { ...((tenant.settings as any) || {}) };
  settings.creditBalance = (settings.creditBalance || 0) + amount;
  tenant.settings = settings;
  await tenant.save();

  await logTenantActivity(tenantId, 'SUBSCRIPTION_CREDIT_APPLIED', {
    performedBy,
    metadata: { amount, creditBalance: settings.creditBalance },
  });

  return { tenant, creditBalance: settings.creditBalance };
}
