// Theme Constants for Food Delivery App
// Primary: #FF6B35 (Red-Orange)

export const colors = {
  // Primary Colors
  primary: '#FF6B35',
  primary_dark: '#E85A2B',
  primary_light: '#FF8B55',
  primary_50: '#FFF0EB',
  
  // Semantic Colors
  success: '#2ECC71',
  success_light: '#E8F8F0',
  warning: '#FF9500',
  warning_light: '#FFF4E5',
  danger: '#E74C3C',
  danger_light: '#FDEDEC',
  info: '#3498DB',
  info_light: '#EBF5FB',
  
  // Neutral Colors
  white: '#FFFFFF',
  black: '#000000',
  
  // Gray Scale
  gray_50: '#FAFAFA',
  gray_100: '#F5F5F5',
  gray_200: '#EEEEEE',
  gray_300: '#E0E0E0',
  gray_400: '#BDBDBD',
  gray_500: '#9E9E9E',
  gray_600: '#757575',
  gray_700: '#616161',
  gray_800: '#424242',
  gray_900: '#212121',
  
  // Text Colors
  text_dark: '#1A1A2E',
  text_medium: '#666666',
  text_light: '#999999',
  
  // Background
  background: '#F9F9F9',
  card_bg: '#FFFFFF',
  
  // Border
  border_light: '#EEEEEE',
  border_medium: '#DDDDDD',
};

export const typography = {
  sizes: {
    h1: 24,
    h2: 20,
    h3: 18,
    h4: 16,
    body: 14,
    small: 12,
    xs: 10,
    tiny: 8,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8,
  },
};

export const spacing = {
  horizontal: 16,
  vertical: 16,
  section: 20,
  card: 12,
  itemGap: 8,
  tiny: 4,
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  round: 100,
};

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  light: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  heavy: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Custom Hooks
export const useAppColors = () => colors;
export const useAppFonts = () => typography;
export const useAppSpacing = () => ({ ...spacing, borderRadius, shadows });

// Safe Area
export const safeArea = {
  top: 44,
  bottom: 34,
  horizontal: 16,
};

// Status Bar
export const statusBar = {
  height: 44,
  background: colors.primary,
};

// Bottom Tab
export const bottomTab = {
  height: 60,
  iconSize: 24,
  labelSize: 10,
  badgeSize: 20,
};
