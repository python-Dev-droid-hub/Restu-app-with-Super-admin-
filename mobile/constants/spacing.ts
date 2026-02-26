// Spacing constants for the app
// Following consistent spacing across all screens

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const SPACING = {
  // Layout
  headerHeight: 56,
  footerHeight: 60,
  tabHeight: 44,
  buttonHeight: 44,
  inputHeight: 40,

  // Padding & Margins
  horizontal: 16,
  vertical: 12,
  section: 20,
  itemGap: 12,
  card: 16,
  small: 8,
  tiny: 4,

  // Border Radius
  borderRadius: {
    button: 8,
    card: 12,
    input: 8,
    badge: 3,
    circle: 999,
  },

  // Shadows
  shadow: {
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
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    heavy: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
  },

  // Icon sizes
  icon: {
    tiny: 12,
    small: 16,
    medium: 20,
    large: 24,
    xlarge: 32,
  },

  // Screen dimensions
  screen: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },

  // Card dimensions
  statCard: {
    width: 90,
    height: 90,
  },
} as const;

// Export individual spacing properties for convenience
export const {
  horizontal,
  vertical,
  section,
  itemGap,
  card,
  small,
  tiny,
  headerHeight,
  footerHeight,
  buttonHeight,
} = SPACING;

export default SPACING;
