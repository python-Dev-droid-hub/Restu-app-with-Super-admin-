import { IPlanFeatures } from '@/superadmin/types';

/** Staff roles counted against maxStaffAccounts. */
export const STAFF_ROLES = [
  'ADMIN',
  'BRANCH_MANAGER',
  'CHEF',
  'WAITER',
  'RIDER',
  'KITCHEN',
  'HEAD_CHEF',
  'COOK',
  'SOUS_CHEF',
  'KITCHEN_MANAGER',
] as const;

/** Staff role → required plan feature (null = always allowed within staff limit). */
export const ROLE_FEATURE_MAP: Record<string, keyof IPlanFeatures | null> = {
  RIDER: 'rider_app',
  CHEF: 'kitchen_display',
  KITCHEN: 'kitchen_display',
  HEAD_CHEF: 'kitchen_display',
  COOK: 'kitchen_display',
  SOUS_CHEF: 'kitchen_display',
  KITCHEN_MANAGER: 'kitchen_display',
  WAITER: 'dine_in',
  BRANCH_MANAGER: null,
  ADMIN: null,
  CUSTOMER: null,
  SUPER_ADMIN: null,
};

/** Admin sidebar keys → required feature (null = always visible). */
export const ADMIN_NAV_FEATURE_MAP: Record<string, keyof IPlanFeatures | null> = {
  riders: 'rider_app',
  reports: 'analytics',
  kitchens: 'kitchen_display',
  'table-assignment': 'dine_in',
};

export const FEATURE_LABELS: Record<keyof IPlanFeatures, string> = {
  dine_in: 'Dine-in / Waiter',
  delivery: 'Delivery',
  takeaway: 'Takeaway',
  kitchen_display: 'Kitchen display',
  rider_app: 'Rider app',
  analytics: 'Analytics & reports',
  white_label: 'White label branding',
  custom_domain: 'Custom domain',
  api_access: 'API access',
  fbr_integration: 'FBR integration',
  loyalty_program: 'Loyalty program',
  offline_mode: 'Offline mode',
};

const KITCHEN_ROLES = new Set([
  'CHEF',
  'KITCHEN',
  'HEAD_CHEF',
  'COOK',
  'SOUS_CHEF',
  'KITCHEN_MANAGER',
]);

export function roleRequiresFeature(role: string): keyof IPlanFeatures | null {
  const r = String(role || '').toUpperCase();
  if (r === 'RIDER') return 'rider_app';
  if (r === 'WAITER') return 'dine_in';
  if (KITCHEN_ROLES.has(r)) return 'kitchen_display';
  return ROLE_FEATURE_MAP[r] ?? null;
}

export function isNavKeyAllowed(
  key: string,
  features: Partial<IPlanFeatures>
): boolean {
  const required = ADMIN_NAV_FEATURE_MAP[key];
  if (!required) return true;
  return !!features[required];
}

export function buildNavAccess(features: Partial<IPlanFeatures>): Record<string, boolean> {
  const access: Record<string, boolean> = {};
  for (const key of Object.keys(ADMIN_NAV_FEATURE_MAP)) {
    access[key] = isNavKeyAllowed(key, features);
  }
  return access;
}

export function getAllowedStaffRoles(features: Partial<IPlanFeatures>): string[] {
  return STAFF_ROLES.filter((role) => {
    const fk = ROLE_FEATURE_MAP[role];
    return !fk || !!features[fk];
  });
}
