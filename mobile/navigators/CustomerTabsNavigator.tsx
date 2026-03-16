import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '../theme';
import { useWebSocket } from '../context/WebSocketContext';
import { useCart } from '../context/CartContext';

// Main Tab Screens
import HomeScreen from '../screens/food-app/HomeScreen';
import SearchScreen from '../screens/food-app/SearchScreen';
import CartScreen from '../screens/food-app/CartScreen';
import FavoritesScreen from '../screens/food-app/FavoritesScreen';
import AccountScreen from '../screens/food-app/AccountScreen';
import OrderHistoryScreen from '../screens/food-app/OrderHistoryScreen';

// Stack Screens
import ProductDetailScreen from '../screens/food-app/ProductDetailScreen';
import CheckoutScreen from '../screens/food-app/CheckoutScreen';
import OrderTrackingScreen from '../screens/food-app/OrderTrackingScreen';
import AddressesScreen from '../screens/food-app/AddressesScreen';
import PaymentMethodsScreen from '../screens/food-app/PaymentMethodsScreen';
import NotificationsScreen from '../screens/food-app/NotificationsScreen';
import SupportScreen from '../screens/food-app/SupportScreen';
import SettingsScreen from '../screens/food-app/SettingsScreen';
import CustomerChangePasswordScreen from '../screens/food-app/CustomerChangePasswordScreen';

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
  const { getCartCount } = useCart();
  const cartItemCount = getCartCount();
  const insets = useSafeAreaInsets();
  const tabBarBaseHeight = 60;
  const tabBarHeight = tabBarBaseHeight + Math.max(insets.bottom, 0);
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: [
          styles.tabBar, 
          {
            height: tabBarHeight,
            paddingBottom: Math.max(12, insets.bottom),
          }
        ],
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray_500,
        tabBarLabelStyle: styles.tabLabel,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;
          let showBadge = false;
          let badgeCount = 0;
          
          switch (route.name) {
            case 'Home': iconName = focused ? 'home' : 'home-outline'; break;
            case 'Cart': iconName = focused ? 'cart' : 'cart-outline'; showBadge = true; break;
            case 'Orders': iconName = focused ? 'receipt' : 'receipt-outline'; break;
            case 'Favorites': iconName = focused ? 'heart' : 'heart-outline'; break;
            case 'Account': 
              iconName = focused ? 'person' : 'person-outline'; 
              // Show notification badge on Account tab
              try {
                const { unreadCount } = useWebSocket();
                if (unreadCount > 0) {
                  showBadge = true;
                  badgeCount = unreadCount;
                }
              } catch (e) {
                // WebSocket not available yet
              }
              break;
            default: iconName = 'home-outline';
          }
          
          return (
            <View>
              <Ionicons name={iconName} size={size} color={color} />
              {showBadge && <CartBadge count={badgeCount > 0 ? badgeCount : cartItemCount} />}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Cart" component={CartScreen} />
      <Tab.Screen name="Orders" component={OrderHistoryScreen} />
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
      <Stack.Screen name="Addresses" component={AddressesScreen} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="ChangePassword" component={CustomerChangePasswordScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: { 
    backgroundColor: colors.white, 
    borderTopWidth: 1, 
    borderTopColor: colors.gray_200, 
    elevation: 10, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
