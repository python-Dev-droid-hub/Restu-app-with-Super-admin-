import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { createAppTheme } from '../theme';
import { getAuthToken } from '../utils/authStorage';
import {
  applyTenantBrandingCss,
  applyTenantDocumentTitle,
  applyTenantFavicon,
  cacheTenantBranding,
  clearCachedTenantBranding,
  DEFAULT_TENANT_BRANDING,
  isSuperAdminPath,
  getStoredTenantContext,
  readCachedTenantBranding,
  resetTenantBrandingCss,
  type TenantBranding,
} from '../utils/tenantBranding';

interface TenantBrandingContextType {
  branding: TenantBranding;
  isLoading: boolean;
  refreshBranding: () => Promise<void>;
}

const TenantBrandingContext = createContext<TenantBrandingContextType>({
  branding: DEFAULT_TENANT_BRANDING,
  isLoading: false,
  refreshBranding: async () => {},
});

export const useTenantBranding = () => useContext(TenantBrandingContext);

function applyBranding(branding: TenantBranding): void {
  applyTenantBrandingCss(branding);
  const favicon = branding.faviconUrl
    ? (branding.faviconUrl.startsWith('http') ? branding.faviconUrl : api.getImageUrl(branding.faviconUrl))
    : null;
  applyTenantFavicon(favicon);
  applyTenantDocumentTitle(branding.name);
}

interface TenantBrandingProviderProps {
  children: ReactNode;
}

export const TenantBrandingProvider: React.FC<TenantBrandingProviderProps> = ({ children }) => {
  const location = useLocation();
  const [branding, setBranding] = useState<TenantBranding>(
    () => readCachedTenantBranding() || DEFAULT_TENANT_BRANDING
  );
  const [isLoading, setIsLoading] = useState(false);

  const isSuperAdmin = isSuperAdminPath(location.pathname);

  useEffect(() => {
    if (isSuperAdmin) return;
    const cached = readCachedTenantBranding();
    if (cached) applyBranding(cached);
  }, [isSuperAdmin]);

  const refreshBranding = useCallback(async () => {
    if (isSuperAdminPath(window.location.pathname)) {
      resetTenantBrandingCss();
      clearCachedTenantBranding();
      setBranding(DEFAULT_TENANT_BRANDING);
      return;
    }

    setIsLoading(true);
    try {
      const ctx = getStoredTenantContext();
      const params = new URLSearchParams();
      if (ctx.tenantId) params.set('tenantId', ctx.tenantId);
      else if (ctx.slug) params.set('slug', ctx.slug);
      const query = params.toString() ? `?${params.toString()}` : '';
      const res: any = await api.get(`/tenant/branding${query}`);
      const loaded: TenantBranding = res?.data?.branding || DEFAULT_TENANT_BRANDING;
      setBranding(loaded);
      applyBranding(loaded);
      cacheTenantBranding(loaded);
      if (loaded.slug) localStorage.setItem('tenantSlug', loaded.slug);
    } catch {
      resetTenantBrandingCss();
      clearCachedTenantBranding();
      setBranding(DEFAULT_TENANT_BRANDING);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      resetTenantBrandingCss();
      clearCachedTenantBranding();
      setBranding(DEFAULT_TENANT_BRANDING);
      return;
    }
    void refreshBranding();
  }, [isSuperAdmin, location.pathname, refreshBranding]);

  useEffect(() => {
    const onRefresh = () => void refreshBranding();
    window.addEventListener('tenant-branding-refresh', onRefresh);
    window.addEventListener('userDataUpdated', onRefresh);
    return () => {
      window.removeEventListener('tenant-branding-refresh', onRefresh);
      window.removeEventListener('userDataUpdated', onRefresh);
    };
  }, [refreshBranding]);

  useEffect(() => {
    if (!getAuthToken() && !isSuperAdmin) {
      resetTenantBrandingCss();
      clearCachedTenantBranding();
      setBranding(DEFAULT_TENANT_BRANDING);
    }
  }, [location.pathname, isSuperAdmin]);

  const theme = useMemo(
    () =>
      isSuperAdmin
        ? createAppTheme()
        : createAppTheme(branding.primaryColor, branding.secondaryColor),
    [isSuperAdmin, branding.primaryColor, branding.secondaryColor]
  );

  return (
    <TenantBrandingContext.Provider value={{ branding, isLoading, refreshBranding }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </TenantBrandingContext.Provider>
  );
};
