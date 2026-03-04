import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '../theme';

// Main Tab Screens
import HomeScreen from '../screens/food-app/HomeScreen';
import SearchScreen from '../screens/food-app/SearchScreen';
import CartScreen from '../screens/food-app/CartScreen';
import FavoritesScreen from '../screens/food-app/FavoritesScreen';
import AccountScreen from '../screens/food-app/AccountScreen';

// Stack Screens
import ProductDetailScreen from '../screens/food-app/ProductDetailScreen';
import CheckoutScreen from '../screens/food-app/CheckoutScreen';
import OrderTrackingScreen from '../screens/food-app/OrderTrackingScreen';
import OrderHistoryScreen from '../screens/food-app/OrderHistoryScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function CartBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

function MainTabsNavigator() {
  const cartItemCount = 3;
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: [
          styles.tabBar, 
          { paddingBottom: Math.max(12, insets.bottom) }
        ],
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray_500,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;
          let showBadge = false;
          switch (route.name) {
            case 'Home': iconName = focused ? 'home' : 'home-outline'; break;
            case 'Search': iconName = focused ? 'search' : 'search-outline'; break;
            case 'Cart': iconName = focused ? 'cart' : 'cart-outline'; showBadge = true; break;
            case 'Favorites': iconName = focused ? 'heart' : 'heart-outline'; break;
            case 'Account': iconName = focused ? 'person' : 'person-outline'; break;
            default: iconName = 'home-outline';
          }
          return (
            <View>
              <Ionicons name={iconName} size={size} color={color} />
              {showBadge && <CartBadge count={cartItemCount} />}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Cart" component={CartScreen} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

export default function CustomerTabsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabsNavigator} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
      <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: { 
    height: 70, 
    backgroundColor: colors.white, 
    borderTopWidth: 1, 
    borderTopColor: colors.gray_200, 
    elevation: 10, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    paddingBottom: 12, 
    paddingTop: 8 
  },
  tabLabel: { 
    fontSize: typography.sizes.xs, 
    fontWeight: typography.weights.medium, 
    marginTop: 4 
  },
  badge: { 
    position: 'absolute', 
    top: -6, 
    right: -10, 
    backgroundColor: colors.danger, 
    borderRadius: 10, 
    minWidth: 20, 
    height: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 4, 
    borderWidth: 2, 
    borderColor: colors.white 
  },
  badgeText: { 
    color: colors.white, 
    fontSize: 10, 
    fontWeight: 'bold' 
  },
});
