import { createTheme } from '@mui/material/styles';

// Create a theme that matches your CSS variables
export const appTheme = createTheme({
  palette: {
    primary: {
      main: '#FA4A0C', // --primary
      light: '#FFF5F2', // --primary-light
      dark: '#D43F0A', // --primary-dark
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F9F9F9', // --bg-body
      paper: '#FFFFFF', // --bg-card
    },
    text: {
      primary: '#2D2D2D', // --text-primary
      secondary: '#5C5C5C', // --text-secondary
    },
    divider: '#E8E8E8', // --border-color
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    h6: {
      fontWeight: 800,
    },
  },
  shape: {
    borderRadius: 12, // --radius-md
  },
  components: {
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
  },
});

export default appTheme;
