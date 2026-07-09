import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { SxProps, Theme } from '@mui/material/styles';
import { useTenantBranding } from '../context/TenantBrandingProvider';
import { darken, alphaHex, lighten } from './tenantBranding';

/** Standard admin page outer padding — use on page root Box. */
export const adminPageContainerSx: SxProps<Theme> = {
  px: { xs: 1.5, sm: 2, md: 3 },
  pb: { xs: 2, md: 3 },
  pt: 0,
  width: '100%',
  maxWidth: '100%',
  boxSizing: 'border-box',
  overflowX: 'hidden',
};

/** Prevents clipped `type="time"` values in narrow grids. */
export const timeInputFieldSx: SxProps<Theme> = {
  minWidth: 0,
  flex: 1,
  '& .MuiOutlinedInput-root': {
    borderRadius: 1.5,
  },
  '& .MuiOutlinedInput-input': {
    px: 1.25,
    py: 1,
    fontSize: { xs: '0.8125rem', sm: '0.875rem' },
    minWidth: '5.5rem',
  },
};

export const responsiveTableContainerSx: SxProps<Theme> = {
  width: '100%',
  overflowX: 'auto',
  WebkitOverflowScrolling: 'touch',
};

export function useAdminBreakpoints() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'lg'));
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
  const isDrawerLayout = useMediaQuery(theme.breakpoints.down('lg'));
  return { isMobile, isTablet, isCompact, isDrawerLayout };
}

/** Page title + actions row used across admin screens. */
export const adminPageHeaderSx: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: { xs: 'stretch', sm: 'center' },
  flexDirection: { xs: 'column', sm: 'row' },
  gap: 1.5,
  mb: 3,
};

export const adminHeaderActionsSx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: { xs: 'column', sm: 'row' },
  gap: 1.5,
  width: { xs: '100%', sm: 'auto' },
  alignItems: { xs: 'stretch', sm: 'center' },
};

export const adminPrimaryButtonSx = (primary: string, primaryDark: string): SxProps<Theme> => ({
  bgcolor: primary,
  '&:hover': { bgcolor: primaryDark },
  textTransform: 'none',
  fontWeight: 700,
  whiteSpace: 'nowrap',
});

/** Shared tenant-aware styles for admin pages. */
export function useAdminPageStyles() {
  const theme = useTheme();
  const { branding } = useTenantBranding();
  const breakpoints = useAdminBreakpoints();
  const primary = branding.primaryColor || theme.palette.primary.main;
  const primaryDark = theme.palette.primary.dark || darken(primary, 0.12);

  const tabBtn = (active: boolean): SxProps<Theme> => ({
    textTransform: 'none',
    borderRadius: 2,
    px: { xs: 1.25, sm: 2 },
    py: 0.8,
    fontSize: { xs: 12, sm: 14 },
    fontWeight: 600,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    bgcolor: active ? primary : 'background.paper',
    color: active ? '#fff' : 'text.secondary',
    boxShadow: active ? `0 2px 8px ${primary}44` : '0 1px 3px rgba(0,0,0,0.08)',
    '&:hover': { bgcolor: active ? primaryDark : 'grey.100' },
  });

  return {
    ...breakpoints,
    theme,
    primary,
    primaryDark,
    page: adminPageContainerSx,
    pageBg: theme.palette.primary.light,
    header: adminPageHeaderSx,
    headerActions: adminHeaderActionsSx,
    primaryBtn: adminPrimaryButtonSx(primary, primaryDark),
    tabBtn,
    tableWrap: responsiveTableContainerSx,
    titleSx: { fontWeight: 'bold' as const, color: '#333', fontSize: { xs: 22, sm: 28 } },
  };
}

/** Tenant palette for staff role dashboards (manager, chef, waiter, rider). */
export function useStaffPalette() {
  const styles = useAdminPageStyles();
  const { primary, primaryDark, theme, page, tabBtn, primaryBtn, tableWrap, titleSx, header, isCompact, isMobile } = styles;
  const primaryLight = theme.palette.primary.light;

  return {
    ...styles,
    accent: primary,
    accentDark: primaryDark,
    accentLight: primaryLight,
    accentSoft: alphaHex(primary, 0.08),
    accentBorder: alphaHex(primary, 0.22),
    accentMid: lighten(primary, 0.06),
    accentLight: primaryLight,
    pageBg: theme.palette.background.default,
    colors: {
      primary,
      primaryLight,
      success: '#4caf50',
      error: '#f44336',
      warning: '#ff9800',
      info: '#2196f3',
      textPrimary: '#1a1a2e',
      textSecondary: '#666',
      bgLight: theme.palette.background.default,
      border: '#e0e0e0',
    },
  };
}
