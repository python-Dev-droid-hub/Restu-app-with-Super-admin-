import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

// App Styling Constants
const COLORS = {
  primary: '#FF6B35',
  darkText: '#2C3E50',
  gray: '#95A5A6',
  lightGray: '#ECEFF1',
  white: '#FFFFFF',
};

type TabType = 'Home' | 'Orders' | 'Earnings' | 'Settings';

interface RiderTabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export default function RiderTabNavigation({ activeTab, onTabChange }: RiderTabNavigationProps) {
  const tabs: TabType[] = ['Home', 'Orders', 'Earnings'];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab}
          style={styles.tabButton}
          onPress={() => onTabChange(tab)}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === tab && styles.tabTextActive,
            ]}
          >
            {tab}
          </Text>
          {activeTab === tab && (
            <View style={styles.activeIndicator} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    height: 44,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  tabText: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '400',
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.primary,
  },
});
