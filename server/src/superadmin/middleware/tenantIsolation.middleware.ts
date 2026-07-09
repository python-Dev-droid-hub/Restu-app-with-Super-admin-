import { Request, Response, NextFunction } from 'express';
import { Tenant } from '@/superadmin/models';
import { createError } from '@/utils';

export interface ISaasTenantRequest extends Request {
  tenant?: InstanceType<typeof Tenant> & { planId?: any };
}

/**
 * Resolves tenant from subdomain slug (e.g. burgerinn.yourapp.com).
 * Attach to tenant-facing routes when multi-tenant subdomain routing is enabled.
 */
export const resolveTenantFromHost = async (
  req: ISaasTenantRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const host = req.hostname || req.get('host')?.split(':')[0] || '';
    const appDomain = process.env.APP_DOMAIN || 'yourapp.com';
    let slug = '';

    if (host.endsWith(`.${appDomain}`)) {
      slug = host.replace(`.${appDomain}`, '').toLowerCase();
    } else if (req.headers['x-tenant-slug']) {
      slug = String(req.headers['x-tenant-slug']).toLowerCase();
    }

    if (!slug || slug === 'app' || slug === 'www' || slug === 'api') {
      return next();
    }

    const tenant = await Tenant.findOne({ slug, deletedAt: null }).populate('planId');
    if (!tenant) throw createError('Restaurant not found.', 404);
    if (!tenant.isActive || tenant.subscriptionStatus === 'SUSPENDED') {
      throw createError('This restaurant account is suspended.', 403);
    }

    req.tenant = tenant as any;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Ensures req.tenant exists (use after resolveTenantFromHost).
 */
export const requireTenant = (
  req: ISaasTenantRequest,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.tenant) {
    return next(createError('Tenant context required.', 400));
  }
  next();
};

/** Attach tenant from authenticated user's tenantId (legacy single-tenant apps skip silently). */
export const resolveTenantFromUser = async (
  req: ISaasTenantRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.tenant) return next();
    const user = (req as any).user;
    const tenantId = user?.tenantId || (req as any).authTenantId;
    if (!tenantId) return next();

    const tenant = await Tenant.findById(tenantId).populate('planId');
    if (tenant) req.tenant = tenant as any;
    next();
  } catch (err) {
    next(err);
  }
};

/** Block requests when tenant is suspended or inactive. */
export const ensureTenantActive = (
  req: ISaasTenantRequest,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.tenant) return next();
  if (!req.tenant.isActive || req.tenant.subscriptionStatus === 'SUSPENDED') {
    const err = createError('This restaurant account is suspended.', 403) as Error & { suspended?: boolean };
    err.suspended = true;
    return next(err);
  }
  next();
};
