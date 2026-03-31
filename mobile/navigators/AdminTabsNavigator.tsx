import React, { useState } from 'react';
import { Modal, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalization } from '../context/LocalizationContext';

import AdminDashboard from '../screens/dashboards/AdminDashboard';
import AdminOrdersScreen from '../screens/admin/AdminOrdersScreen';
import AdminProductsScreen from '../screens/admin/AdminProductsScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminBottomNavigation from '../components/navigation/AdminBottomNavigation';
import BannerManagementScreen from '../screens/admin/BannerManagementScreen';

const Tab = createBottomTabNavigator();

// Custom tabBar component that receives navigation state
function CustomTabBar({ state, navigation }: { state: any; navigation: any }) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const nav = useNavigation();
  const { t } = useLocalization();
  
  const currentRoute = state.routes[state.index].name;

  const menuItems = [
    { name: t('notifications.title'), icon: 'notifications-outline', screen: 'AdminNotifications' },
    { name: 'Table Assignment', icon: 'grid-outline', screen: 'TableAssignment' },
    { name: 'Riders', icon: 'bicycle-outline', screen: 'RidersManagement' },
    { name: t('nav.categories'), icon: 'grid-outline', screen: 'AdminCategories' },
    { name: t('products.title'), icon: 'restaurant-outline', screen: 'AdminProducts' },
    { name: 'Branches', icon: 'business-outline', screen: 'AdminBranches' },
    { name: 'Banner Management', icon: 'image-outline', screen: 'BannerManagement' },
    { name: t('nav.coupons'), icon: 'ticket-outline', screen: 'AdminCoupons' },
    { name: 'Deals', icon: 'pricetag-outline', screen: 'AdminDeals' },
    { name: 'Product Size', icon: 'resize-outline', screen: 'AdminProductSizes' },
    { name: t('nav.reports'), icon: 'bar-chart-outline', screen: 'AdminReports' },
    { name: t('nav.settings'), icon: 'settings-outline', screen: 'AdminSettings' },
  ];

  const navigateToScreen = async (screenName: string) => {
    setShowMoreMenu(false);
    
    // Get user role for proper navigation
    const role = await AsyncStorage.getItem('userRole');
    
    // Check if the target is a tab screen
    const tabScreens = ['Home', 'AdminOrders', 'AdminUsers', 'AdminProducts', 'BannerManagement'];
    const isTabScreen = tabScreens.includes(screenName);
    
    if (isTabScreen) {
      // Navigate within tabs
      // @ts-ignore
      nav.navigate(screenName);
    } else {
      // Navigate to stack screen - use parent navigator
      // @ts-ignore
      nav.navigate(screenName);
    }
  };

  return (
    <>
      <AdminBottomNavigation 
        currentRoute={currentRoute}
        onMorePress={() => setShowMoreMenu(true)} 
      />

      <Modal
        visible={showMoreMenu}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMoreMenu(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('nav.more')}</Text>
              <TouchableOpacity onPress={() => setShowMoreMenu(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={() => navigateToScreen(item.screen)}
              >
                <Ionicons name={item.icon as any} size={24} color="#E87E35" />
                <Text style={styles.menuItemText}>{item.name}</Text>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function AdminTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={AdminDashboard} />
      <Tab.Screen name="AdminOrders" component={AdminOrdersScreen} />
      <Tab.Screen name="AdminUsers" component={AdminUsersScreen} />
      <Tab.Screen name="AdminProducts" component={AdminProductsScreen} />
      <Tab.Screen name="BannerManagement" component={BannerManagementScreen} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A2E',
    marginLeft: 16,
  },
});
