import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { api } from '../services/api';
import { clearAuthSession, setAuthSession, setUserProfile } from '../utils/authStorage';
import {
  applyTenantBrandingCss,
  applyTenantDocumentTitle,
  applyTenantFavicon,
  cacheTenantBranding,
  toTenantBranding,
} from '../utils/tenantBranding';

export function AuthImpersonate() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Missing impersonation token.');
      return;
    }

    (async () => {
      try {
        clearAuthSession();
        const res = await api.post<{
          user: Record<string, unknown>;
          tokens: { accessToken: string; refreshToken?: string };
          tenantId?: string;
          tenant?: { slug?: string; name?: string };
        }>('/auth/impersonate', { token });

        if (!res.success || !res.data?.tokens?.accessToken) {
          setError(res.error || res.message || 'Impersonation failed.');
          return;
        }

        const { user, tokens, tenantId, tenant } = res.data;
        setAuthSession(tokens.accessToken, tokens.refreshToken);
        setUserProfile({ ...user, tenantId }, { persist: true });
        localStorage.setItem('impersonating', 'true');
        if (tenantId) localStorage.setItem('impersonationTenantId', String(tenantId));
        if (tenant?.slug) localStorage.setItem('tenantSlug', tenant.slug);
        else localStorage.removeItem('tenantSlug');

        if (tenant) {
          const branding = toTenantBranding({
            name: tenant.name,
            slug: tenant.slug,
            logoUrl: (tenant as { logoUrl?: string }).logoUrl ?? null,
            faviconUrl: (tenant as { faviconUrl?: string }).faviconUrl ?? null,
            primaryColor: (tenant as { primaryColor?: string }).primaryColor,
            secondaryColor: (tenant as { secondaryColor?: string }).secondaryColor,
          });
          applyTenantBrandingCss(branding);
          applyTenantDocumentTitle(branding.name);
          const favicon = branding.faviconUrl
            ? (branding.faviconUrl.startsWith('http') ? branding.faviconUrl : api.getImageUrl(branding.faviconUrl))
            : null;
          applyTenantFavicon(favicon);
          cacheTenantBranding(branding);
        }

        window.dispatchEvent(new Event('tenant-branding-refresh'));
        navigate('/admin/dashboard', { replace: true });
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string } }; message?: string };
        setError(err?.response?.data?.message || err?.message || 'Impersonation failed.');
      }
    })();
  }, [searchParams, navigate]);

  if (error) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh" gap={2} px={2}>
        <Typography color="error" textAlign="center">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh" gap={2}>
      <CircularProgress />
      <Typography>Signing in as tenant admin…</Typography>
    </Box>
  );
}
