import { useWindowDimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Baseline width for scaling (iPhone X/11 Pro width)
const BASELINE_WIDTH = 380;

// Breakpoints for responsive design
export const BREAKPOINTS = {
  small: 375,   // iPhone SE, Pixel 4a
  medium: 390,  // iPhone 12/13/14
  large: 412,   // iPhone 14 Pro Max, Pixel 6 Pro
} as const;

type BreakpointKey = keyof typeof BREAKPOINTS;

// Platform detection
export const isAndroid = Platform.OS === 'android';
export const isIOS = Platform.OS === 'ios';

/**
 * Hook to get responsive size based on screen width
 * @param size Base size at 380px width
 * @returns Scaled size for current screen width
 */
export function useResponsiveSize(size: number): number {
  const { width } = useWindowDimensions();
  const scale = width / BASELINE_WIDTH;
  return Math.round(size * scale);
}

/**
 * Hook to get safe area insets
 * @returns Object with top, bottom, left, right insets
 */
export function useSafeAreaHelper(): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  const insets = useSafeAreaInsets();
  return {
    top: insets.top,
    bottom: insets.bottom,
    left: insets.left,
    right: insets.right,
  };
}

/**
 * Get spacing value based on 8pt grid system
 * @param multiplier Multiplier for base spacing (base = 4px)
 * @returns Spacing value in pixels
 */
export function getSpacing(multiplier: number): number {
  const BASE_SPACING = 4;
  return BASE_SPACING * multiplier;
}

// Predefined spacing values
export const SPACING = {
  xs: 4,    // 4px
  sm: 8,    // 8px
  md: 12,   // 12px
  base: 16, // 16px
  lg: 24,   // 24px
  xl: 32,   // 32px
} as const;

/**
 * Get responsive padding values
 * @returns Object with padding values for different sizes
 */
export function getResponsivePadding(): {
  xs: number;
  sm: number;
  md: number;
  base: number;
  lg: number;
  xl: number;
} {
  return { ...SPACING };
}

/**
 * Get current breakpoint based on screen width
 * @param width Screen width
 * @returns Breakpoint key: 'small' | 'medium' | 'large'
 */
export function getBreakpoint(width: number): BreakpointKey {
  if (width <= BREAKPOINTS.small) return 'small';
  if (width <= BREAKPOINTS.medium) return 'medium';
  return 'large';
}

/**
 * Hook to get current breakpoint
 * @returns Current breakpoint key
 */
export function useBreakpoint(): BreakpointKey {
  const { width } = useWindowDimensions();
  return getBreakpoint(width);
}

/**
 * Get responsive value based on breakpoint
 * @param values Object with values for each breakpoint
 * @param width Optional screen width (uses window dimensions if not provided)
 * @returns Value for current breakpoint
 */
export function getResponsiveValue<T>(
  values: { small: T; medium: T; large: T },
  width?: number
): T {
  const breakpoint = width ? getBreakpoint(width) : 'medium';
  return values[breakpoint];
}

/**
 * Hook to get responsive value
 * @param values Object with values for each breakpoint
 * @returns Value for current breakpoint
 */
export function useResponsiveValue<T>(values: {
  small: T;
  medium: T;
  large: T;
}): T {
  const { width } = useWindowDimensions();
  return getResponsiveValue(values, width);
}
