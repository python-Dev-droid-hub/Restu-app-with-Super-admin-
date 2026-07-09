export interface TenantBranding {
  name: string;
  slug: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
}

export const DEFAULT_TENANT_BRANDING: TenantBranding = {
  name: 'Restaurant App',
  slug: '',
  logoUrl: null,
  faviconUrl: null,
  primaryColor: '#FA4A0C',
  secondaryColor: '#2D2D2D',
};

function normalizeHex(color: string): string {
  const c = color.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(c)) return c;
  if (/^#[0-9A-Fa-f]{3}$/.test(c)) {
    return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`;
  }
  return DEFAULT_TENANT_BRANDING.primaryColor;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = normalizeHex(hex).slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}

export function darken(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const f = 1 - amount;
  return rgbToHex(r * f, g * f, b * f);
}

export function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

/** True when a background is light enough that body text should be dark. */
export function isLightColor(hex: string): boolean {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62;
}

export function contrastTextOnBackground(hex: string): '#FFFFFF' | '#1a1a2e' {
  return isLightColor(hex) ? '#1a1a2e' : '#FFFFFF';
}

export function applyTenantBrandingCss(branding: TenantBranding): void {
  const root = document.documentElement;
  const primary = normalizeHex(branding.primaryColor);
  const secondary = normalizeHex(branding.secondaryColor);
  const { r, g, b } = hexToRgb(primary);

  root.style.setProperty('--primary', primary);
  root.style.setProperty('--primary-hover', darken(primary, 0.06));
  root.style.setProperty('--primary-dark', darken(primary, 0.12));
  root.style.setProperty('--primary-light', lighten(primary, 0.92));
  root.style.setProperty('--secondary', secondary);
  root.style.setProperty('--secondary-hover', darken(secondary, 0.08));
  root.style.setProperty('--shadow-orange', `0 4px 12px rgba(${r}, ${g}, ${b}, 0.25)`);
}

export function resetTenantBrandingCss(): void {
  applyTenantBrandingCss(DEFAULT_TENANT_BRANDING);
}

export function applyTenantFavicon(faviconUrl: string | null): void {
  const link =
    (document.querySelector("link[rel*='icon']") as HTMLLinkElement | null) ||
    document.createElement('link');
  link.rel = 'icon';
  link.href = faviconUrl || '/favicon.ico';
  if (!link.parentNode) document.head.appendChild(link);
}

export function applyTenantDocumentTitle(name: string): void {
  if (name && name !== DEFAULT_TENANT_BRANDING.name) {
    document.title = name;
  }
}

export function isSuperAdminPath(pathname: string): boolean {
  return pathname.startsWith('/superadmin');
}

export function alphaHex(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function buildTenantPalette(primaryColor: string, secondaryColor: string) {
  const primary = normalizeHex(primaryColor);
  const secondary = normalizeHex(secondaryColor);
  return {
    primary,
    secondary,
    primaryHover: darken(primary, 0.06),
    primaryDark: darken(primary, 0.12),
    primaryLight: lighten(primary, 0.92),
    secondaryDark: darken(secondary, 0.15),
    secondaryLight: lighten(secondary, 0.85),
    pageBg: lighten(primary, 0.96),
    activeBg: alphaHex(primary, 0.12),
    activeBgHover: alphaHex(primary, 0.08),
  };
}

const BRANDING_CACHE_KEY = 'tenantBrandingCache';

export function cacheTenantBranding(branding: TenantBranding): void {
  try {
    sessionStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(branding));
  } catch {
    /* ignore quota errors */
  }
}

export function readCachedTenantBranding(): TenantBranding | null {
  try {
    const raw = sessionStorage.getItem(BRANDING_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TenantBranding>;
    if (!parsed?.primaryColor) return null;
    return {
      name: parsed.name || DEFAULT_TENANT_BRANDING.name,
      slug: parsed.slug || '',
      logoUrl: parsed.logoUrl ?? null,
      faviconUrl: parsed.faviconUrl ?? null,
      primaryColor: parsed.primaryColor,
      secondaryColor: parsed.secondaryColor || DEFAULT_TENANT_BRANDING.secondaryColor,
    };
  } catch {
    return null;
  }
}

export function clearCachedTenantBranding(): void {
  try {
    sessionStorage.removeItem(BRANDING_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

export function toTenantBranding(input: Partial<TenantBranding> | null | undefined): TenantBranding {
  if (!input) return DEFAULT_TENANT_BRANDING;
  return {
    name: input.name || DEFAULT_TENANT_BRANDING.name,
    slug: input.slug || '',
    logoUrl: input.logoUrl ?? null,
    faviconUrl: input.faviconUrl ?? null,
    primaryColor: input.primaryColor || DEFAULT_TENANT_BRANDING.primaryColor,
    secondaryColor: input.secondaryColor || DEFAULT_TENANT_BRANDING.secondaryColor,
  };
}

export function getStoredTenantContext(): { tenantId?: string; slug?: string } {
  try {
    const tenantId =
      localStorage.getItem('impersonationTenantId') ||
      JSON.parse(localStorage.getItem('userData') || sessionStorage.getItem('userData') || '{}')?.tenantId;
    const slug = localStorage.getItem('tenantSlug') || undefined;
    return {
      tenantId: tenantId ? String(tenantId) : undefined,
      slug: slug || undefined,
    };
  } catch {
    return {};
  }
}
