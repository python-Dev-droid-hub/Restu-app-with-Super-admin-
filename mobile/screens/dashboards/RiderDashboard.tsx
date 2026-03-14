import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions, useNavigation } from '@react-navigation/native';

import RiderHomeHeader from './components/RiderHomeHeader';
import RiderHomeContent from './components/RiderHomeContent';
import RiderEarningsTab from './components/RiderEarningsTab';
import RiderOrdersTab from './components/RiderOrdersTab';
import RiderSettingsTab from './components/RiderSettingsTab';
import RiderNotificationsTab from './components/RiderNotificationsTab';
import { api } from '../../components/api/client';
import { useSettings } from '../../context/SettingsContext';

// App Styling System
export const COLORS = {
  primary: '#FF6B35',
  success: '#2ECC71',
  info: '#3498DB',
  warning: '#F39C12',
  danger: '#E74C3C',
  darkText: '#2C3E50',
  lightBg: '#F5F5F5',
  white: '#FFFFFF',
  gray: '#95A5A6',
  lightGray: '#ECEFF1',
  green: '#2ECC71',
  blue: '#3498DB',
  orange: '#FF6B35',
  red: '#E74C3C',
};

export const FONTS = {
  pageTitle: { fontSize: 24, fontWeight: '700' as const },
  sectionTitle: { fontSize: 16, fontWeight: '700' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
  button: { fontSize: 14, fontWeight: '700' as const },
  tab: { fontSize: 12, fontWeight: '400' as const },
};

export const SPACING = {
  horizontal: 16,
  verticalGap: 12,
  sectionGap: 20,
  cardPadding: 16,
  headerHeight: 56,
  footerHeight: 60,
};

type TabType = 'Home' | 'Orders' | 'Earnings' | 'Settings' | 'Notifications';

type RiderOrderStatus = 'pending' | 'assigned' | 'picked_up' | 'in_delivery' | 'delivered' | 'cancelled';

const normalizeRiderStatus = (status: string | undefined): RiderOrderStatus => {
  if (!status) return 'pending';

  const normalized = String(status).toUpperCase();

  const statusMap: Record<string, RiderOrderStatus> = {
    PENDING: 'pending',
    CONFIRMED: 'pending',
    PREPARING: 'pending',
    READY: 'pending',

    ASSIGNED: 'assigned',

    PICKED_UP: 'picked_up',
    PICKUP_COMPLETE: 'picked_up',

    IN_DELIVERY: 'in_delivery',
    OUT_FOR_DELIVERY: 'in_delivery',

    DELIVERED: 'delivered',
    COMPLETED: 'delivered',

    CANCELLED: 'cancelled',
    REJECTED: 'cancelled',
  };

  return statusMap[normalized] || 'pending';
};

export default function RiderDashboard() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { formatPrice } = useSettings();
  const [activeTab, setActiveTab] = useState<TabType>('Home');
  const [loading, setLoading] = useState(true);

  // Data states
  const [riderData, setRiderData] = useState({
    name: 'Rider',
    avatar: null as string | null,
    onDuty: true,
    rating: 5.0,
    verification: 100,
  });

  const [stats, setStats] = useState({
    activeDeliveries: 0,
    todayEarnings: 0,
    weekEarnings: 0,
    totalDeliveries: 0,
  });

  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [newOrderAlert, setNewOrderAlert] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load rider data
  const loadRiderData = useCallback(async () => {
    try {
      const userDataRaw = await AsyncStorage.getItem('userData');
      if (userDataRaw) {
        const userData = JSON.parse(userDataRaw);
        setRiderData(prev => ({
          ...prev,
          name: userData?.display_name || userData?.name || 'Rider',
          avatar: userData?.avatar || userData?.image || null,
        }));
      }
    } catch (error) {
      console.error('Error loading rider data:', error);
    }
  }, []);

  // Fetch dashboard stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/dashboard/rider/stats');
      if (response.success && response.data) {
        setStats({
          activeDeliveries: response.data.assignedDeliveries || 0,
          todayEarnings: response.data.todayEarnings || 0,
          weekEarnings: response.data.thisWeekEarnings || 0,
          totalDeliveries: response.data.completedDeliveries || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // Fetch active delivery
  const fetchActiveDelivery = useCallback(async () => {
    try {
      const response = await api.get('/orders/driver/my-orders');
      if (response.success && response.data) {
        // Find first active/pending order
        const active = response.data.deliveries?.find((o: any) => 
          o.status === 'ASSIGNED' || o.status === 'PICKED_UP' || o.status === 'IN_DELIVERY'
        );
        setActiveOrder(active || null);
      }
    } catch (error) {
      console.error('Error fetching active delivery:', error);
    }
  }, []);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      console.log('[RiderDashboard] Fetching orders...');
      const response = await api.get('/orders/driver/my-orders');
      console.log('[RiderDashboard] Orders response:', { success: response.success, hasData: !!response.data, deliveriesCount: response.data?.deliveries?.length || 0 });
      
      if (response.success && response.data) {
        // ===== TEMPORARY: Log first delivery for coordinate verification =====
        const deliveries = response.data.deliveries || [];
        console.log('[RiderDashboard] Raw deliveries array length:', deliveries.length);
        
        if (deliveries.length === 0) {
          console.log('⚠️ NO DELIVERIES FOUND - Cannot show map without orders');
        } else {
          const firstDelivery = deliveries[0];
          console.log('═══════════════════════════════════════════════════');
          console.log('FIRST DELIVERY OBJECT (for coordinate verification)');
          console.log('═══════════════════════════════════════════════════');
          console.log(JSON.stringify(firstDelivery, null, 2));
          console.log('═══════════════════════════════════════════════════');
          
          console.log('\n📍 COORDINATE FIELDS CHECK:');
          console.log('branch.location:', firstDelivery.branch?.location);
          console.log('branch.location.latitude:', firstDelivery.branch?.location?.latitude);
          console.log('branch.location.lat:', firstDelivery.branch?.location?.lat);
          console.log('branch.location.coordinates:', firstDelivery.branch?.location?.coordinates);
          
          console.log('\ndeliveryAddress.location:', firstDelivery.deliveryAddress?.location);
          console.log('deliveryAddress.location.latitude:', firstDelivery.deliveryAddress?.location?.latitude);
          console.log('deliveryAddress.location.lat:', firstDelivery.deliveryAddress?.location?.lat);
          console.log('deliveryAddress.coordinates:', firstDelivery.deliveryAddress?.coordinates);
          console.log('deliveryAddress.coords:', firstDelivery.deliveryAddress?.coords);
          
          console.log('\npickupLocation.location:', firstDelivery.pickupLocation?.location);
          console.log('pickupLocation.coordinates:', firstDelivery.pickupLocation?.coordinates);
          
          console.log('\n✅ After mapping, pickupCoords will be:', {
            branchExists: !!firstDelivery.branch,
            locationExists: !!firstDelivery.branch?.location,
            latitude: firstDelivery.branch?.location?.latitude || firstDelivery.branch?.location?.lat
          });
          console.log('═══════════════════════════════════════════════════');
        }
        // ===== END TEMPORARY LOGGING =====
        
        const formattedOrders = deliveries.map((order: any) => ({
          _id: order._id,
          id: order._id,
          orderNumber: order.orderNumber || `ORD-${order._id?.toString().slice(-6).toUpperCase()}`,
          customerName: order.customer?.displayName || order.customer?.name || 'Unknown Customer',
          pickupLocation: order.branch?.branchName || order.branch?.name || 'Restaurant',
          deliveryLocation: order.deliveryAddress?.street || order.deliveryAddress?.address || 'Delivery Address',
          distance: order.distance || 2.3,
          estimatedTime: order.estimatedTime || 15,
          estimatedEarning: order.deliveryFee || order.estimatedEarning || 0,
          status: normalizeRiderStatus(order.status),
          backendStatus: order.status,
          customerPhone: order.customer?.phoneNumber || order.customer?.phone || 'N/A',
          // Map coordinates
          pickupCoords: order.branch?.location ? {
            latitude: order.branch.location.latitude || order.branch.location.lat,
            longitude: order.branch.location.longitude || order.branch.location.lng,
          } : undefined,
          deliveryCoords: order.deliveryAddress?.location ? {
            latitude: order.deliveryAddress.location.latitude || order.deliveryAddress.location.lat,
            longitude: order.deliveryAddress.location.longitude || order.deliveryAddress.location.lng,
          } : order.deliveryAddress?.coordinates ? {
            latitude: order.deliveryAddress.coordinates[1],
            longitude: order.deliveryAddress.coordinates[0],
          } : undefined,
          // Additional fields
          restaurantName: order.branch?.branchName || 'Unknown Restaurant',
          deliveryAddress: order.deliveryAddress?.street || 'N/A',
          items: order.items?.map((item: any) => item.product?.name || 'Unknown Item') || [],
          totalAmount: order.totalAmount || 0,
        })) || [];
        setOrders(formattedOrders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  }, []);

  // Fetch earnings
  const fetchEarnings = useCallback(async () => {
    try {
      const response = await api.get('/dashboard/rider/earnings');
      if (response.success && response.data) {
        setEarnings(response.data);
      }
    } catch (error) {
      console.error('Error fetching earnings:', error);
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await api.get('/notifications');
      if (response.success && response.data) {
        const notifs = response.data.notifications || [];
        setNotifications(notifs);
        const unread = notifs.filter((n: any) => !n.read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);
  const checkNewOrders = useCallback(async () => {
    try {
      const response = await api.get('/orders/driver/available');
      if (response.success && response.data && response.data.orders?.length > 0) {
        const newOrder = response.data.orders[0];
        if (!activeOrder && !newOrderAlert) {
          setNewOrderAlert(newOrder);
        }
      }
    } catch (error) {
      console.error('Error checking new orders:', error);
    }
  }, [activeOrder, newOrderAlert]);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        loadRiderData(),
        fetchStats(),
        fetchActiveDelivery(),
        fetchOrders(),
        fetchEarnings(),
        fetchNotifications(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [loadRiderData, fetchStats, fetchActiveDelivery, fetchOrders, fetchEarnings, fetchNotifications]);

  // Polling for updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
      fetchActiveDelivery();
      checkNewOrders();
      fetchNotifications();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchStats, fetchActiveDelivery, checkNewOrders, fetchNotifications]);

  // Accept order
  const handleAcceptOrder = async (orderId: string) => {
    // ... (rest of the code remains the same)
    try {
      const response = await api.put(`/orders/${orderId}/accept`);
      if (response.success) {
        setNewOrderAlert(null);
        setActiveOrder(response.data.order);
        fetchStats();
        fetchOrders();
      }
    } catch (error) {
      console.error('Error accepting order:', error);
      Alert.alert('Error', 'Failed to accept order');
    }
  };

  // Decline order
  const handleDeclineOrder = () => {
    setNewOrderAlert(null);
  };

  // Mark delivered
  const handleMarkDelivered = async (orderId: string) => {
    try {
      const response = await api.put(`/orders/${orderId}/deliver`, { status: 'DELIVERED' });
      if (response.success) {
        setActiveOrder(null);
        fetchStats();
        fetchOrders();
        Alert.alert('Success', 'Order marked as delivered!');
      }
    } catch (error) {
      console.error('Error marking delivered:', error);
      Alert.alert('Error', 'Failed to mark as delivered');
    }
  };

  const handleStartRide = async (orderId: string) => {
    try {
      const response = await api.put(`/orders/${orderId}/deliver`, { status: 'OUT_FOR_DELIVERY' });
      if (response.success) {
        fetchStats();
        fetchOrders();
        Alert.alert('Success', 'Ride started! Order is now out for delivery.');
      }
    } catch (error) {
      console.error('Error starting ride:', error);
      Alert.alert('Error', 'Failed to start ride');
    }
  };

  const openInMaps = async (coords?: { latitude: number; longitude: number }) => {
    if (!coords?.latitude || !coords?.longitude) {
      Alert.alert('Error', 'Location not available for this order');
      return;
    }

    const { latitude, longitude } = coords;

    try {
      const url = Platform.select({
        ios: `maps://app?daddr=${latitude},${longitude}&dirflg=d`,
        android: `google.navigation:q=${latitude},${longitude}`,
      });
      if (!url) {
        Alert.alert('Error', 'Unable to create navigation URL');
        return;
      }
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert('Error', 'Unable to open maps application');
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening maps:', error);
      Alert.alert('Error', 'Failed to open navigation');
    }
  };

  const showOrderInfo = useCallback(
    (orderId: string) => {
      const order = orders.find((o) => String(o?._id) === String(orderId));
      if (!order) {
        Alert.alert('Order', 'Order details not found in your assigned orders. Please refresh.');
        return;
      }

      Alert.alert(
        'Assigned Order',
        `Order: ${order.orderNumber}\nCustomer: ${order.customerName}\nPickup: ${order.pickupLocation}\nDelivery: ${order.deliveryLocation}`,
        [
          {
            text: 'Pickup Nav',
            onPress: () => openInMaps(order?.pickupCoords),
          },
          {
            text: 'Delivery Nav',
            onPress: () => openInMaps(order?.deliveryCoords),
          },
          {
            text: 'Start Ride',
            onPress: () => handleStartRide(orderId),
          },
          {
            text: 'Close',
            style: 'cancel',
          },
        ]
      );
    },
    [handleStartRide, orders]
  );

  // Toggle duty status
  const toggleDuty = () => {
    setRiderData(prev => ({ ...prev, onDuty: !prev.onDuty }));
    // API call would go here
  };

  // Logout
  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['authToken', 'userRole', 'userData']);
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      })
    );
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Professional Header */}
      <RiderHomeHeader
        riderName={riderData.name}
        riderAvatar={riderData.avatar || undefined}
        isOnDuty={riderData.onDuty}
        onToggleDuty={toggleDuty}
        stats={{
          inProgress: stats.activeDeliveries,
          earnings: stats.todayEarnings,
          last7Days: stats.weekEarnings,
        }}
        onNotificationPress={() => setActiveTab('Notifications')}
        onSettingsPress={() => setActiveTab('Settings')}
        notificationCount={unreadCount}
      />

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'Home' && (
          <RiderHomeContent
            deliveries={orders}
            hasActiveDeliveries={orders.length > 0 || !!activeOrder}
            isLoading={loading}
            onAcceptOrders={() => setActiveTab('Orders')}
            onAcceptDelivery={(deliveryId: string) => handleAcceptOrder(deliveryId)}
            onMarkDelivered={(deliveryId: string) => handleMarkDelivered(deliveryId)}
            onStartRide={(deliveryId: string) => handleStartRide(deliveryId)}
            onNavigateToPickup={(deliveryId: string) => {
              const order = orders.find((o) => o?._id === deliveryId);
              openInMaps(order?.pickupCoords);
            }}
            onNavigateToDelivery={(deliveryId: string) => {
              const order = orders.find((o) => o?._id === deliveryId);
              openInMaps(order?.deliveryCoords);
            }}
            onCallCustomer={async (phone: string) => {
              if (!phone) return;
              try {
                const url = `tel:${phone}`;
                const canOpen = await Linking.canOpenURL(url);
                if (!canOpen) {
                  Alert.alert('Error', 'Unable to open phone dialer');
                  return;
                }
                await Linking.openURL(url);
              } catch (e) {
                Alert.alert('Error', 'Failed to open phone dialer');
              }
            }}
          />
        )}

        {activeTab === 'Orders' && (
          <RiderOrdersTab orders={orders} />
        )}

        {activeTab === 'Earnings' && (
          <RiderEarningsTab
            todayEarnings={stats.todayEarnings}
            weekEarnings={stats.weekEarnings}
            totalDeliveries={stats.totalDeliveries}
            earnings={earnings}
            formatPrice={formatPrice}
          />
        )}

        {activeTab === 'Settings' && (
          <RiderSettingsTab
            riderData={riderData}
            onLogout={handleLogout}
            onEditProfile={() => {}}
          />
        )}

        {activeTab === 'Notifications' && (
          <RiderNotificationsTab
            onNotificationCountChange={setUnreadCount}
            onNotificationPress={(n: any) => {
              const orderId = n?.data?.orderId || n?.relatedOrder;
              if (orderId) {
                setActiveTab('Home');
                showOrderInfo(String(orderId));
              }
            }}
          />
        )}
      </View>

      {/* Professional Bottom Navigation */}
      <View style={[styles.footer, { paddingBottom: Math.max(8, insets.bottom), height: SPACING.footerHeight + Math.max(0, insets.bottom) }]}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Home' && styles.activeTabButton]}
          onPress={() => setActiveTab('Home')}
        >
          <Ionicons
            name="home"
            size={24}
            color={activeTab === 'Home' ? COLORS.primary : COLORS.gray}
          />
          <Text style={[styles.tabLabel, activeTab === 'Home' && styles.activeTabLabel]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Orders' && styles.activeTabButton]}
          onPress={() => setActiveTab('Orders')}
        >
          <Ionicons
            name="receipt-outline"
            size={24}
            color={activeTab === 'Orders' ? COLORS.primary : COLORS.gray}
          />
          <Text style={[styles.tabLabel, activeTab === 'Orders' && styles.activeTabLabel]}>
            Orders
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Earnings' && styles.activeTabButton]}
          onPress={() => setActiveTab('Earnings')}
        >
          <Ionicons
            name="trending-up"
            size={24}
            color={activeTab === 'Earnings' ? COLORS.primary : COLORS.gray}
          />
          <Text style={[styles.tabLabel, activeTab === 'Earnings' && styles.activeTabLabel]}>
            Earnings
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Settings' && styles.activeTabButton]}
          onPress={() => setActiveTab('Settings')}
        >
          <Ionicons
            name="person-outline"
            size={24}
            color={activeTab === 'Settings' ? COLORS.primary : COLORS.gray}
          />
          <Text style={[styles.tabLabel, activeTab === 'Settings' && styles.activeTabLabel]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
  },
  content: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    paddingVertical: 8,
    paddingBottom: 0,
  },
  tabButton: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  activeTabButton: {
    // Active styling
  },
  tabLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 4,
  },
  activeTabLabel: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
