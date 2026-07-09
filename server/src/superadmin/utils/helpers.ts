import crypto from 'crypto';
import { Tenant } from '@/superadmin/models';
import { ISuperAdminRequest } from '@/superadmin/types';
import { createError } from '@/utils';

export function generateTempPassword(): string {
  return crypto.randomBytes(4).toString('hex') + 'A1!';
}

export async function logTenantActivity(
  tenantId: string,
  action: string,
  options: {
    performedBy?: string;
    performedByType?: string;
    description?: string;
    metadata?: Record<string, unknown>;
  } = {}
) {
  const { TenantActivityLog } = await import('@/superadmin/models');
  await TenantActivityLog.create({
    tenantId,
    action,
    performedBy: options.performedBy,
    performedByType: options.performedByType || 'SUPER_ADMIN',
    description: options.description,
    metadata: options.metadata,
  });
}

export async function getTenantOrFail(tenantId: string) {
  const tenant = await Tenant.findById(tenantId).populate('planId');
  if (!tenant) throw createError('Tenant not found.', 404);
  return tenant;
}

export function getAppDomain(): string {
  return process.env.APP_DOMAIN || 'yourapp.com';
}

export function getTenantUrl(slug: string): string {
  const template = process.env.TENANT_URL_TEMPLATE || '{slug}.yourapp.com';
  return `https://${template.replace('{slug}', slug)}`;
}

export function sanitizeSuperAdmin(superAdmin: ISuperAdminRequest['superAdmin']) {
  if (!superAdmin) return null;
  return {
    id: superAdmin._id,
    email: superAdmin.email,
    displayName: superAdmin.displayName,
    role: superAdmin.role,
    lastLoginAt: superAdmin.lastLoginAt,
  };
}
