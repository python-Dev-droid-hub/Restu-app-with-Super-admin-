import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// App Styling Constants
const COLORS = {
  primary: '#FF6B35',
  darkText: '#2C3E50',
  gray: '#95A5A6',
  lightGray: '#ECEFF1',
  white: '#FFFFFF',
};

type TabType = 'Home' | 'Orders' | 'Earnings' | 'Settings';

interface RiderFooterNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export default function RiderFooterNavigation({ activeTab, onTabChange }: RiderFooterNavigationProps) {
  const insets = useSafeAreaInsets();

  const tabs = [
    { id: 'Home' as TabType, label: 'Home', icon: 'home' },
    { id: 'Orders' as TabType, label: 'Orders', icon: 'document-text' },
    { id: 'Earnings' as TabType, label: 'Earnings', icon: 'wallet' },
    { id: 'Settings' as TabType, label: 'Profile', icon: 'person' },
  ];

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabButton}
            onPress={() => onTabChange(tab.id)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isActive ? (tab.icon as any) : (`${tab.icon}-outline` as any)}
              size={24}
              color={isActive ? COLORS.primary : COLORS.gray}
            />
            <Text
              style={[
                styles.tabText,
                isActive && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
            {isActive && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    height: 60,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    paddingTop: 8,
  },
  tabText: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 40,
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
});
