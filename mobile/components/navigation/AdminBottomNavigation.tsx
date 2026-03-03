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
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../constants/colors';
import { getSpacing } from '../../utils/responsive';
import { useLocalization } from '../../context/LocalizationContext';

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
  
  const { t } = useLocalization();
  
  const navItems = [
    { name: 'AdminDashboard', label: t('nav.home'), icon: 'home-outline', activeIcon: 'home' },
    { name: 'AdminOrders', label: t('nav.orders'), icon: 'document-text-outline', activeIcon: 'document-text' },
    { name: 'AdminProducts', label: t('nav.menu'), icon: 'restaurant-outline', activeIcon: 'restaurant' },
    { name: 'AdminUsers', label: t('nav.users'), icon: 'people-outline', activeIcon: 'people' },
    { name: 'More', label: t('nav.more'), icon: 'ellipsis-horizontal', activeIcon: 'ellipsis-horizontal' },
  ];

  const tabRouteNames = new Set(['AdminDashboard', 'ManagerDashboard', 'AdminOrders', 'AdminProducts', 'AdminUsers']);
  
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
      // Check which dashboard we're currently using
      const isManager = currentRoute === 'ManagerDashboard' || await AsyncStorage.getItem('userRole') === 'BRANCH_MANAGER';
      const homeRoute = isManager ? 'ManagerDashboard' : 'AdminDashboard';
      
      // If we're already inside the tab navigator, keep navigation inside tabs
      if (tabRouteNames.has(currentRoute)) {
        // @ts-ignore
        navigation.navigate(homeRoute);
      } else {
        // For stack-pushed screens, reset back to the correct dashboard tab navigator
        const dashboardRoute = await getDashboardRouteName();
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: dashboardRoute as never }],
          })
        );
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
