import { Response } from 'express';
import { ISuperAdminRequest } from '@/superadmin/types';
import {
  listSubscriptions,
  markSubscriptionPaid,
  extendSubscription,
  cancelSubscription,
  getTenantSubscriptions,
  markTenantPastDue,
  applySubscriptionCredit,
} from '@/superadmin/services/subscriptionManager.service';
import { asyncHandler, sendSuccess, createError } from '@/utils';

export const list = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const result = await listSubscriptions({
    status: req.query.status as string,
    planId: req.query.planId as string,
    overdueOnly: req.query.overdueOnly === 'true',
    page: parseInt(String(req.query.page || '1'), 10),
    limit: parseInt(String(req.query.limit || '20'), 10),
  });

  sendSuccess(res, result);
});

export const getById = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const { Subscription } = await import('@/superadmin/models');
  const subscription = await Subscription.findById(req.params.id)
    .populate('tenantId', 'name slug ownerEmail')
    .populate('planId');
  if (!subscription) throw createError('Subscription not found.', 404);
  sendSuccess(res, { subscription });
});

export const markPaid = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const result = await markSubscriptionPaid(req.params.id, {
    transactionRef: req.body.transactionRef,
    paymentMethod: req.body.paymentMethod,
    performedBy: req.superAdmin ? String(req.superAdmin._id) : undefined,
  });
  sendSuccess(res, result, 'Subscription marked as paid');
});

export const extend = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const days = parseInt(String(req.body.days || '0'), 10);
  const tenantId = req.body.tenantId || req.params.tenantId;
  if (!tenantId) throw createError('tenantId is required.', 400);

  const result = await extendSubscription(
    tenantId,
    days,
    req.superAdmin ? String(req.superAdmin._id) : undefined
  );
  sendSuccess(res, result, `Subscription extended by ${days} days`);
});

export const cancel = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const tenantId = req.body.tenantId || req.params.tenantId;
  const { reason } = req.body;
  if (!tenantId || !reason) throw createError('tenantId and reason are required.', 400);

  const result = await cancelSubscription(
    tenantId,
    reason,
    req.superAdmin ? String(req.superAdmin._id) : undefined
  );
  sendSuccess(res, result, 'Subscription cancelled');
});

export const tenantHistory = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const subscriptions = await getTenantSubscriptions(req.params.tenantId);
  sendSuccess(res, { subscriptions });
});

export const markPastDue = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const tenantId = req.body.tenantId || req.params.tenantId;
  if (!tenantId) throw createError('tenantId is required.', 400);
  const result = await markTenantPastDue(tenantId, req.superAdmin ? String(req.superAdmin._id) : undefined);
  sendSuccess(res, result, 'Tenant marked as past due');
});

export const applyCredit = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const { tenantId, amount } = req.body;
  if (!tenantId || !amount) throw createError('tenantId and amount are required.', 400);
  const result = await applySubscriptionCredit(
    tenantId,
    Number(amount),
    req.superAdmin ? String(req.superAdmin._id) : undefined
  );
  sendSuccess(res, result, 'Credit applied');
});

export const getInvoice = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const { Subscription } = await import('@/superadmin/models');
  const subscription = await Subscription.findById(req.params.id)
    .populate('tenantId', 'name slug ownerEmail ownerName')
    .populate('planId', 'name');
  if (!subscription) throw createError('Subscription not found.', 404);

  const invoice = {
    invoiceNumber: `INV-${String(subscription._id).slice(-8).toUpperCase()}`,
    tenant: subscription.tenantId,
    plan: subscription.planId,
    amount: subscription.amount,
    currency: subscription.currency,
    billingCycle: subscription.billingCycle,
    periodStart: subscription.startedAt,
    periodEnd: subscription.endsAt,
    status: subscription.status,
    issuedAt: new Date().toISOString(),
  };

  if (req.query.download === 'json') {
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.json`);
    return res.json(invoice);
  }

  sendSuccess(res, { invoice });
});
