import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../constants/colors';
import { getSpacing } from '../../utils/responsive';
import { useLocalization } from '../../context/LocalizationContext';
import { isAdminRole, getDashboardRouteForRole } from '../../utils/permissionHelpers';

const { width } = Dimensions.get('window');

interface AdminBottomNavigationProps {
  onMorePress?: () => void;
  currentRoute?: string;
  tabNavigation?: any; // Tab navigator's navigation prop for direct sibling navigation
}

export default function AdminBottomNavigation({ onMorePress, currentRoute: propRoute, tabNavigation }: AdminBottomNavigationProps) {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  
  // Use tabNavigation if provided (for navigation within tab navigator), otherwise use stack navigation
  const nav = tabNavigation || navigation;
  
  // Use prop if provided, otherwise fall back to useRoute
  const currentRoute = propRoute || route.name;
  
  const { t } = useLocalization();
  
  // Load user role
  React.useEffect(() => {
    const loadRole = async () => {
      const role = await AsyncStorage.getItem('userRole');
      setUserRole(role || '');
    };
    loadRole();
  }, []);
  
  const menuItems = [
    { name: t('notifications.title'), icon: 'notifications-outline', screen: 'AdminNotifications' },
    { name: 'Tables', icon: 'restaurant-outline', screen: 'TableAssignment' },
    { name: 'Riders', icon: 'bicycle-outline', screen: 'RidersManagement' },
    ...(isAdminRole(userRole) ? [{ name: t('nav.branches'), icon: 'business-outline', screen: 'AdminBranches' }] : []),
    { name: t('nav.categories'), icon: 'grid-outline', screen: 'AdminCategories' },
    { name: t('products.title'), icon: 'restaurant-outline', screen: 'AdminProducts' },
    { name: 'Banner Management', icon: 'image-outline', screen: 'BannerManagement' },
    { name: t('nav.coupons'), icon: 'ticket-outline', screen: 'AdminCoupons' },
    { name: 'Deals', icon: 'pricetag-outline', screen: 'AdminDeals' },
    { name: 'Product Size', icon: 'resize-outline', screen: 'AdminProductSizes' },
    { name: t('nav.reports'), icon: 'bar-chart-outline', screen: 'AdminReports' },
    ...(isAdminRole(userRole)
      ? [{ name: t('nav.settings'), icon: 'settings-outline', screen: 'AdminSettings' }]
      : []),
  ];
  
  // Role-specific navigation items
  const managerNavItems = [
    { name: 'ManagerDashboard', label: t('nav.home'), icon: 'home-outline', activeIcon: 'home' },
    { name: 'AdminOrders', label: t('nav.orders'), icon: 'document-text-outline', activeIcon: 'document-text' },
    { name: 'AdminProducts', label: t('products.title'), icon: 'restaurant-outline', activeIcon: 'restaurant' },
    { name: 'AdminUsers', label: t('nav.users'), icon: 'people-outline', activeIcon: 'people' },
    { name: 'More', label: t('nav.more'), icon: 'ellipsis-horizontal', activeIcon: 'ellipsis-horizontal' },
  ];

  const adminNavItems = [
    { name: 'Home', label: t('nav.home'), icon: 'home-outline', activeIcon: 'home' },
    { name: 'AdminOrders', label: t('nav.orders'), icon: 'document-text-outline', activeIcon: 'document-text' },
    { name: 'AdminProducts', label: t('products.title'), icon: 'restaurant-outline', activeIcon: 'restaurant' },
    { name: 'AdminUsers', label: t('nav.users'), icon: 'people-outline', activeIcon: 'people' },
    { name: 'More', label: t('nav.more'), icon: 'ellipsis-horizontal', activeIcon: 'ellipsis-horizontal' },
  ];

  // Use role-specific nav items
  const navItems = userRole === 'BRANCH_MANAGER' ? managerNavItems : adminNavItems;

  const tabRouteNames = new Set([
    'Home',
    'ManagerDashboard',
    'AdminOrders',
    'AdminProducts',
    'AdminUsers',
    'ManagerMenu',
    'AdminBranches',
    'AdminReports',
    'AdminSettings',
    'BannerManagement',
  ]);

  const getParentNavigator = () => {
    // If rendered inside a tab navigator, the stack navigator is usually the parent.
    // @ts-ignore
    return tabNavigation?.getParent?.() || (navigation as any).getParent?.() || null;
  };
  
  // Check if current route matches any home dashboard
  const isHomeActive = currentRoute === 'Home' || currentRoute === 'ManagerDashboard';

  const getHomeTabName = () =>
    userRole === 'BRANCH_MANAGER' ? 'ManagerDashboard' : 'Home';

  const isTabActive = (itemName: string): boolean => {
    if (itemName === 'More') return false;
    if (itemName === 'Home' || itemName === 'ManagerDashboard') {
      return isHomeActive;
    }
    return currentRoute === itemName;
  };
  
  const resetToRoleTabs = async (targetTabScreen?: string) => {
    const role = await AsyncStorage.getItem('userRole');
    const dashboardRoute = getDashboardRouteForRole(role || 'ADMIN');
    const params =
      dashboardRoute === 'AdminDashboard' || dashboardRoute === 'ManagerTabs'
        ? targetTabScreen
          ? { screen: targetTabScreen }
          : dashboardRoute === 'AdminDashboard'
            ? { screen: 'Home' }
            : undefined
        : undefined;

    nav.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: dashboardRoute, params } as any],
      })
    );
  };

  const handleNavPress = async (itemName: string) => {
    if (itemName === 'More') {
      setShowMoreMenu(true);
      return;
    }

    // Already on this tab — do nothing (standard tab bar behavior)
    if (isTabActive(itemName)) {
      return;
    }

    const isInsideTabNavigator = !!tabNavigation;

    if (itemName === 'Home' || itemName === 'ManagerDashboard') {
      const target = getHomeTabName();
      if (isInsideTabNavigator && tabNavigation) {
        tabNavigation.navigate(target);
      } else {
        await resetToRoleTabs();
      }
      return;
    }

    // Handle ManagerMenu navigation (More menu only)
    if (itemName === 'ManagerMenu') {
      if (isInsideTabNavigator) {
        // @ts-ignore
        nav.navigate('ManagerMenu');
      } else {
        // @ts-ignore
        nav.navigate('ManagerTabs', { screen: 'ManagerMenu' });
      }
      return;
    }

    if (itemName === 'AdminProducts' && isInsideTabNavigator) {
      // @ts-ignore
      nav.navigate('AdminProducts');
      return;
    }

    if (itemName === 'AdminReports' && isInsideTabNavigator) {
      // @ts-ignore
      nav.navigate('AdminReports');
      return;
    }

    // If we're outside a tab navigator (stack screens like Deals/Coupons/etc),
    // make bottom-nav items route back into the role's tab navigator to avoid
    // showing an old/previous homepage.
    if (!isInsideTabNavigator && (itemName === 'AdminOrders' || itemName === 'AdminUsers' || itemName === 'AdminProducts')) {
      await resetToRoleTabs(itemName);
      return;
    }

    // @ts-ignore
    nav.navigate(itemName);
  };
  
  return (
    <>
      <View style={[styles.container, { paddingBottom: insets.bottom }] }>
        {navItems.map((item) => {
          // For home tab, also check if we're on any dashboard variant
          const isActive = item.name === 'Home' 
            ? isHomeActive 
            : currentRoute === item.name;
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

      {/* More Menu Modal */}
      <Modal
        visible={showMoreMenu}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMoreMenu(false)}
      >
        <TouchableOpacity 
          style={styles.moreMenuOverlay}
          activeOpacity={1}
          onPress={() => setShowMoreMenu(false)}
        >
          <View style={[styles.moreMenuContainer, { paddingBottom: 20 + insets.bottom }]}>
            <View style={styles.moreMenuHeader}>
              <Text style={styles.moreMenuTitle}>{t('nav.more')}</Text>
              <TouchableOpacity onPress={() => setShowMoreMenu(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.moreMenuScrollContent}
            >
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.moreMenuItem}
                  onPress={() => {
                    setShowMoreMenu(false);
                    const parentNav = getParentNavigator();
                    const isInsideTabNavigator = !!tabNavigation;

                    const homeTarget = getHomeTabName();
                    if (
                      item.screen === 'AdminDashboard' ||
                      item.screen === 'ManagerDashboard' ||
                      item.screen === 'Home' ||
                      item.screen === homeTarget
                    ) {
                      if (isTabActive(homeTarget)) return;
                    } else if (tabRouteNames.has(item.screen) && isTabActive(item.screen)) {
                      return;
                    }
                    
                    // Handle Home navigation with reset
                    if (item.screen === 'AdminDashboard' || item.screen === 'ManagerDashboard') {
                      if (!isInsideTabNavigator) {
                        void resetToRoleTabs();
                      } else if (tabNavigation) {
                        // When inside tabs, use tabNavigation directly
                        const target = userRole === 'BRANCH_MANAGER' ? 'ManagerDashboard' : 'Home';
                        tabNavigation.navigate(target);
                      }
                      return;
                    }
                    
                    // Handle Orders/Products/Users from outside tabs with reset
                    if (!isInsideTabNavigator && 
                        (item.screen === 'AdminOrders' || item.screen === 'AdminUsers' || item.screen === 'AdminProducts')) {
                      void resetToRoleTabs(item.screen);
                      return;
                    }
                    
                    // If the screen is a tab route and we're inside tabs, navigate in tabs
                    if (tabNavigation && tabRouteNames.has(item.screen)) {
                      // @ts-ignore
                      tabNavigation.navigate(item.screen);
                      return;
                    }
                    
                    // For other screens, use parent stack navigator
                    if (parentNav) {
                      // @ts-ignore
                      parentNav.navigate(item.screen);
                      return;
                    }
                    
                    // Fallback
                    // @ts-ignore
                    navigation.navigate(item.screen);
                  }}
                >
                  <View style={styles.moreMenuIconContainer}>
                    <Ionicons name={item.icon as any} size={20} color="#E87E35" />
                  </View>
                  <Text style={styles.moreMenuItemText}>{item.name}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingTop: getSpacing(2),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: getSpacing(2),
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getSpacing(1),
    flex: 1,
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
  moreMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  moreMenuContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  moreMenuScrollContent: {
    paddingBottom: 8,
  },
  moreMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  moreMenuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  moreMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  moreMenuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff5f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  moreMenuItemText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
});
