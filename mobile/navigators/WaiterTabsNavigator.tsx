import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import WaiterDashboard from '../screens/dashboards/WaiterDashboard';
import OrderForm from '../screens/waiter/OrderForm';

const Tab = createBottomTabNavigator();

export default function WaiterTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any = 'home-outline';

          if (route.name === 'WaiterHome') iconName = focused ? 'home' : 'home-outline';
          if (route.name === 'WaiterOrder') iconName = focused ? 'add-circle' : 'add-circle-outline';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#E87E35',
        tabBarInactiveTintColor: '#8E8E93',
      })}
    >
      <Tab.Screen name="WaiterHome" component={WaiterDashboard} options={{ title: 'Home' }} />
      <Tab.Screen name="WaiterOrder" component={OrderForm} options={{ title: 'New Order' }} />
    </Tab.Navigator>
  );
}
