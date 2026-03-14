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

const { width } = Dimensions.get('window');

interface AdminBottomNavigationProps {
  onMorePress?: () => void;
  currentRoute?: string;
}

export default function AdminBottomNavigation({ onMorePress, currentRoute: propRoute }: AdminBottomNavigationProps) {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  
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
    { name: t('nav.categories'), icon: 'grid-outline', screen: 'AdminCategories' },
    { name: t('products.title'), icon: 'restaurant-outline', screen: 'AdminProducts' },
    { name: 'Banner Management', icon: 'image-outline', screen: 'BannerManagement' },
    { name: t('nav.coupons'), icon: 'ticket-outline', screen: 'AdminCoupons' },
    { name: 'Deals', icon: 'pricetag-outline', screen: 'AdminDeals' },
    { name: 'Product Size', icon: 'resize-outline', screen: 'AdminProductSizes' },
    { name: t('nav.reports'), icon: 'bar-chart-outline', screen: 'AdminReports' },
    { name: t('nav.settings'), icon: 'settings-outline', screen: 'AdminSettings' },
  ];
  
  const navItems = [
    { name: 'AdminDashboard', label: t('nav.home'), icon: 'home-outline', activeIcon: 'home' },
    { name: 'AdminOrders', label: t('nav.orders'), icon: 'document-text-outline', activeIcon: 'document-text' },
    { name: 'AdminProducts', label: t('nav.menu'), icon: 'restaurant-outline', activeIcon: 'restaurant' },
    { name: 'AdminUsers', label: t('nav.users'), icon: 'people-outline', activeIcon: 'people' },
    { name: 'More', label: t('nav.more'), icon: 'ellipsis-horizontal', activeIcon: 'ellipsis-horizontal' },
  ];

  const tabRouteNames = new Set(['AdminDashboard', 'ManagerDashboard', 'SuperAdminDashboard', 'AdminOrders', 'AdminProducts', 'AdminUsers']);
  
  // Check if current route matches any home dashboard
  const isHomeActive = currentRoute === 'AdminDashboard' || currentRoute === 'ManagerDashboard' || currentRoute === 'SuperAdminDashboard';
  
  const getDashboardRouteName = async (): Promise<string> => {
    try {
      const role = await AsyncStorage.getItem('userRole');
      if (role === 'BRANCH_MANAGER') return 'ManagerTabs';
      if (role === 'SUPER_ADMIN') return 'SuperAdminDashboard';
      if (role === 'ADMIN') return 'AdminDashboard';
      return 'AdminDashboard';
    } catch {
      return 'AdminDashboard';
    }
  };

  const handleNavPress = async (itemName: string) => {
    if (itemName === 'More') {
      setShowMoreMenu(true);
      return;
    }

    // When used inside role-based dashboards, Home must route back to the correct dashboard navigator
    if (itemName === 'AdminDashboard') {
      // Check which dashboard we're currently using based on user role
      const role = await AsyncStorage.getItem('userRole');
      
      if (role === 'BRANCH_MANAGER') {
        // For Manager, navigate to ManagerTabs navigator with ManagerDashboard as initial screen
        // @ts-ignore
        navigation.navigate('ManagerTabs', { screen: 'ManagerDashboard' });
      } else {
        // For Admin and Super Admin, navigate to AdminDashboard (redesigned)
        // @ts-ignore
        navigation.navigate('AdminDashboard');
      }
      return;
    }

    if (currentRoute !== itemName) {
      // @ts-ignore
      navigation.navigate(itemName);
    }
  };
  
  return (
    <>
      <View style={[styles.container, { paddingBottom: insets.bottom }] }>
        {navItems.map((item) => {
          // For home tab, also check if we're on any dashboard variant
          const isActive = item.name === 'AdminDashboard' 
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
