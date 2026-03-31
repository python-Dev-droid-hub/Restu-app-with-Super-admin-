import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import SuperAdminDashboard from '../screens/dashboards/SuperAdminDashboard';
import AdminOrdersScreen from '../screens/admin/AdminOrdersScreen';
import AdminProductsScreen from '../screens/admin/AdminProductsScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminBottomNavigation from '../components/navigation/AdminBottomNavigation';

const Tab = createBottomTabNavigator();

export default function SuperAdminTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
      tabBar={() => <AdminBottomNavigation />}
    >
      <Tab.Screen name="Home" component={SuperAdminDashboard} />
      <Tab.Screen name="AdminOrders" component={AdminOrdersScreen} />
      <Tab.Screen name="AdminProducts" component={AdminProductsScreen} />
      <Tab.Screen name="AdminUsers" component={AdminUsersScreen} />
    </Tab.Navigator>
  );
}
