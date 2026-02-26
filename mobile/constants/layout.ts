import { Platform, StatusBar } from 'react-native';

// Status bar height for Android
export const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

// Header margins for different platforms
export const HEADER_MARGIN = Platform.OS === 'ios' ? 50 : 20;

// Footer/bottom nav margins for different platforms
export const FOOTER_MARGIN = Platform.OS === 'android' ? 20 : 10;

// Bottom padding for scroll content
export const SCROLL_BOTTOM_PADDING = Platform.OS === 'android' ? 120 : 100;

// Bottom nav padding
export const BOTTOM_NAV_PADDING = Platform.OS === 'android' ? 25 : 15;

// Screen container style with proper Android padding
export const screenContainerStyle = {
  flex: 1,
  backgroundColor: '#fff',
  paddingTop: STATUSBAR_HEIGHT,
};

// Header style with proper margins
export const headerStyle = {
  flexDirection: 'row' as const,
  justifyContent: 'space-between' as const,
  alignItems: 'center' as const,
  paddingHorizontal: 20,
  marginTop: HEADER_MARGIN,
  paddingTop: 10,
  paddingBottom: 15,
};

// Bottom nav style with proper positioning
export const bottomNavStyle = {
  position: 'absolute' as const,
  bottom: FOOTER_MARGIN,
  left: 10,
  right: 10,
  flexDirection: 'row' as const,
  justifyContent: 'space-around' as const,
  alignItems: 'center' as const,
  backgroundColor: '#fff',
  paddingVertical: 12,
  paddingHorizontal: 20,
  borderRadius: 16,
  borderTopWidth: 1,
  borderTopColor: '#f0f0f0',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 5,
};
