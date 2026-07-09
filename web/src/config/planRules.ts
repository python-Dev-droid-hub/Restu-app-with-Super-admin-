import type { TenantPlanFeatures } from '../hooks/useTenantPlan';

/** Admin sidebar keys → required plan feature (must match server planRules.config.ts). */
export const ADMIN_NAV_FEATURE_MAP: Record<string, keyof TenantPlanFeatures | null> = {
  riders: 'rider_app',
  reports: 'analytics',
  kitchens: 'kitchen_display',
  'table-assignment': 'dine_in',
};

export function isNavKeyAllowed(
  key: string,
  hasFeature: (f: keyof TenantPlanFeatures) => boolean
): boolean {
  const required = ADMIN_NAV_FEATURE_MAP[key];
  if (!required) return true;
  return hasFeature(required);
}
