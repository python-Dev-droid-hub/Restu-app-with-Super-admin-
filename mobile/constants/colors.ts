// Color constants for the app
// Following a consistent color palette across all screens

export const COLORS = {
  // Brand Colors
  orange: '#FF8C42',
  green: '#2ECC71',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  yellow: '#F39C12',
  red: '#E74C3C',
  
  // Text Colors
  darkText: '#1A1A1A',
  lightText: '#666666',
  
  // Background & Surface Colors
  white: '#FFFFFF',
  lightGray: '#F5F5F5',
  lightBackground: '#F5F5F5',
  
  // Border & Divider
  border: '#E0E0E0',
  lightBorder: '#ECEFF1',
  
  // Semantic Colors
  success: '#2ECC71',
  warning: '#F1C40F',
  error: '#E74C3C',
  info: '#3498DB',
  
  // Additional Shades
  darkBg: '#1A1A2E',
  cardBg: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.5)',
  
  // Tab Bar
  tabActive: '#FF8C42',
  tabInactive: '#999999',
  
  // Aliases for design system consistency
  primary: '#FF8C42',
  secondary: '#666666',
} as const;

// Export individual colors for convenience
export const {
  orange,
  green,
  blue,
  purple,
  darkText,
  lightText,
  lightGray,
  border,
  white,
} = COLORS;

export default COLORS;
