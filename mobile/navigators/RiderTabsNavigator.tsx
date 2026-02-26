import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import RiderDashboard from '../screens/dashboards/RiderDashboard';

const Tab = createBottomTabNavigator();

export default function RiderTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any = 'home-outline';
          if (route.name === 'RiderHome') iconName = focused ? 'home' : 'home-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#E87E35',
        tabBarInactiveTintColor: '#8E8E93',
      })}
    >
      <Tab.Screen name="RiderHome" component={RiderDashboard} options={{ title: 'Home' }} />
    </Tab.Navigator>
  );
}
