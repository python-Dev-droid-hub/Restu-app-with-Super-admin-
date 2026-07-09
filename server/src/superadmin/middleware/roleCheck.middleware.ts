import { Response, NextFunction } from 'express';
import { ISuperAdminRequest, SuperAdminRole } from '@/superadmin/types';
import { createError } from '@/utils';

export const requireSuperAdminRole = (...roles: SuperAdminRole[]) => {
  return (req: ISuperAdminRequest, _res: Response, next: NextFunction): void => {
    if (!req.superAdmin) {
      return next(createError('Authentication required.', 401));
    }
    if (!roles.includes(req.superAdmin.role)) {
      return next(createError('Insufficient permissions for this action.', 403));
    }
    next();
  };
};

/** Full access roles */
export const requireFullAccess = requireSuperAdminRole('SUPER_ADMIN');

/** Read-only roles can GET; mutations need SUPER_ADMIN or specific role */
export const canManageTenants = requireSuperAdminRole('SUPER_ADMIN', 'ONBOARDING_AGENT');
export const canManageBilling = requireSuperAdminRole('SUPER_ADMIN', 'BILLING_MANAGER');
