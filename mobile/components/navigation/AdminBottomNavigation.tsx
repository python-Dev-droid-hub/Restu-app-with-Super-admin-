import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../constants/colors';
import { getSpacing } from '../../utils/responsive';

const { width } = Dimensions.get('window');

interface AdminBottomNavigationProps {
  onMorePress?: () => void;
  currentRoute?: string;
}

export default function AdminBottomNavigation({ onMorePress, currentRoute: propRoute }: AdminBottomNavigationProps) {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  
  // Use prop if provided, otherwise fall back to useRoute
  const currentRoute = propRoute || route.name;
  
  const navItems = [
    { name: 'AdminDashboard', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
    { name: 'AdminOrders', label: 'Orders', icon: 'document-text-outline', activeIcon: 'document-text' },
    { name: 'AdminProducts', label: 'Menu', icon: 'restaurant-outline', activeIcon: 'restaurant' },
    { name: 'AdminUsers', label: 'Users', icon: 'people-outline', activeIcon: 'people' },
    { name: 'More', label: 'More', icon: 'ellipsis-horizontal', activeIcon: 'ellipsis-horizontal' },
  ];

  const tabRouteNames = new Set(['AdminDashboard', 'AdminOrders', 'AdminProducts', 'AdminUsers']);
  
  const getDashboardRouteName = async (): Promise<string> => {
    try {
      const role = await AsyncStorage.getItem('userRole');
      if (role === 'BRANCH_MANAGER') return 'ManagerDashboard';
      if (role === 'SUPER_ADMIN') return 'SuperAdminDashboard';
      if (role === 'ADMIN') return 'AdminDashboard';
      return 'AdminDashboard';
    } catch {
      return 'AdminDashboard';
    }
  };

  const handleNavPress = async (itemName: string) => {
    if (itemName === 'More') {
      if (onMorePress) {
        onMorePress();
      }
      return;
    }

    // When used inside role-based dashboards, Home must route back to the correct dashboard navigator
    if (itemName === 'AdminDashboard') {
      // If we're already inside the tab navigator, keep navigation inside tabs
      if (tabRouteNames.has(currentRoute)) {
        // @ts-ignore
        navigation.navigate('AdminDashboard');
      } else {
        // For stack-pushed screens (details), jump back to the correct dashboard navigator
        const dashboardRoute = await getDashboardRouteName();
        // @ts-ignore
        navigation.navigate(dashboardRoute);
      }
      return;
    }

    if (currentRoute !== itemName) {
      // @ts-ignore
      navigation.navigate(itemName);
    }
  };
  
  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }] }>
      {navItems.map((item) => {
        const isActive = currentRoute === item.name;
        const iconName = isActive ? item.activeIcon : item.icon;
        
        return (
          <TouchableOpacity
            key={item.name}
            style={styles.navItem}
            onPress={() => void handleNavPress(item.name)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={iconName as any}
              size={24}
              color={isActive ? COLORS.tabActive : COLORS.tabInactive}
            />
            <Text
              style={[
                styles.navLabel,
                isActive && styles.navLabelActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    backgroundColor: COLORS.white,
    paddingTop: getSpacing(2),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getSpacing(1),
    minWidth: width / 5,
  },
  navLabel: {
    fontSize: 11,
    color: COLORS.tabInactive,
    marginTop: getSpacing(0.5),
  },
  navLabelActive: {
    color: COLORS.tabActive,
    fontWeight: '600',
  },
});
