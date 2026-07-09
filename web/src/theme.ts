import { createTheme, type Theme } from '@mui/material/styles';
import { darken, lighten } from './utils/tenantBranding';

const baseThemeConfig = {
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    h6: {
      fontWeight: 800,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          fontWeight: 600,
          borderRadius: 10,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          maxWidth: '100%',
        },
      },
    },
  },
};

export function createAppTheme(primaryColor = '#FA4A0C', secondaryColor = '#2D2D2D'): Theme {
  return createTheme({
    ...baseThemeConfig,
    palette: {
      primary: {
        main: primaryColor,
        light: lighten(primaryColor, 0.92),
        dark: darken(primaryColor, 0.12),
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: secondaryColor,
        light: lighten(secondaryColor, 0.85),
        dark: darken(secondaryColor, 0.1),
        contrastText: '#FFFFFF',
      },
      background: {
        default: '#F9F9F9',
        paper: '#FFFFFF',
      },
      text: {
        primary: '#2D2D2D',
        secondary: '#5C5C5C',
      },
      divider: '#E8E8E8',
    },
  });
}

export const appTheme = createAppTheme();

export default appTheme;
