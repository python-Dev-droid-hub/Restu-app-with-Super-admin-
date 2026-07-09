import { Tenant, Subscription } from '@/superadmin/models';
import { logTenantActivity } from '@/superadmin/utils/helpers';
import { createError } from '@/utils';
import { sendAccountSuspendedEmail } from './emailNotification.service';
import { notifyDashboardRefresh } from './superadminRealtime.service';

const VALID_STATUSES = ['TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'SUSPENDED', 'EXPIRED'] as const;
export type TenantSubscriptionStatus = (typeof VALID_STATUSES)[number];

export async function updateTenantStatus(
  tenantId: string,
  subscriptionStatus: TenantSubscriptionStatus,
  options: { reason?: string; performedBy?: string }
) {
  if (!VALID_STATUSES.includes(subscriptionStatus)) {
    throw createError('Invalid subscription status.', 400);
  }

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw createError('Tenant not found.', 404);

  const prev = tenant.subscriptionStatus;
  if (prev === subscriptionStatus) return { tenant, changed: false };

  tenant.subscriptionStatus = subscriptionStatus;

  if (subscriptionStatus === 'SUSPENDED') {
    if (!options.reason?.trim()) throw createError('Suspension reason is required.', 400);
    tenant.isActive = false;
    tenant.suspendedReason = options.reason.trim();
    tenant.suspendedAt = new Date();
    void sendAccountSuspendedEmail(tenant.ownerEmail, tenant.name, options.reason);
    await logTenantActivity(tenantId, 'TENANT_SUSPENDED', {
      performedBy: options.performedBy,
      description: options.reason,
    });
  } else {
    if (prev === 'SUSPENDED') {
      tenant.suspendedReason = undefined;
      tenant.suspendedAt = undefined;
    }
    tenant.isActive = subscriptionStatus !== 'CANCELLED' && subscriptionStatus !== 'EXPIRED';

    if (subscriptionStatus === 'PAST_DUE') {
      await Subscription.updateMany({ tenantId, status: 'ACTIVE' }, { status: 'PAST_DUE' });
    } else if (subscriptionStatus === 'ACTIVE') {
      await Subscription.updateMany({ tenantId, status: 'PAST_DUE' }, { status: 'ACTIVE' });
      const latest = await Subscription.findOne({ tenantId }).sort({ createdAt: -1 });
      if (latest && latest.status !== 'CANCELLED') {
        latest.status = 'ACTIVE';
        latest.paymentMethod = latest.paymentMethod || 'MANUAL';
        await latest.save();
      }
    } else if (subscriptionStatus === 'CANCELLED') {
      await Subscription.updateMany(
        { tenantId, status: { $in: ['ACTIVE', 'PAST_DUE', 'EXPIRED'] } },
        {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: options.reason?.trim() || 'Status changed by admin',
        }
      );
    } else if (subscriptionStatus === 'EXPIRED') {
      await Subscription.updateMany(
        { tenantId, status: { $in: ['ACTIVE', 'PAST_DUE'] } },
        { status: 'EXPIRED' }
      );
    }

    await logTenantActivity(tenantId, 'TENANT_STATUS_CHANGED', {
      performedBy: options.performedBy,
      metadata: { from: prev, to: subscriptionStatus },
    });
  }

  await tenant.save();
  notifyDashboardRefresh();
  return { tenant, changed: true };
}
