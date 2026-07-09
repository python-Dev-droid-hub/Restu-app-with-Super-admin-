import jwt from 'jsonwebtoken';
import { Tenant } from '@/superadmin/models/Tenant';
import { User } from '@/models/User';
import { logTenantActivity, generateTempPassword } from '@/superadmin/utils/helpers';
import { getTenantUrl } from '@/superadmin/utils/helpers';
import { createError } from '@/utils';
import { isValidPhoneNumber, normalizePhoneNumber } from '@/utils/phone';
import { provisionTenantLegacyBranches } from '@/superadmin/services/tenantBranchProvision.service';

export interface IImpersonationPayload {
  userId: string;
  email: string;
  role: string;
  impersonating: true;
  superAdminId: string;
  tenantId: string;
}

/** Find or repair the tenant owner ADMIN user (fixes legacy tenants missing ownerUserId). */
export async function resolveTenantOwner(tenant: InstanceType<typeof Tenant>, performedBy?: string) {
  const email = tenant.ownerEmail?.toLowerCase()?.trim();
  if (!email) throw createError('Tenant has no owner email.', 400);

  let owner =
    (tenant.ownerUserId ? await User.findById(tenant.ownerUserId) : null) ||
    (await User.findOne({ email, tenantId: tenant._id })) ||
    (await User.findOne({ email, role: 'ADMIN' })) ||
    (await User.findOne({ email })) ||
    (await User.findOne({ email, deletedAt: { $ne: null } }));

  if (owner) {
    let changed = false;
    if (!owner.isActive) {
      owner.isActive = true;
      changed = true;
    }
    if (owner.deletedAt) {
      owner.deletedAt = null;
      changed = true;
    }
    if (owner.role !== 'ADMIN') {
      owner.role = 'ADMIN';
      changed = true;
    }
    if (!owner.tenantId || String(owner.tenantId) !== String(tenant._id)) {
      owner.tenantId = tenant._id as any;
      changed = true;
    }
    if (changed) await owner.save();

    if (!tenant.ownerUserId || String(tenant.ownerUserId) !== String(owner._id)) {
      tenant.ownerUserId = owner._id as any;
      await tenant.save();
    }
    await provisionTenantLegacyBranches(String(tenant._id));
    return owner;
  }

  const tempPassword = generateTempPassword();
  const createPayload: Record<string, unknown> = {
    email,
    passwordHash: tempPassword,
    displayName: tenant.ownerName || 'Owner',
    role: 'ADMIN',
    emailVerified: true,
    isActive: true,
    tenantId: tenant._id,
  };

  if (tenant.ownerPhone && isValidPhoneNumber(tenant.ownerPhone)) {
    createPayload.phoneNumber = normalizePhoneNumber(tenant.ownerPhone);
  }

  const [newOwner] = await User.create([createPayload]);
  tenant.ownerUserId = newOwner._id as any;
  await tenant.save();

  await logTenantActivity(String(tenant._id), 'OWNER_ACCOUNT_REPAIRED', {
    performedBy,
    performedByType: 'SUPER_ADMIN',
    description: `Created missing owner account for ${email}`,
    metadata: { ownerUserId: String(newOwner._id) },
  });

  await provisionTenantLegacyBranches(String(tenant._id));
  return newOwner;
}

export async function createImpersonationSession(tenantId: string, superAdminId: string) {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant || !tenant.isActive) throw createError('Tenant not found or inactive.', 404);

  const owner = await resolveTenantOwner(tenant, superAdminId);
  await provisionTenantLegacyBranches(String(tenant._id));

  const payload: IImpersonationPayload = {
    userId: String(owner._id),
    email: owner.email,
    role: owner.role,
    impersonating: true,
    superAdminId,
    tenantId: String(tenant._id),
  };

  const impersonationToken = jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: '15m',
  });

  await logTenantActivity(String(tenant._id), 'IMPERSONATION_STARTED', {
    performedBy: superAdminId,
    performedByType: 'SUPER_ADMIN',
    description: `Super admin impersonating ${owner.email}`,
    metadata: { ownerUserId: String(owner._id) },
  });

  const loginUrl = `${getTenantUrl(tenant.slug).replace(/\/$/, '')}/auth/impersonate?token=${encodeURIComponent(impersonationToken)}`;
  const localLoginUrl = `/auth/impersonate?token=${encodeURIComponent(impersonationToken)}`;

  return {
    impersonationToken,
    loginUrl,
    localLoginUrl,
    tenant: { id: tenant._id, name: tenant.name, slug: tenant.slug },
    user: owner.getPublicProfile(),
    expiresIn: '15m',
  };
}

export function verifyImpersonationToken(token: string): IImpersonationPayload {
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as IImpersonationPayload;
  if (!decoded.impersonating) throw createError('Invalid impersonation token.', 401);
  return decoded;
}
