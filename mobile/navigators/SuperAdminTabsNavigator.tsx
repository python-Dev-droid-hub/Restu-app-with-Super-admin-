import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import SuperAdminDashboard from '../screens/dashboards/SuperAdminDashboard';
import AdminBranchesScreen from '../screens/admin/AdminBranchesScreen';
import AdminReportsScreen from '../screens/admin/AdminReportsScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';
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
      <Tab.Screen name="AdminDashboard" component={SuperAdminDashboard} />
      <Tab.Screen name="AdminBranches" component={AdminBranchesScreen} />
      <Tab.Screen name="AdminReports" component={AdminReportsScreen} />
      <Tab.Screen name="AdminSettings" component={AdminSettingsScreen} />
    </Tab.Navigator>
  );
}
