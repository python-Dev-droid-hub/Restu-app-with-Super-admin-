import { Response, NextFunction } from 'express';
import { ISaasTenantRequest } from '@/superadmin/middleware/tenantIsolation.middleware';
import { createError } from '@/utils';

type FeatureKey =
  | 'dine_in' | 'delivery' | 'takeaway' | 'kitchen_display' | 'rider_app'
  | 'analytics' | 'white_label' | 'custom_domain' | 'api_access'
  | 'fbr_integration' | 'loyalty_program' | 'offline_mode';

export const requireTenantFeature = (feature: FeatureKey) => {
  return (req: ISaasTenantRequest, _res: Response, next: NextFunction): void => {
    if (!req.tenant) {
      return next(createError('Tenant context required.', 400));
    }

    const plan = req.tenant.planId as any;
    const overrides = (req.tenant as any).featureOverrides || {};
    const planFeatures = plan?.features || {};
    const enabled = overrides[feature] ?? planFeatures[feature];

    if (!enabled) {
      return next(
        createError(
          `Feature "${feature}" is not available on your current plan.`,
          403
        )
      );
    }
    next();
  };
};
