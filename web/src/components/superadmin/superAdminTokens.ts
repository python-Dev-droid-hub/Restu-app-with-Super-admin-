/** Super Admin design tokens — aligned with web/src/styles/variables.css */
export const saas = {
  brand: {
    name: 'RestoHub',
    tagline: 'Restaurant Platform',
    console: 'Platform Console',
  },
  colors: {
    primary: '#FA4A0C',
    primaryHover: '#E8440B',
    primaryLight: '#FFF5F2',
    primaryDark: '#D43F0A',
    sidebar: '#161618',
    sidebarSurface: '#1E1E21',
    sidebarHover: 'rgba(255, 255, 255, 0.06)',
    sidebarActive: 'rgba(250, 74, 12, 0.14)',
    sidebarActiveBorder: 'rgba(250, 74, 12, 0.35)',
    sidebarBorder: 'rgba(255, 255, 255, 0.08)',
    sidebarText: 'rgba(255, 255, 255, 0.88)',
    sidebarTextMuted: 'rgba(255, 255, 255, 0.50)',
    sidebarIcon: 'rgba(255, 255, 255, 0.62)',
    pageBg: '#F9F9F9',
    cardBorder: '#E8E8E8',
    textDark: '#2D2D2D',
    textMuted: '#5C5C5C',
    /** Dark brand panel (login / marketing) */
    panelBg: 'linear-gradient(180deg, #0C0C0E 0%, #141416 45%, #1A1A1D 100%)',
    panelHeadline: '#FFFFFF',
    panelBody: 'rgba(255, 255, 255, 0.80)',
    panelMuted: 'rgba(255, 255, 255, 0.55)',
    panelCardBg: 'rgba(255, 255, 255, 0.07)',
    panelCardBorder: 'rgba(255, 255, 255, 0.14)',
    panelCardHover: 'rgba(255, 255, 255, 0.10)',
  },
  sidebarWidth: 280,
  radius: { sm: 8, md: 12, lg: 16 },
  shadow: {
    card: '0 2px 8px rgba(0, 0, 0, 0.05)',
    elevated: '0 12px 40px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04)',
    header: '0 1px 0 rgba(0, 0, 0, 0.06)',
  },
} as const;

export const chartColors = [
  '#FA4A0C',
  '#2D2D2D',
  '#2196F3',
  '#4CAF50',
  '#9C27B0',
  '#FF9800',
];
