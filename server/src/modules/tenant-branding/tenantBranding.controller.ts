import { Response } from 'express';
import { Tenant } from '@/superadmin/models';
import { IAuthRequest } from '@/types';
import { ISaasTenantRequest } from '@/superadmin/middleware/tenantIsolation.middleware';
import { asyncHandler } from '@/utils/response';
import { sendSuccess } from '@/utils/response';
import {
  DEFAULT_TENANT_BRANDING,
  formatTenantBranding,
  loadTenantBrandingById,
} from '@/utils/tenantBranding.util';
import { getTenantIdFromRequest } from '@/utils/tenantScope';
import { getTenantPlanSummary } from '@/superadmin/services/planEnforcement.service';

type BrandingRequest = IAuthRequest & ISaasTenantRequest;

export const getBranding = asyncHandler(async (req: BrandingRequest, res: Response) => {
  let branding = DEFAULT_TENANT_BRANDING;

  if (req.tenant) {
    branding = formatTenantBranding(req.tenant);
  } else if (req.query.tenantId) {
    const loaded = await loadTenantBrandingById(String(req.query.tenantId));
    if (loaded) branding = loaded;
  } else if (req.user?.tenantId || (req as any).authTenantId) {
    const tid = String(req.user?.tenantId || (req as any).authTenantId);
    const loaded = await loadTenantBrandingById(tid);
    if (loaded) branding = loaded;
  } else if (req.query.slug) {
    const tenant = await Tenant.findOne({
      slug: String(req.query.slug).toLowerCase().trim(),
      deletedAt: null,
    }).select('name slug logoUrl faviconUrl primaryColor secondaryColor');
    if (tenant) branding = formatTenantBranding(tenant);
  }

  sendSuccess(res, { branding }, 'Tenant branding retrieved');
});

export const getPlan = asyncHandler(async (req: BrandingRequest, res: Response) => {
  const tenantId =
    getTenantIdFromRequest(req) ||
    (req.query.tenantId ? String(req.query.tenantId) : undefined);

  if (!tenantId) {
    sendSuccess(res, { plan: null }, 'No tenant context');
    return;
  }

  const plan = await getTenantPlanSummary(tenantId);
  sendSuccess(res, { plan }, 'Tenant plan retrieved');
});
