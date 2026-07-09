import { Tenant } from '@/superadmin/models';

export interface TenantBrandingDto {
  name: string;
  slug: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
}

export const DEFAULT_TENANT_BRANDING: TenantBrandingDto = {
  name: 'Restaurant App',
  slug: '',
  logoUrl: null,
  faviconUrl: null,
  primaryColor: '#FA4A0C',
  secondaryColor: '#2D2D2D',
};

export function formatTenantBranding(tenant: {
  name?: string;
  slug?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}): TenantBrandingDto {
  return {
    name: tenant.name || DEFAULT_TENANT_BRANDING.name,
    slug: tenant.slug || '',
    logoUrl: tenant.logoUrl || null,
    faviconUrl: tenant.faviconUrl || null,
    primaryColor: tenant.primaryColor || DEFAULT_TENANT_BRANDING.primaryColor,
    secondaryColor: tenant.secondaryColor || DEFAULT_TENANT_BRANDING.secondaryColor,
  };
}

export async function loadTenantBrandingById(tenantId: string): Promise<TenantBrandingDto | null> {
  const tenant = await Tenant.findById(tenantId).select(
    'name slug logoUrl faviconUrl primaryColor secondaryColor isActive subscriptionStatus deletedAt'
  );
  if (!tenant || tenant.deletedAt) return null;
  return formatTenantBranding(tenant);
}
