import { Tenant } from '@/superadmin/models';
import { IUser } from '@/types';
import { createError } from '@/utils';

export function getTenantIdFromUser(user?: IUser | null): string | undefined {
  if (!user?.tenantId) return undefined;
  const tid = user.tenantId as any;
  return typeof tid === 'string' ? tid : tid?.toString?.();
}

export async function loadTenantForUser(user?: IUser | null) {
  const tenantId = getTenantIdFromUser(user);
  if (!tenantId) return null;
  return Tenant.findById(tenantId).populate('planId');
}

export async function assertTenantFeature(
  user: IUser | undefined,
  feature: string,
  tenantOverride?: { planId?: any; featureOverrides?: Record<string, boolean> } | null
): Promise<void> {
  const tenant = tenantOverride || (await loadTenantForUser(user));
  if (!tenant) return;

  const plan = tenant.planId as any;
  const overrides = (tenant as any).featureOverrides || {};
  const planFeatures = plan?.features || {};
  const enabled = overrides[feature] ?? planFeatures[feature];

  if (!enabled) {
    throw createError(`Feature "${feature}" is not available on your current plan.`, 403);
  }
}
