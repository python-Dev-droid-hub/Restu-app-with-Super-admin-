import { Types } from 'mongoose';
import { Tenant } from '@/superadmin/models';
import { Branch } from '@/models/Branch';
import { User } from '@/models/User';
import { Product } from '@/models/Product';
import { createError } from '@/utils';
import { IPlanFeatures } from '@/superadmin/types';
import {
  STAFF_ROLES,
  ROLE_FEATURE_MAP,
  FEATURE_LABELS,
  roleRequiresFeature,
  buildNavAccess,
  getAllowedStaffRoles,
} from '@/superadmin/config/planRules.config';

export {
  STAFF_ROLES,
  ROLE_FEATURE_MAP,
  roleRequiresFeature,
} from '@/superadmin/config/planRules.config';

export async function loadTenantWithPlan(tenantId: string) {
  if (!Types.ObjectId.isValid(tenantId)) return null;
  return Tenant.findById(tenantId).populate('planId');
}

export function mergeTenantFeatures(tenant: {
  planId?: any;
  featureOverrides?: Record<string, boolean>;
}): IPlanFeatures {
  const plan = tenant.planId as any;
  return { ...(plan?.features || {}), ...(tenant.featureOverrides || {}) } as IPlanFeatures;
}

export function isFeatureEnabled(
  tenant: { planId?: any; featureOverrides?: Record<string, boolean> } | null,
  feature: keyof IPlanFeatures
): boolean {
  if (!tenant) return true;
  return !!mergeTenantFeatures(tenant)[feature];
}

export async function assertPlanFeature(tenantId: string, feature: keyof IPlanFeatures): Promise<void> {
  const tenant = await loadTenantWithPlan(tenantId);
  if (!tenant) return;
  if (!isFeatureEnabled(tenant, feature)) {
    const planName = (tenant.planId as any)?.name || 'current';
    throw createError(
      `${FEATURE_LABELS[feature] || feature} is not available on your ${planName} plan. Please upgrade.`,
      403
    );
  }
}

export async function assertPlanBranchLimit(tenantId: string): Promise<void> {
  const tenant = await loadTenantWithPlan(tenantId);
  if (!tenant) return;

  const plan = tenant.planId as any;
  if (!plan?.maxBranches) return;

  const branchCount = await Branch.countDocuments({
    tenantId: tenant._id,
    deletedAt: null,
  });

  if (branchCount >= plan.maxBranches) {
    throw createError(
      `Your ${plan.name || 'current'} plan allows up to ${plan.maxBranches} branch(es). Upgrade your plan to add more.`,
      403
    );
  }
}

export async function assertPlanStaffLimit(tenantId: string): Promise<void> {
  const tenant = await loadTenantWithPlan(tenantId);
  if (!tenant) return;

  const plan = tenant.planId as any;
  if (!plan?.maxStaffAccounts) return;

  const staffCount = await User.countDocuments({
    tenantId: tenant._id,
    role: { $in: STAFF_ROLES },
    deletedAt: null,
  });

  if (staffCount >= plan.maxStaffAccounts) {
    throw createError(
      `Your ${plan.name || 'current'} plan allows up to ${plan.maxStaffAccounts} staff accounts. Upgrade your plan to add more.`,
      403
    );
  }
}

export async function assertPlanMenuItemLimit(tenantId: string): Promise<void> {
  const tenant = await loadTenantWithPlan(tenantId);
  if (!tenant) return;

  const plan = tenant.planId as any;
  if (!plan?.maxMenuItems) return;

  const menuCount = await Product.countDocuments({
    tenantId: tenant._id,
    deletedAt: null,
  });

  if (menuCount >= plan.maxMenuItems) {
    throw createError(
      `Your ${plan.name || 'current'} plan allows up to ${plan.maxMenuItems} menu items. Upgrade your plan to add more.`,
      403
    );
  }
}

export async function assertPlanMonthlyOrderLimit(tenantId: string): Promise<void> {
  const tenant = await loadTenantWithPlan(tenantId);
  if (!tenant) return;

  const plan = tenant.planId as any;
  if (!plan?.maxOrdersPerMonth) return;

  if ((tenant.currentMonthOrders || 0) >= plan.maxOrdersPerMonth) {
    throw createError(
      `Monthly order limit reached (${plan.maxOrdersPerMonth}) on your ${plan.name || 'current'} plan. Upgrade or wait until next billing cycle.`,
      403
    );
  }
}

export async function assertRoleAllowedForPlan(tenantId: string, role: string): Promise<void> {
  const tenant = await loadTenantWithPlan(tenantId);
  if (!tenant) return;

  const normalizedRole = String(role || '').toUpperCase();
  const featureKey = ROLE_FEATURE_MAP[normalizedRole];
  if (!featureKey) return;

  if (!isFeatureEnabled(tenant, featureKey)) {
    throw createError(
      `${FEATURE_LABELS[featureKey] || 'This role'} is not available on your ${(tenant.planId as any)?.name || 'current'} plan. Please upgrade.`,
      403
    );
  }
}

export async function assertPlanCanCreateStaff(tenantId: string, role: string): Promise<void> {
  const normalizedRole = String(role || 'CUSTOMER').toUpperCase();
  if (normalizedRole === 'CUSTOMER' || normalizedRole === 'SUPER_ADMIN') return;
  await assertPlanStaffLimit(tenantId);
  await assertRoleAllowedForPlan(tenantId, normalizedRole);
}

export async function getTenantPlanSummary(tenantId: string) {
  const tenant = await loadTenantWithPlan(tenantId);
  if (!tenant) return null;

  const plan = tenant.planId as any;
  const features = mergeTenantFeatures(tenant);

  const [branchCount, staffCount, menuItemCount] = await Promise.all([
    Branch.countDocuments({ tenantId: tenant._id, deletedAt: null }),
    User.countDocuments({ tenantId: tenant._id, role: { $in: STAFF_ROLES }, deletedAt: null }),
    Product.countDocuments({ tenantId: tenant._id, deletedAt: null }),
  ]);

  const ordersThisMonth = tenant.currentMonthOrders || 0;
  const maxBranches = plan?.maxBranches ?? 1;
  const maxStaff = plan?.maxStaffAccounts ?? 5;
  const maxMenuItems = plan?.maxMenuItems ?? 50;
  const maxOrders = plan?.maxOrdersPerMonth ?? 500;

  return {
    planId: plan?._id ? String(plan._id) : null,
    planName: plan?.name || 'Plan',
    planSlug: plan?.slug || '',
    maxBranches,
    maxStaffAccounts: maxStaff,
    maxMenuItems,
    maxOrdersPerMonth: maxOrders,
    features,
    navAccess: buildNavAccess(features),
    usage: {
      branches: branchCount,
      staff: staffCount,
      menuItems: menuItemCount,
      ordersThisMonth,
    },
    canAddBranch: branchCount < maxBranches,
    canAddStaff: staffCount < maxStaff,
    canAddMenuItem: menuItemCount < maxMenuItems,
    canCreateOrder: ordersThisMonth < maxOrders,
    allowedStaffRoles: [...getAllowedStaffRoles(features), 'CUSTOMER'],
  };
}
