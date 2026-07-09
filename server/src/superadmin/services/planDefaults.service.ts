import { Plan } from '@/superadmin/models/Plan';
import { logger } from '@/utils/logger';

export const DEFAULT_PLANS = [
  {
    name: 'Starter',
    slug: 'starter',
    priceMonthly: 4999,
    priceYearly: 49990,
    maxBranches: 1,
    maxStaffAccounts: 5,
    maxMenuItems: 50,
    maxOrdersPerMonth: 500,
    features: {
      dine_in: true,
      delivery: false,
      takeaway: true,
      kitchen_display: false,
      rider_app: false,
      analytics: false,
      white_label: false,
      custom_domain: false,
      api_access: false,
      fbr_integration: false,
      loyalty_program: false,
      offline_mode: false,
    },
    isActive: true,
    isPublic: true,
  },
  {
    name: 'Growth',
    slug: 'growth',
    priceMonthly: 9999,
    priceYearly: 99990,
    maxBranches: 3,
    maxStaffAccounts: 15,
    maxMenuItems: 200,
    maxOrdersPerMonth: 2000,
    features: {
      dine_in: true,
      delivery: true,
      takeaway: true,
      kitchen_display: true,
      rider_app: true,
      analytics: true,
      white_label: false,
      custom_domain: false,
      api_access: false,
      fbr_integration: false,
      loyalty_program: false,
      offline_mode: false,
    },
    isActive: true,
    isPublic: true,
  },
  {
    name: 'Pro',
    slug: 'pro',
    priceMonthly: 19999,
    priceYearly: 199990,
    maxBranches: 10,
    maxStaffAccounts: 50,
    maxMenuItems: 1000,
    maxOrdersPerMonth: 10000,
    features: {
      dine_in: true,
      delivery: true,
      takeaway: true,
      kitchen_display: true,
      rider_app: true,
      analytics: true,
      white_label: true,
      custom_domain: true,
      api_access: true,
      fbr_integration: true,
      loyalty_program: true,
      offline_mode: false,
    },
    isActive: true,
    isPublic: true,
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    priceMonthly: 49999,
    priceYearly: 499990,
    maxBranches: 999,
    maxStaffAccounts: 999,
    maxMenuItems: 99999,
    maxOrdersPerMonth: 999999,
    features: {
      dine_in: true,
      delivery: true,
      takeaway: true,
      kitchen_display: true,
      rider_app: true,
      analytics: true,
      white_label: true,
      custom_domain: true,
      api_access: true,
      fbr_integration: true,
      loyalty_program: true,
      offline_mode: true,
    },
    isActive: true,
    isPublic: true,
  },
] as const;

export async function ensureDefaultPlans(): Promise<void> {
  const count = await Plan.countDocuments();
  if (count > 0) return;

  for (const plan of DEFAULT_PLANS) {
    await Plan.create(plan);
    logger.info(`[Plans] Created default plan: ${plan.name}`);
  }
  logger.info(`[Plans] Seeded ${DEFAULT_PLANS.length} default subscription plans`);
}
