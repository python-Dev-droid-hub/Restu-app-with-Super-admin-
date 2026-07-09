import { Response } from 'express';
import { Tenant, SupportTicket, Subscription, SuperAdmin } from '@/superadmin/models';
import { ISuperAdminRequest } from '@/superadmin/types';
import { asyncHandler, sendSuccess } from '@/utils';

export const globalSearch = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const q = String(req.query.q || '').trim();
  if (!q || q.length < 2) {
    return sendSuccess(res, { tenants: [], tickets: [], subscriptions: [], admins: [] });
  }

  const regex = { $regex: q, $options: 'i' };

  const [tenants, tickets, subscriptions, admins] = await Promise.all([
    Tenant.find({
      $or: [{ name: regex }, { slug: regex }, { ownerEmail: regex }, { ownerName: regex }],
      deletedAt: null,
    })
      .select('name slug ownerEmail subscriptionStatus')
      .limit(8),
    SupportTicket.find({ $or: [{ subject: regex }, { description: regex }] })
      .populate('tenantId', 'name slug')
      .select('subject status priority tenantId')
      .limit(8),
    (async () => {
      const tenantIds = (await Tenant.find({
        $or: [{ name: regex }, { slug: regex }, { ownerEmail: regex }],
      }).select('_id').limit(8)).map((t) => t._id);
      if (!tenantIds.length) return [];
      return Subscription.find({ tenantId: { $in: tenantIds } })
        .populate('tenantId', 'name slug')
        .select('status amount tenantId billingCycle')
        .limit(8);
    })(),
    SuperAdmin.find({
      $or: [{ displayName: regex }, { email: regex }],
      isActive: true,
    })
      .select('displayName email role')
      .limit(5),
  ]);

  sendSuccess(res, { tenants, tickets, subscriptions, admins });
});
