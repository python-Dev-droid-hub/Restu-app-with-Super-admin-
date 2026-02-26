// Typography constants for the app
// Following consistent font sizes and weights across all screens

export const FONTS = {
  // Font Sizes
  sizes: {
    heading: 24,      // Page title: Bold 24px
    subheading: 16,     // Section title: Bold 16px
    body: 14,           // Body text: Regular 14px
    small: 12,          // Small text: Regular 12px
    label: 12,          // Label text: Regular 12px
    button: 14,         // Button text: Bold 14px
    cardTitle: 14,      // Card title: Bold 14px
    cardSubtitle: 12,   // Card subtitle: Regular 12px
    tiny: 10,           // Tiny text: 10px
  },

  // Font Weights
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
} as const;

// Export individual font properties for convenience
export const {
  sizes: fontSizes,
  weights: fontWeights,
  lineHeight: lineHeights,
} = FONTS;

export default FONTS;
