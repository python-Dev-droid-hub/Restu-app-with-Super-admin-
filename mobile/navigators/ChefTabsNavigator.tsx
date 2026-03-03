import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import ChefDashboard from '../screens/dashboards/ChefDashboard';
import KitchenDisplay from '../screens/chef/KitchenDisplay';
import KitchenStats from '../screens/chef/KitchenStats';

const Tab = createBottomTabNavigator();

export default function ChefTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { display: 'none' }, // Hide external tab bar - ChefDashboard has its own
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any = 'home-outline';

          if (route.name === 'ChefHome') iconName = focused ? 'home' : 'home-outline';
          if (route.name === 'ChefKitchen') iconName = focused ? 'restaurant' : 'restaurant-outline';
          if (route.name === 'ChefStats') iconName = focused ? 'stats-chart' : 'stats-chart-outline';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#E87E35',
        tabBarInactiveTintColor: '#8E8E93',
      })}
    >
      <Tab.Screen name="ChefHome" component={ChefDashboard} options={{ title: 'Home' }} />
      <Tab.Screen name="ChefKitchen" component={KitchenDisplay} options={{ title: 'Kitchen' }} />
      <Tab.Screen name="ChefStats" component={KitchenStats} options={{ title: 'Stats' }} />
    </Tab.Navigator>
  );
}
