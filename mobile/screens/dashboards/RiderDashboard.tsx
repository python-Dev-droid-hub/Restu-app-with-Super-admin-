import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions, useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

import RiderHomeHeader from './components/RiderHomeHeader';
import RiderHomeContent from './components/RiderHomeContent';
import RiderEarningsTab from './components/RiderEarningsTab';
import RiderOrdersTab from './components/RiderOrdersTab';
import RiderSettingsTab from './components/RiderSettingsTab';
import RiderNotificationsTab from './components/RiderNotificationsTab';
import { api } from '../../components/api/client';
import { useSettings } from '../../context/SettingsContext';
import { extractDeliveryCoordinates } from '../../utils/riderCoordinateExtractor';
import {
  useRiderDashboardRealtime,
  RiderDashboardPayload,
} from '../../hooks/useRiderDashboardRealtime';
import { useLocationTracking } from '../../hooks/useLocationTracking';
import type { OrderProximity } from '../../hooks/useOrderProximity';

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
  footerHeight: 54,
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
    RIDER_ASSIGNED: 'assigned',

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

const buildAddressString = (parts: Array<any>): string => {
  const clean = parts
    .map((p) => String(p || '').trim())
    .filter((p) => !!p && p.toLowerCase() !== 'n/a' && p.toLowerCase() !== 'undefined');
  return clean.join(', ');
};

