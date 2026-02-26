import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import CustomerDashboard from '../screens/dashboards/CustomerDashboard';
import CustomerMenuScreen from '../screens/CustomerMenuScreen';

const Tab = createBottomTabNavigator();

export default function CustomerTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any = 'home-outline';

          if (route.name === 'CustomerHome') iconName = focused ? 'home' : 'home-outline';
          if (route.name === 'CustomerMenu') iconName = focused ? 'restaurant' : 'restaurant-outline';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#E87E35',
        tabBarInactiveTintColor: '#8E8E93',
      })}
    >
      <Tab.Screen name="CustomerHome" component={CustomerDashboard} options={{ title: 'Home' }} />
      <Tab.Screen name="CustomerMenu" component={CustomerMenuScreen} options={{ title: 'Menu' }} />
    </Tab.Navigator>
  );
}
