import { Types } from 'mongoose';
import { Branch } from '@/models/Branch';

export function getTenantIdFromUser(
  user?: { tenantId?: unknown } | null,
  fallbackTenantId?: string
): string | undefined {
  const raw = user?.tenantId ? String(user.tenantId) : fallbackTenantId;
  if (!raw) return undefined;
  return Types.ObjectId.isValid(raw) ? raw : undefined;
}

export function getTenantIdFromRequest(
  req: {
    user?: { tenantId?: unknown } | null;
    authTenantId?: string;
    impersonating?: boolean;
    headers?: Record<string, string | string[] | undefined>;
  }
): string | undefined {
  const fromAuth = getTenantIdFromUser(req.user, req.authTenantId);
  if (fromAuth) return fromAuth;

  const headerRaw = req.headers?.['x-tenant-id'] || req.headers?.['X-Tenant-Id'];
  const headerTenant = Array.isArray(headerRaw) ? headerRaw[0] : headerRaw;
  if (!headerTenant || !Types.ObjectId.isValid(String(headerTenant))) return undefined;

  const normalized = String(headerTenant);
  if (req.impersonating || req.authTenantId === normalized) return normalized;
  return undefined;
}

/** Branch queries: scoped tenant sees only their branches; legacy admins see unscoped branches only. */
export function tenantBranchFilter(tenantId?: string): Record<string, unknown> {
  if (tenantId) {
    return { tenantId: new Types.ObjectId(tenantId) };
  }
  return { $or: [{ tenantId: null }, { tenantId: { $exists: false } }] };
}

export function tenantUserFilter(tenantId?: string): Record<string, unknown> {
  if (!tenantId) return {};
  return { tenantId: new Types.ObjectId(tenantId) };
}

/** Users visible in a tenant admin panel (excludes platform super admins). */
export function tenantAdminUserFilter(tenantId?: string): Record<string, unknown> {
  if (!tenantId) return {};
  return { tenantId: new Types.ObjectId(tenantId), role: { $ne: 'SUPER_ADMIN' } };
}

/** Menu/catalog entities: tenant sees only their rows; legacy admins see unscoped rows only. */
export function tenantDataFilter(tenantId?: string): Record<string, unknown> {
  if (tenantId) return { tenantId: new Types.ObjectId(tenantId) };
  return { $or: [{ tenantId: null }, { tenantId: { $exists: false } }] };
}

export function withTenantId<T extends Record<string, unknown>>(
  data: T,
  tenantId?: string
): T & { tenantId?: Types.ObjectId } {
  if (!tenantId) return data;
  return { ...data, tenantId: new Types.ObjectId(tenantId) };
}

export async function getTenantBranchIds(tenantId: string): Promise<Types.ObjectId[]> {
  const rows = await Branch.find({ tenantId: new Types.ObjectId(tenantId) }).select('_id').lean();
  return rows.map((r) => r._id as Types.ObjectId);
}

export async function assertBranchBelongsToTenant(
  tenantId: string | undefined,
  branchId: string
): Promise<boolean> {
  if (!tenantId) return true;
  if (!branchId || !Types.ObjectId.isValid(branchId)) return false;
  const branchIds = await getTenantBranchIds(tenantId);
  return branchIds.some((id) => id.toString() === String(branchId));
}

/** Restrict table queries to branches owned by the tenant. Returns null when branch is outside tenant. */
export async function tenantTableBranchFilter(
  tenantId: string | undefined,
  branchId?: string
): Promise<Record<string, unknown> | null> {
  if (!tenantId) {
    return branchId ? { branch: branchId } : {};
  }

  const branchIds = await getTenantBranchIds(tenantId);
  if (!branchIds.length) return { branch: { $in: [] } };

  if (branchId && branchId !== 'all') {
    const allowed = branchIds.some((id) => id.toString() === String(branchId));
    return allowed ? { branch: branchId } : null;
  }

  return { branch: { $in: branchIds } };
}

/** Order scope for a SaaS tenant — strict tenantId only (no legacy branch bleed). */
export async function buildTenantOrderScope(tenantId?: string): Promise<Record<string, unknown>> {
  if (!tenantId) return {};
  return { tenantId: new Types.ObjectId(tenantId) };
}

export function mergeFilters(...parts: Array<Record<string, unknown> | undefined>): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const part of parts) {
    if (!part || !Object.keys(part).length) continue;
    Object.assign(merged, part);
  }
  return merged;
}