export default function RiderDashboard() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { formatPrice } = useSettings();
  const [activeTab, setActiveTab] = useState<TabType>('Home');
  const [loading, setLoading] = useState(true);

  const topInset = Math.max(0, insets.top);
  const bottomInset = Math.max(0, insets.bottom);
  const footerBottomPadding = bottomInset + 8;

  const [showChangeName, setShowChangeName] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  const normalizeMediaUrl = useCallback((uri: string | null | undefined): string | null => {
    if (!uri) return null;
    const value = String(uri).trim();
    // Already a full URL or data URI
    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) return value;
    // Relative path - prepend the host
    const base = api.getBaseURL();
    const host = base.endsWith('/api') ? base.slice(0, -4) : base;
    // Ensure value starts with /
    const path = value.startsWith('/') ? value : `/${value}`;
    return `${host}${path}`;
  }, []);

  // Data states
  const [riderData, setRiderData] = useState({
    name: 'Rider',
    avatar: null as string | null,
    onDuty: true,
    rating: 5.0,
    verification: 100,
  });
  const onDutyRef = useRef(riderData.onDuty);
  onDutyRef.current = riderData.onDuty;

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
          avatar: normalizeMediaUrl(userData?.avatar || userData?.image || null),
        }));

        setNameDraft(userData?.display_name || userData?.name || '');
      }
    } catch (error) {
      console.error('Error loading rider data:', error);
    }
  }, []);

  const updateStoredUserData = useCallback(async (patch: Record<string, any>) => {
    const stored = await AsyncStorage.getItem('userData');
    const parsed = stored ? JSON.parse(stored) : {};
    const next = { ...parsed, ...patch };
    await AsyncStorage.setItem('userData', JSON.stringify(next));
    return next;
  }, []);

  const getStoredUserId = useCallback(async () => {
    const stored = await AsyncStorage.getItem('userData');
    const parsed = stored ? JSON.parse(stored) : {};
    return parsed?.id || parsed?._id || parsed?.userId;
  }, []);

  const handleChangeName = useCallback(async () => {
    const nextName = String(nameDraft || '').trim();
    if (!nextName) {
      Alert.alert('Error', 'Please enter a valid name');
      return;
    }

    try {
      setProfileSaving(true);
      const response = await api.put('/users/profile', { name: nextName });
      if (!response.success) {
        Alert.alert('Error', response.message || 'Failed to update name');
        return;
      }

      await updateStoredUserData({
        name: nextName,
        display_name: nextName,
        displayName: nextName,
      });

      setRiderData((prev) => ({ ...prev, name: nextName }));
      setShowChangeName(false);
      Alert.alert('Success', 'Name updated successfully');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update name');
    } finally {
      setProfileSaving(false);
    }
  }, [nameDraft, updateStoredUserData]);

  const handlePickProfileImage = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Please allow access to your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const base64 = asset.base64;
      if (!base64) {
        Alert.alert('Error', 'Failed to read image data. Please try again.');
        return;
      }

      setProfileSaving(true);
      const dataUrl = `data:image/jpeg;base64,${base64}`;

      const uploadRes = await api.post('/upload', {
        image: dataUrl,
        filename: 'profile.jpg',
        mimeType: 'image/jpeg',
      });

      const uploadedUrl = uploadRes?.data?.url || uploadRes?.data?.fileUrl || uploadRes?.data?.path;
      if (!uploadRes?.success || !uploadedUrl) {
        Alert.alert('Error', uploadRes?.message || 'Failed to upload image');
        return;
      }

      const response = await api.put('/users/profile', {
        avatar: uploadedUrl,
        image: uploadedUrl,
      });
      if (!response.success) {
        Alert.alert('Error', response.message || 'Failed to update profile image');
        return;
      }

      await updateStoredUserData({
        image: uploadedUrl,
        avatar: uploadedUrl,
        profileImage: uploadedUrl,
      });

      setRiderData((prev) => ({ ...prev, avatar: normalizeMediaUrl(uploadedUrl) }));
      Alert.alert('Success', 'Profile image updated successfully');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update profile image');
    } finally {
      setProfileSaving(false);
    }
  }, [updateStoredUserData]);

  const handleChangePassword = useCallback(async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New password and confirm password do not match');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters');
      return;
    }

    try {
      setProfileSaving(true);
      const response = await api.put('/users/change-password', {
        currentPassword,
        newPassword,
      });

      if (!response.success) {
        Alert.alert('Error', response.message || 'Failed to change password');
        return;
      }

      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Password changed successfully');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to change password');
    } finally {
      setProfileSaving(false);
    }
  }, [currentPassword, newPassword, confirmPassword]);

  const homeOrders = orders.filter((o) => {
    const s = String(o?.status || '').toLowerCase();
    return s !== 'delivered' && s !== 'completed';
  });

  const formatRiderOrders = useCallback((deliveries: any[]) => {
    return (deliveries || []).map((order: any) => {
      const coords = extractDeliveryCoordinates(order);
      const pickupAddress = buildAddressString([
        order.branch?.addressLine,
        order.branch?.city,
        order.branch?.state,
        order.branch?.postalCode,
        order.branch?.country,
      ]);
      const deliveryAddress = buildAddressString([
        order.deliveryAddress?.street,
        order.deliveryAddress?.city,
        order.deliveryAddress?.state,
        order.deliveryAddress?.zipCode,
        order.deliveryAddress?.country,
      ]);
      return {
        _id: order._id,
        id: order._id,
        orderNumber: order.orderNumber || `ORD-${order._id?.toString().slice(-6).toUpperCase()}`,
        customerName: order.customerName || order.customer?.displayName || order.customer?.name || 'Unknown Customer',
        pickupLocation: order.branch?.branchName || order.branch?.name || 'Restaurant',
        pickupAddress: pickupAddress || order.branch?.addressLine || '',
        deliveryLocation: order.deliveryAddress?.street || order.deliveryAddress?.address || 'Delivery Address',
        deliveryAddress: deliveryAddress || order.deliveryAddress?.street || '',
        distance: order.distance || 0,
        estimatedTime: order.estimatedTime || 15,
        estimatedEarning: order.totalAmount || 0,
        status: normalizeRiderStatus(order.status),
        backendStatus: order.status,
        customerPhone: order.customer?.phoneNumber || order.customer?.phone || order.phoneNumber || 'N/A',
        pickupCoords: coords.pickup || undefined,
        deliveryCoords: coords.delivery || undefined,
        restaurantName: order.branch?.branchName || 'Unknown Restaurant',
        deliveryAddressText: order.deliveryAddress?.street || 'N/A',
        items: order.items?.map((item: any) => item.product?.name || 'Unknown Item') || [],
        totalAmount: order.totalAmount || 0,
        raw: order,
      };
    });
  }, []);

  const applyRiderDashboard = useCallback(
    (payload: RiderDashboardPayload) => {
      const statsData = payload.stats as Record<string, number> | undefined;
      if (statsData) {
        setStats((prev) => ({
          activeDeliveries: (statsData as any).assignedDeliveries ?? prev.activeDeliveries,
          todayEarnings: (statsData as any).todayEarnings ?? prev.todayEarnings,
          weekEarnings: (statsData as any).thisWeekEarnings ?? prev.weekEarnings,
          totalDeliveries: (statsData as any).completedDeliveries ?? prev.totalDeliveries,
        }));
      }

      if (payload.earnings) {
        setEarnings(payload.earnings);
        setStats((prev) => ({
          ...prev,
          todayEarnings: (payload.earnings as any).totalEarnings ?? prev.todayEarnings,
          weekEarnings: (payload.earnings as any).thisWeekEarnings ?? prev.weekEarnings,
        }));
      }

      if (Array.isArray(payload.orders)) {
        const formattedOrders = formatRiderOrders(payload.orders);
        setOrders(formattedOrders);
        const active = formattedOrders.find((o) => {
          const s = String(o?.backendStatus || o?.status || '').toUpperCase();
          return s === 'ASSIGNED' || s === 'PICKED_UP' || s === 'IN_DELIVERY';
        });
        setActiveOrder(active || null);
      }

      if (Array.isArray(payload.availableOrders) && payload.availableOrders.length > 0) {
        const first = payload.availableOrders[0];
        setNewOrderAlert((prev) => prev || first);
      }

      if (Array.isArray(payload.notifications)) {
        setNotifications(payload.notifications);
        const unread =
          typeof payload.unreadCount === 'number'
            ? payload.unreadCount
            : payload.notifications.filter((n: any) => !n.read && !n.isRead).length;
        setUnreadCount(unread);
      }

      if (typeof payload.onDuty === 'boolean') {
        setRiderData((prev) => ({ ...prev, onDuty: payload.onDuty as boolean }));
      }

      setLoading(false);
    },
    [formatRiderOrders]
  );

  const { refresh: refreshRiderDashboard } = useRiderDashboardRealtime({
    onData: applyRiderDashboard,
  });

  // Fetch dashboard stats (fallback for mutations)
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
      const response = await api.get('/orders/driver/my-orders');

      if (response.success && response.data) {
        const deliveries = response.data.orders || response.data.deliveries || [];

        const formattedOrders = (deliveries || []).map((order: any) => {
          const coords = extractDeliveryCoordinates(order);

          const pickupAddress = buildAddressString([
            order.branch?.addressLine,
            order.branch?.city,
            order.branch?.state,
            order.branch?.postalCode,
            order.branch?.country,
          ]);

          const deliveryAddress = buildAddressString([
            order.deliveryAddress?.street,
            order.deliveryAddress?.city,
            order.deliveryAddress?.state,
            order.deliveryAddress?.zipCode,
            order.deliveryAddress?.country,
          ]);

          return {
            _id: order._id,
            id: order._id,
            orderNumber: order.orderNumber || `ORD-${order._id?.toString().slice(-6).toUpperCase()}`,
            customerName: order.customerName || order.customer?.displayName || order.customer?.name || 'Unknown Customer',
            pickupLocation: order.branch?.branchName || order.branch?.name || 'Restaurant',
            pickupAddress: pickupAddress || order.branch?.addressLine || '',
            deliveryLocation: order.deliveryAddress?.street || order.deliveryAddress?.address || 'Delivery Address',
            deliveryAddress: deliveryAddress || order.deliveryAddress?.street || '',
            distance: order.distance || 0,
            estimatedTime: order.estimatedTime || 15,
            estimatedEarning: order.totalAmount || 0,
            status: normalizeRiderStatus(order.status),
            backendStatus: order.status,
            customerPhone: order.customer?.phoneNumber || order.customer?.phone || order.phoneNumber || 'N/A',
            pickupCoords: coords.pickup || undefined,
            deliveryCoords: coords.delivery || undefined,
            restaurantName: order.branch?.branchName || 'Unknown Restaurant',
            deliveryAddressText: order.deliveryAddress?.street || 'N/A',
            items: order.items?.map((item: any) => item.product?.name || 'Unknown Item') || [],
            totalAmount: order.totalAmount || 0,
            raw: order,
          };
        });

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

        // Sync top header cards with earnings payload
        setStats((prev) => ({
          ...prev,
          todayEarnings: response.data.totalEarnings || prev.todayEarnings,
          weekEarnings: response.data.thisWeekEarnings || prev.weekEarnings,
        }));
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

  // Fetch rider status (onDuty, location)
  const fetchRiderStatus = useCallback(async () => {
    try {
      const response = await api.get('/users/rider/status');
      if (response.success && response.data) {
        setRiderData(prev => ({
          ...prev,
          onDuty: response.data.onDuty || false,
        }));
      }
    } catch (error) {
      console.error('Error fetching rider status:', error);
    }
  }, []);

  const { refreshLocation, permission: locationPermission, error: locationError } =
    useLocationTracking(riderData.onDuty);
  const [proximityByOrder, setProximityByOrder] = useState<Record<string, OrderProximity>>({});

  const refreshProximity = useCallback(async (orderIds: string[]) => {
    const next: Record<string, OrderProximity> = {};
    await Promise.all(
      orderIds.map(async (id) => {
        try {
          const res = await api.get<OrderProximity>(`/orders/${id}/proximity`);
          if (res.success && res.data) next[id] = res.data as OrderProximity;
        } catch {
          /* ignore */
        }
      })
    );
    setProximityByOrder((prev) => ({ ...prev, ...next }));
  }, []);

  useEffect(() => {
    setLoading(true);
    void loadRiderData();
    refreshRiderDashboard();
  }, [loadRiderData, refreshRiderDashboard]);

  useEffect(() => {
    const ids = homeOrders.map((o) => o._id).filter(Boolean);
    if (!riderData.onDuty || ids.length === 0) return;
    void refreshProximity(ids);
    const t = setInterval(() => void refreshProximity(ids), 10_000);
    return () => clearInterval(t);
  }, [homeOrders, riderData.onDuty, refreshProximity]);

  // Accept order
  const handleAcceptOrder = async (orderId: string) => {
    // ... (rest of the code remains the same)
    try {
      const response = await api.put(`/orders/${orderId}/accept`);
      if (response.success) {
        setNewOrderAlert(null);
        setActiveOrder(response.data.order);
        refreshRiderDashboard();
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

  // Cancel auto-assigned order - Use PUT /reject endpoint for riders
  const handleCancelOrder = async (orderId: string, reason?: string) => {
    try {
      // Use the dedicated rider reject endpoint which has proper authorization
      const response = await api.put(`/orders/${orderId}/reject`, { 
        reason: reason || 'Rider cancelled assignment'
      });
      if (response.success) {
        setActiveOrder(null);
        refreshRiderDashboard();
        Alert.alert('Success', 'Order cancelled successfully. Manager will be notified to reassign.');
      } else {
        Alert.alert('Error', response.message || 'Failed to cancel order');
      }
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      Alert.alert('Error', error?.message || 'Failed to cancel order');
    }
  };

  const handlePickUp = async (orderId: string) => {
    try {
      const loc = await refreshLocation();
      if (!loc) {
        Alert.alert('GPS Required', locationError || 'Enable location to pick up orders.');
        return;
      }
      const response = await api.put(`/orders/${orderId}/status`, {
        status: 'PICKED_UP',
        latitude: loc.latitude,
        longitude: loc.longitude,
      });
      if (response.success) {
        refreshRiderDashboard();
        Alert.alert('Success', 'Order picked up!');
      } else {
        Alert.alert('Cannot pick up', response.message || 'You must be at the branch.');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to pick up order');
    }
  };

  const handleMarkDelivered = async (orderId: string) => {
    try {
      const loc = await refreshLocation();
      if (!loc) {
        Alert.alert('GPS Required', locationError || 'Enable location to complete delivery.');
        return;
      }
      const response = await api.put(`/orders/${orderId}/deliver`, {
        status: 'DELIVERED',
        latitude: loc.latitude,
        longitude: loc.longitude,
      });
      if (response.success) {
        setActiveOrder(null);
        refreshRiderDashboard();
        Alert.alert('Success', 'Order marked as delivered!');
      } else {
        Alert.alert('Cannot deliver', response.message || 'You must be near the customer.');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to mark as delivered');
    }
  };

  const handleStartRide = async (orderId: string) => {
    try {
      const response = await api.put(`/orders/${orderId}/deliver`, { status: 'OUT_FOR_DELIVERY' });
      if (response.success) {
        refreshRiderDashboard();
        Alert.alert('Success', 'Ride started! Order is now out for delivery.');
      }
    } catch (error) {
      console.error('Error starting ride:', error);
      Alert.alert('Error', 'Failed to start ride');
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    Alert.alert(
      'Reject Order',
      'Are you sure you want to reject this order? This will notify the manager and you will not be able to accept it again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.put(`/orders/${orderId}/reject`, { reason: 'Rider rejected the order' });
              if (response.success) {
                refreshRiderDashboard();
                Alert.alert('Success', 'Order rejected successfully. Manager will be notified to reassign.');
              } else {
                Alert.alert('Error', response.message || 'Failed to reject order');
              }
            } catch (error: any) {
              console.error('Error rejecting order:', error);
              Alert.alert('Error', error?.message || 'Failed to reject order');
            }
          },
        },
      ]
    );
  };

  const openInMaps = async (opts?: { coords?: { latitude: number; longitude: number }; address?: string }) => {
    const latitude = opts?.coords?.latitude;
    const longitude = opts?.coords?.longitude;
    const address = String(opts?.address || '').trim();

    if ((!latitude || !longitude) && !address) {
      Alert.alert('Error', 'Location not available for this order');
      return;
    }

    try {
      let destLat = latitude;
      let destLng = longitude;

      // If coords are missing but we have an address, geocode it for accurate directions.
      if ((!destLat || !destLng) && address) {
        try {
          // If address is too short/ambiguous, add context to avoid wrong geocoding (e.g., "Link Road" -> India)
          let geocodeAddress = address;
          if (address.length < 15 && !address.toLowerCase().includes('lahore') && !address.toLowerCase().includes('pakistan')) {
            geocodeAddress = `${address}, Lahore, Pakistan`;
            console.log('[openInMaps] Enhanced address for geocoding:', geocodeAddress);
          }
          const results = await Location.geocodeAsync(geocodeAddress);
          if (results && results.length > 0) {
            destLat = results[0].latitude;
            destLng = results[0].longitude;
          }
        } catch (geoErr) {
          console.log('[openInMaps] geocode failed:', geoErr);
        }
      }

      const encodedAddress = address ? encodeURIComponent(address) : '';
      // Prefer Google Maps because Apple Maps often fails for incomplete addresses.
      // iOS: try comgooglemaps://, fallback to https://www.google.com/maps/dir
      let url: string | undefined;
      if (Platform.OS === 'ios') {
        const googleUrl = destLat && destLng
          ? `comgooglemaps://?daddr=${destLat},${destLng}&directionsmode=driving`
          : `comgooglemaps://?daddr=${encodedAddress}&directionsmode=driving`;

        const googleWebUrl = destLat && destLng
          ? `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`
          : `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=driving`;

        const canOpenGoogle = await Linking.canOpenURL(googleUrl);
        url = canOpenGoogle
          ? googleUrl
          : googleWebUrl;
      } else {
        url = destLat && destLng
          ? `google.navigation:q=${destLat},${destLng}`
          : `google.navigation:q=${encodedAddress}`;
      }

      // Final fallback: Apple Maps scheme
      if (!url) {
        url = destLat && destLng
          ? `maps://app?saddr=Current%20Location&daddr=${destLat},${destLng}&dirflg=d`
          : `maps://app?saddr=Current%20Location&daddr=${encodedAddress}&dirflg=d`;
      }
      if (!url) {
        Alert.alert('Error', 'Unable to create navigation URL');
        return;
      }

      // For https URLs, canOpenURL may be true even if maps app not installed.
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening maps:', error);
      Alert.alert('Error', 'Failed to open navigation');
    }
  };

  const showOrderInfo = useCallback(
    async (orderId: string) => {
      const oid = String(orderId || '').trim();
      const order = orders.find((o) => {
        const id = String(o?._id || o?.id || '').trim();
        const num = String(o?.orderNumber || '').trim();
        return id === oid || num === oid;
      });

      const presentOrder = order
        ? order
        : (() => {
            return null;
          })();

      if (presentOrder) {
        Alert.alert(
          'Assigned Order',
          `Order: ${presentOrder.orderNumber}\nCustomer: ${presentOrder.customerName}\nPickup: ${presentOrder.pickupLocation}\nDelivery: ${presentOrder.deliveryLocation}`,
          [
            {
              text: 'Pickup Nav',
              onPress: () =>
                openInMaps({
                  coords: presentOrder?.pickupCoords,
                  address: presentOrder?.pickupAddress || presentOrder?.pickupLocation || presentOrder?.restaurantName,
                }),
            },
            {
              text: 'Delivery Nav',
              onPress: () =>
                openInMaps({
                  coords: presentOrder?.deliveryCoords,
                  address: presentOrder?.deliveryAddress || presentOrder?.deliveryLocation,
                }),
            },
            {
              text: 'Start Ride',
              onPress: () => handleStartRide(String(presentOrder?._id || presentOrder?.id || oid)),
            },
            {
              text: 'Cancel Order',
              style: 'destructive',
              onPress: () => {
                Alert.alert(
                  'Cancel Order',
                  'Are you sure you want to cancel this auto-assigned order? This will notify the manager to reassign.',
                  [
                    { text: 'No', style: 'cancel' },
                    {
                      text: 'Yes, Cancel',
                      style: 'destructive',
                      onPress: () => handleCancelOrder(String(presentOrder?._id || presentOrder?.id || oid)),
                    },
                  ]
                );
              },
            },
            {
              text: 'Close',
              style: 'cancel',
            },
          ]
        );
        return;
      }

      try {
        const res: any = await api.get(`/orders/${oid}`);
        const data = res?.data?.data ?? res?.data ?? res;
        const orderNumber = data?.orderNumber || `ORD-${String(data?._id || oid).slice(-6).toUpperCase()}`;
        const customerName = data?.customer?.displayName || data?.customer?.name || 'Unknown Customer';
        const pickupLocation = data?.branch?.branchName || data?.branch?.name || 'Restaurant';
        const pickupAddress = buildAddressString([
          data?.branch?.addressLine,
          data?.branch?.city,
          data?.branch?.state,
          data?.branch?.postalCode,
          data?.branch?.country,
        ]) || pickupLocation;
        const deliveryLocation = data?.deliveryAddress?.street || data?.deliveryAddress?.address || 'Delivery Address';
        const deliveryAddress = buildAddressString([
          data?.deliveryAddress?.street,
          data?.deliveryAddress?.city,
          data?.deliveryAddress?.state,
          data?.deliveryAddress?.zipCode,
          data?.deliveryAddress?.country,
        ]) || deliveryLocation;
        const pickupCoords = 
          // Try lat/lng fields first
          (typeof data?.branch?.lat === 'number' && typeof data?.branch?.lng === 'number')
            ? { latitude: data.branch.lat, longitude: data.branch.lng }
            // Try GeoJSON location.coordinates [lng, lat]
            : Array.isArray(data?.branch?.location?.coordinates) && data.branch.location.coordinates.length === 2
              ? { longitude: data.branch.location.coordinates[0], latitude: data.branch.location.coordinates[1] }
              // Try legacy location format
              : data?.branch?.location?.lat || data?.branch?.location?.latitude
                ? {
                    latitude: data.branch.location.latitude || data.branch.location.lat,
                    longitude: data.branch.location.longitude || data.branch.location.lng,
                  }
                : undefined;
        const deliveryCoords = data?.deliveryAddress?.location
          ? {
              latitude: data.deliveryAddress.location.latitude || data.deliveryAddress.location.lat,
              longitude: data.deliveryAddress.location.longitude || data.deliveryAddress.location.lng,
            }
          : Array.isArray(data?.deliveryAddress?.coordinates)
            ? {
                latitude: data.deliveryAddress.coordinates[1],
                longitude: data.deliveryAddress.coordinates[0],
              }
            : data?.deliveryAddress?.coordinates && typeof data?.deliveryAddress?.coordinates === 'object'
              ? {
                  latitude: data.deliveryAddress.coordinates.lat,
                  longitude: data.deliveryAddress.coordinates.lng,
                }
            : undefined;

        Alert.alert(
          'Assigned Order',
          `Order: ${orderNumber}\nCustomer: ${customerName}\nPickup: ${pickupLocation}\nDelivery: ${deliveryLocation}`,
          [
            {
              text: 'Pickup Nav',
              onPress: () => openInMaps({ coords: pickupCoords, address: pickupAddress }),
            },
            {
              text: 'Delivery Nav',
              onPress: () => openInMaps({ coords: deliveryCoords, address: deliveryAddress }),
            },
            {
              text: 'Start Ride',
              onPress: () => handleStartRide(String(data?._id || oid)),
            },
            {
              text: 'Close',
              style: 'cancel',
            },
          ]
        );
      } catch (e) {
        Alert.alert('Order', 'Order details not found. Please refresh.');
      }
    },
    [handleStartRide, openInMaps, orders]
  );

  // Toggle duty status
  const toggleDuty = async () => {
    try {
      const newDutyStatus = !riderData.onDuty;
      const response = await api.put('/users/rider/duty', { onDuty: newDutyStatus });
      
      if (response.success) {
        setRiderData(prev => ({ ...prev, onDuty: newDutyStatus }));
        
        if (newDutyStatus) {
          await refreshLocation();
          Alert.alert('On Duty', 'You are now on duty and will receive delivery assignments.');
        } else {
          Alert.alert('Off Duty', 'You are now off duty and will not receive new assignments.');
        }
      }
    } catch (error) {
      console.error('Error toggling duty status:', error);
      Alert.alert('Error', 'Failed to update duty status');
    }
  };

  // Logout
  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['authToken', 'userRole', 'userData', 'selectedBranchId']);
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      })
    );
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: topInset }]}>
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
        onPressInProgress={() => setActiveTab('Home')}
        onPressEarnings={() => setActiveTab('Earnings')}
        onNotificationPress={() => setActiveTab('Notifications')}
        onSettingsPress={() => setActiveTab('Settings')}
        notificationCount={unreadCount}
        formatPrice={formatPrice}
      />

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'Home' && (
          <RiderHomeContent
            deliveries={homeOrders}
            hasActiveDeliveries={homeOrders.length > 0 || !!activeOrder}
            isLoading={loading}
            onAcceptOrders={() => setActiveTab('Orders')}
            onAcceptDelivery={(deliveryId: string) => handleAcceptOrder(deliveryId)}
            onMarkDelivered={(deliveryId: string) => handleMarkDelivered(deliveryId)}
            onStartRide={(deliveryId: string) => handleStartRide(deliveryId)}
            onNavigateToPickup={(deliveryId: string) => {
              const order = homeOrders.find((o) => o?._id === deliveryId) || orders.find((o) => o?._id === deliveryId);
              openInMaps({
                coords: order?.pickupCoords,
                address: order?.pickupAddress || order?.pickupLocation || order?.restaurantName,
              });
            }}
            onNavigateToDelivery={(deliveryId: string) => {
              const order = homeOrders.find((o) => o?._id === deliveryId) || orders.find((o) => o?._id === deliveryId);
              openInMaps({
                coords: order?.deliveryCoords,
                address: order?.deliveryAddress || order?.deliveryLocation,
              });
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
            onRejectOrder={(deliveryId: string) => handleRejectOrder(deliveryId)}
            onPickUp={(deliveryId: string) => handlePickUp(deliveryId)}
            proximityByOrder={proximityByOrder}
            formatPrice={formatPrice}
          />
        )}

        {activeTab === 'Orders' && (
          <RiderOrdersTab
            orders={orders}
            onCallCustomer={async (phone: string) => {
              const p = String(phone || '').trim();
              if (!p) {
                Alert.alert('Call', 'Customer phone number is not available');
                return;
              }
              try {
                const url = `tel:${p}`;
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
            onStartRide={(orderId: string) => handleStartRide(orderId)}
            onRejectOrder={(orderId: string) => handleRejectOrder(orderId)}
            formatPrice={formatPrice}
          />
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
            onViewAnalytics={() => setActiveTab('Earnings')}
            onChangeName={() => setShowChangeName(true)}
            onChangePassword={() => setShowChangePassword(true)}
            onChangeProfileImage={handlePickProfileImage}
            onLogout={handleLogout}
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
      <View
        style={[
          styles.footer,
          {
            paddingBottom: footerBottomPadding,
            minHeight: SPACING.footerHeight + footerBottomPadding,
          },
        ]}
      >
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

      <Modal
        visible={showChangeName}
        transparent
        animationType="fade"
        onRequestClose={() => setShowChangeName(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Name</Text>
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder="Enter your name"
              style={styles.modalInput}
              autoCapitalize="words"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowChangeName(false)}
                disabled={profileSaving}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleChangeName}
                disabled={profileSaving}
              >
                {profileSaving ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.modalButtonPrimaryText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showChangePassword}
        transparent
        animationType="fade"
        onRequestClose={() => setShowChangePassword(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TextInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Current password"
              style={styles.modalInput}
              secureTextEntry
              autoCapitalize="none"
            />
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New password"
              style={styles.modalInput}
              secureTextEntry
              autoCapitalize="none"
            />
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              style={styles.modalInput}
              secureTextEntry
              autoCapitalize="none"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowChangePassword(false)}
                disabled={profileSaving}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleChangePassword}
                disabled={profileSaving}
              >
                {profileSaving ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.modalButtonPrimaryText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
    paddingTop: 0,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.darkText,
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.darkText,
    marginBottom: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  modalButton: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 90,
    alignItems: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: COLORS.lightBg,
  },
  modalButtonPrimary: {
    backgroundColor: COLORS.primary,
  },
  modalButtonSecondaryText: {
    color: COLORS.darkText,
    fontWeight: '600',
  },
  modalButtonPrimaryText: {
    color: COLORS.white,
    fontWeight: '700',
  },
});
