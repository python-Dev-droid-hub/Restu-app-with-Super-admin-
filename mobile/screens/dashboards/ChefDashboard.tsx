import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  StatusBar,
  Platform,
  Dimensions,
  Switch,
  Image,
  Animated,
  Modal,
  Vibration,
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';
import OrderCard from '../../components/ChefDashboard/OrderCard';
import { CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EditProfileScreen from '../profile/EditProfileScreen';
import NotificationsScreen from '../profile/NotificationsScreen';
import OperatingHoursScreen from '../profile/OperatingHoursScreen';
import CookingScheduleScreen from '../profile/CookingScheduleScreen';
import ChangePasswordScreen from '../profile/ChangePasswordScreen';
import KitchenSettingsScreen from '../profile/KitchenSettingsScreen';
import NotificationHistoryScreen from '../profile/NotificationHistoryScreen';
import LogoutConfirmScreen from '../profile/LogoutConfirmScreen';
import { getNotifications } from '../../services/notificationService';
import * as ImagePicker from 'expo-image-picker';

// Notification types with colors and icons
const NOTIFICATION_TYPES = {
  NEW_ORDER: { color: '#FF7A59', icon: 'bag', sound: 'beep', vibrate: [200, 100, 200] },
  NEW_COOKING_ORDER: { color: '#FF9F43', icon: 'flame', sound: 'beep', vibrate: [200, 100, 200] },
  KITCHEN_ALERT: { color: '#FF4D4D', icon: 'warning', sound: 'alarm', vibrate: [500, 200, 500, 200, 500] },
  ORDER_READY: { color: '#2BC48A', icon: 'checkmark-circle', sound: 'ding', vibrate: [300] },
  INVENTORY_ALERT: { color: '#FF9F43', icon: 'cube', sound: 'warning', vibrate: [400, 100] },
  SYSTEM_MESSAGE: { color: '#6C63FF', icon: 'information-circle', sound: 'chime', vibrate: [200] },
};

const { width, height } = Dimensions.get('window');

const DESIGN = {
  colors: {
    orange: '#FF7A59',
    green: '#2BC48A',
    blue: '#6C63FF',
    red: '#FF4D4D',
    darkText: '#1A1A2E',
    lightBg: '#F8F9FA',
    white: '#FFFFFF',
    muted: '#8E8E93',
    border: '#E5E5EA',
    cardBg: '#FFFFFF',
    urgent: '#FF4D4D',
    cooking: '#FF9F43',
    ready: '#2BC48A',
    fresh: '#4CD964',
  },
  radius: {
    card: 16,
    pill: 20,
  },
  spacing: {
    pagePad: 16,
    cardGap: 12,
  },
  footerHeight: 60,
} as const;

interface KitchenOrderItem {
  id: string;
  name: string;
  quantity: number;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'FRESH' | 'COMPLETED' | 'CANCELLED';
  preparationTime?: number;
}

interface KitchenOrder {
  _id: string;
  id?: string;
  orderNumber: string;
  tableNumber: string;
  orderType: 'DINE_IN' | 'DELIVERY' | 'TAKEAWAY';
  items: KitchenOrderItem[];
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  orderTime: string;
  estimatedReadyTime: string;
  specialInstructions?: string;
  createdAt: string;
  status: 'PENDING' | 'PREPARING' | 'KITCHEN_ACCEPTED' | 'READY' | 'COMPLETED' | 'CANCELLED';
  elapsedTime?: number;
  expectedTime?: number;
  isLate?: boolean;
  lateBy?: number;
}

interface ChefStats {
  newOrders: number;
  activeOrders: number;
  cookingOrders: number;
  avgCookingTime: number;
  delayedOrders: number;
  over30Min: number;
}

interface MostOrderedItem {
  rank: number;
  name: string;
  time: string;
}

type OrderTab = 'ACTIVE' | 'READY' | 'COMPLETED' | 'CANCELLED';
type CookingOrderTypeTab = 'DINE_IN' | 'DELIVERY';
type CookingFilterTab = 'ACTIVE' | 'READY' | 'COMPLETED';
type BottomTab = 'home' | 'cooking' | 'notifications' | 'profile';
type ProfileSubScreen = 'main' | 'edit' | 'editName' | 'changeImage' | 'notifications' | 'hours' | 'schedule' | 'password' | 'kitchen' | 'logout' | 'notificationHistory';

export default function ChefDashboard() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<ChefStats>({
    newOrders: 0,
    activeOrders: 0,
    cookingOrders: 0,
    avgCookingTime: 0,
    delayedOrders: 0,
    over30Min: 0,
  });
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cookingOrderTypeTab, setCookingOrderTypeTab] = useState<CookingOrderTypeTab>('DINE_IN');
  const [cookingFilterTab, setCookingFilterTab] = useState<CookingFilterTab>('ACTIVE');
  const [bottomTab, setBottomTab] = useState<BottomTab>('home');
  const [isOnline, setIsOnline] = useState(true);
  const [notificationList, setNotificationList] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'read' | 'unread'>('all');
  const [notificationsDisabled, setNotificationsDisabled] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [toasts, setToasts] = useState<any[]>([]);
  const [selectedOrderFromNotification, setSelectedOrderFromNotification] = useState<any>(null);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [customRejectionReason, setCustomRejectionReason] = useState('');
  const bellShakeAnim = useRef(new Animated.Value(0)).current;
  const [userData, setUserData] = useState<any>({ name: 'Chef Michael', role: 'Head Chef', avatar: null });

  // Update order status function - MOVED TO COMPONENT LEVEL
  const updateOrderStatus = async (orderId: string, status: string) => {
    console.log('[updateOrderStatus] Starting:', { orderId, status, userRole: userData?.role, userId: userData?.id });
    
    if (!orderId) {
      console.error('[updateOrderStatus] ERROR: orderId is empty!');
      throw new Error('Order ID is required');
    }
    
    try {
      // Use PATCH endpoint which is authorized for CHEF role
      const response = await api.patch(`/orders/${orderId}/status`, { status });
      console.log('[updateOrderStatus] Response:', response);
      
      if (!response.success) {
        console.error('[updateOrderStatus] API Error:', response.message, 'StatusCode:', (response as any).statusCode);
        if (checkAuthError(response)) {
          console.log('[updateOrderStatus] Auth error detected, redirecting to login');
          return;
        }
        throw new Error(response.message || 'Failed to update order status');
      }
      
      console.log('[updateOrderStatus] Success!');
    } catch (error: any) {
      console.error('[updateOrderStatus] Exception:', error?.message || error);
      throw error;
    }
  };

  // Update individual item status (for chef to mark items as PREPARING, READY, SERVED)
  const updateItemStatus = async (orderId: string, itemId: string, status: 'PREPARING' | 'READY' | 'SERVED') => {
    console.log('[updateItemStatus] Starting:', { orderId, itemId, status });
    
    if (!orderId || !itemId) {
      console.error('[updateItemStatus] ERROR: orderId or itemId is empty!');
      throw new Error('Order ID and Item ID are required');
    }
    
    try {
      const response = await api.patch(`/orders/${orderId}/items/${itemId}/status`, { status });
      console.log('[updateItemStatus] Response:', response);
      
      if (!response.success) {
        console.error('[updateItemStatus] API Error:', response.message);
        if (checkAuthError(response)) {
          return;
        }
        throw new Error(response.message || 'Failed to update item status');
      }
      
      console.log('[updateItemStatus] Success!');
      // Reload data to reflect changes
      await loadDashboardData();
    } catch (error: any) {
      console.error('[updateItemStatus] Exception:', error?.message || error);
      throw error;
    }
  };

  // Notification polling effect - DISABLED to prevent 404 errors
  useEffect(() => {
    let isMounted = true;

    const toDashboardNotification = (n: any) => {
      const createdAt = n?.createdAt ? new Date(n.createdAt) : null;
      return {
        id: n?._id || n?.id,
        title: n?.title || 'Notification',
        body: n?.body || n?.message || '',
        type: n?.type || 'SYSTEM_MESSAGE',
        is_read: !!n?.isRead,
        created_at: createdAt ? createdAt.toLocaleString() : 'Just now',
        raw: n,
      };
    };

    const load = async () => {
      try {
        setNotificationsDisabled(false);
        const res = await getNotifications(20, 0);
        console.log('[ChefDashboard] Notifications response:', JSON.stringify(res, null, 2));
        if (!isMounted) return;
        if (res.success) {
          const mapped = (res.notifications || []).map(toDashboardNotification);
          console.log('[ChefDashboard] Mapped notifications:', mapped.length);
          setNotificationList(mapped);
          setUnreadCount(res.unread || 0);
        } else {
          console.log('[ChefDashboard] Notifications failed:', res);
          setNotificationList([]);
          setUnreadCount(0);
        }
      } catch (e) {
        console.error('[ChefDashboard] Notification load error:', e);
        if (!isMounted) return;
        setNotificationList([]);
        setUnreadCount(0);
      }
    };

    load();
    const interval = setInterval(load, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const savedUserData = await AsyncStorage.getItem('userData');
        if (savedUserData) {
          setUserData(JSON.parse(savedUserData));
        }
      } catch (error) {
        console.log('Error loading user data:', error);
      }
    };
    loadUserData();
  }, []);

  // Custom setUserData that persists to AsyncStorage
  const updateUserData = async (newData: any) => {
    setUserData(newData);
    try {
      await AsyncStorage.setItem('userData', JSON.stringify(newData));
    } catch (error) {
      console.log('Error saving user data:', error);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(() => {
      loadDashboardData();
    }, 5000);
    return () => clearInterval(interval);
  }, [userData?.assignedBranch?._id, userData?.branchId]);

  const [homeActiveTab, setHomeActiveTab] = useState('Active');
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<KitchenOrder | null>(null);
  const [mostOrdered, setMostOrdered] = useState<MostOrderedItem[]>([]);
  const [onShift, setOnShift] = useState(true);
  const [packingChecklist, setPackingChecklist] = useState({
    itemsPacked: false,
    allItemsIncluded: false,
    specialInstructions: false,
    receiptIncluded: false,
    napkinsUtensils: false,
    packagingSealed: false,
  });
  const [qualityChecks, setQualityChecks] = useState({
    orderPackaging: false,
    orderLabeling: false,
    temperature: false,
    napkinsUtensils: false,
    packagingSealed: false,
  });
  const [profileSubScreen, setProfileSubScreen] = useState<ProfileSubScreen>('main');
  const [editName, setEditName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [cookingOrders, setCookingOrders] = useState<KitchenOrder[]>([]);
  const [selectedCookingOrder, setSelectedCookingOrder] = useState<KitchenOrder | null>(null);
  const [showCookingModal, setShowCookingModal] = useState(false);

  useEffect(() => {
    // First load user data, then load dashboard data
    const init = async () => {
      await loadUserData();
    };
    init();
  }, []);

  // Load dashboard data AFTER userData is loaded
  useEffect(() => {
    if (userData && (userData.assignedBranch || userData.branchId)) {
      console.log('[ChefDashboard] userData loaded, loading dashboard...');
      loadDashboardData();
    }
  }, [userData]);

  const loadUserData = async () => {
    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
        const parsed = JSON.parse(userDataStr);
        console.log('[loadUserData] User loaded:', { role: parsed?.role, id: parsed?.id || parsed?._id, email: parsed?.email });
        setUserData(parsed);
      } else {
        console.log('[loadUserData] No user data found in AsyncStorage');
      }
    } catch (e) {
      console.error('Error loading user data:', e);
    }
  };

  // Helper to show toast
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // Helper to check auth errors and redirect to login if token expired
  const checkAuthError = (response: any) => {
    if (response.message?.toLowerCase().includes('token') || 
        response.message?.toLowerCase().includes('unauthorized') ||
        response.message?.toLowerCase().includes('session')) {
      // Clear storage and redirect to login
      AsyncStorage.removeItem('authToken');
      AsyncStorage.removeItem('userRole');
      AsyncStorage.removeItem('userData');
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Login' as any }],
        })
      );
      return true;
    }
    return false;
  };

  // Helper to shake bell animation
  const shakeBell = () => {
    bellShakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(bellShakeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(bellShakeAnim, { toValue: -1, duration: 100, useNativeDriver: true }),
      Animated.timing(bellShakeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(bellShakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  // Pick profile image (like waiter dashboard)
  const pickProfileImage = async () => {
    try {
      const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photos.');
        return;
      }
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!pickerResult.canceled && pickerResult.assets[0]) {
        const asset = pickerResult.assets[0];
        const uri = asset.uri;
        setUploadingImage(true);

        // Convert to base64 and upload
        if (asset.base64) {
          const base64Data = `data:image/jpeg;base64,${asset.base64}`;
          // Step 1: upload base64 to server to get a short /uploads/... url
          const uploadRes = await api.post('/upload', {
            image: base64Data,
            filename: `profile-${Date.now()}.jpg`,
            mimeType: 'image/jpeg',
          });

          const uploadedPath = (uploadRes as any)?.data?.url;
          if (!uploadRes.success || !uploadedPath) {
            Alert.alert('Error', uploadRes.message || 'Failed to upload image');
            setUploadingImage(false);
            return;
          }

          // Step 2: save profile image url on user profile
          const response = await api.patch('/users/profile/image', {
            profileImage: uploadedPath,
          });

          if (response.success && (response.data?.imageUrl || response.data?.profileImage)) {
            const imageUrl = response.data?.imageUrl || response.data?.profileImage;

            // Build a full URL for display
            const base = api.getBaseURL().replace(/\/?api\/?$/, '');
            const fullImageUrl = String(imageUrl || '').startsWith('http') ? imageUrl : `${base}${imageUrl}`;
            // Update local storage
            const userDataRaw = await AsyncStorage.getItem('userData');
            if (userDataRaw) {
              const parsed = JSON.parse(userDataRaw);
              const updated = { ...parsed, avatar: fullImageUrl, profileImage: fullImageUrl };
              await AsyncStorage.setItem('userData', JSON.stringify(updated));
              setUserData(updated);
            }
            Alert.alert('Success', 'Profile image updated');
          } else {
            Alert.alert('Error', response.message || 'Failed to upload image');
          }
        }
        setUploadingImage(false);
      }
    } catch (error) {
      console.error('Error picking profile image:', error);
      setUploadingImage(false);
      Alert.alert('Error', 'Failed to update profile image');
    }
  };

  // Save profile name
  const saveProfileName = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }
    setSavingName(true);
    try {
      const response = await api.put('/users/profile', { name: editName.trim() });
      if (response.success) {
        const userDataRaw = await AsyncStorage.getItem('userData');
        if (userDataRaw) {
          const parsed = JSON.parse(userDataRaw);
          const updated = { ...parsed, name: editName.trim(), displayName: editName.trim() };
          await AsyncStorage.setItem('userData', JSON.stringify(updated));
          setUserData(updated);
        }
        Alert.alert('Success', 'Name updated successfully');
        setProfileSubScreen('main');
      } else {
        Alert.alert('Error', response.message || 'Failed to update name');
      }
    } catch (error) {
      console.error('Error saving name:', error);
      Alert.alert('Error', 'Failed to update name');
    }
    setSavingName(false);
  };

  // Handle notification tap
  const markNotificationAsRead = async (notification: any) => {
    // Mark as read locally
    setNotificationList(prev => prev.map(n => 
      n.id === notification.id ? { ...n, is_read: true } : n
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
    setShowNotificationPanel(false);

    // Mark as read on server
    try {
      await api.put(`/notifications/${notification.id}/read`);
    } catch (error) {
      console.log('Error marking notification as read:', error);
    }

    // Show order details if related_order_id exists
    if (notification.related_order_id) {
      const order = orders.find(o => o.id === notification.related_order_id);
      if (order) {
        setSelectedOrderFromNotification(order);
        setShowOrderDetailsModal(true);
      } else {
        showToast('Order not found', 'error');
      }
    } else {
      showToast(notification.body, 'info');
    }

    // Trigger vibration for notification
    if (notification.type && NOTIFICATION_TYPES[notification.type as keyof typeof NOTIFICATION_TYPES]) {
      const pattern = NOTIFICATION_TYPES[notification.type as keyof typeof NOTIFICATION_TYPES].vibrate;
      Vibration.vibrate(pattern);
    }
  };

  // Open order details from order list
  const openOrderDetails = (order: any) => {
    setSelectedOrderFromNotification(order);
    setShowOrderDetailsModal(true);
  };

  // Accept order - use lowercase status for backend compatibility
  const handleAcceptOrder = async (order: any) => {
    try {
      const response = await api.patch(`/orders/${order.id}/status`, { status: 'preparing' });
      if (!response.success && checkAuthError(response)) return;
      
      const updatedOrders = orders.map(o => 
        o.id === order.id ? { ...o, status: 'PREPARING' as const } : o
      );
      setOrders(updatedOrders);
      
      showToast('Order accepted successfully', 'success');
      setShowOrderDetailsModal(false);
    } catch (error) {
      showToast('Failed to accept order', 'error');
    }
  };

  // Reject order - use lowercase status for backend compatibility
  const handleRejectOrder = async (reason: string) => {
    try {
      if (selectedOrderFromNotification) {
        const response = await api.patch(`/orders/${selectedOrderFromNotification.id}/status`, { 
          status: 'cancelled', 
          reason 
        });
        if (!response.success && checkAuthError(response)) return;
        
        const updatedOrders = orders.map(o => 
          o.id === selectedOrderFromNotification.id ? { ...o, status: 'CANCELLED' as const, rejectionReason: reason } : o
        );
        setOrders(updatedOrders);
      }
      
      showToast(`Order rejected: ${reason}`, 'warning');
      setShowRejectionModal(false);
      setShowOrderDetailsModal(false);
      setRejectionReason('');
      setCustomRejectionReason('');
    } catch (error) {
      showToast('Failed to reject order', 'error');
    }
  };

  // Mark order as complete - use lowercase status for backend compatibility
  const handleMarkComplete = async (order: any) => {
    try {
      const response = await api.patch(`/orders/${order.id}/status`, { status: 'delivered' });
      if (!response.success && checkAuthError(response)) return;
      
      // Update both orders and cookingOrders states
      const updateOne = (o: any) => (o.id === order.id ? { ...o, status: 'COMPLETED' as const } : o);
      setOrders(prev => prev.map(updateOne));
      setCookingOrders(prev => prev.map(updateOne));
      
      showToast('Order marked as complete', 'success');
      setShowOrderDetailsModal(false);
      
      // Reload data to ensure consistency
      await loadDashboardData();
    } catch (error) {
      showToast('Failed to complete order', 'error');
    }
  };

  const handleMarkReady = async (order: any) => {
    try {
      const response = await api.patch(`/orders/${order.id}/status`, { status: 'ready' });
      if (!response.success && checkAuthError(response)) return;

      const updateOne = (o: any) => (o.id === order.id ? { ...o, status: 'READY' as const } : o);
      setOrders(prev => prev.map(updateOne));
      setCookingOrders(prev => prev.map(updateOne));

      showToast('Order marked as READY', 'success');
      setShowOrderDetailsModal(false);
    } catch (error) {
      showToast('Failed to mark order as READY', 'error');
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Get chef's branch ID from user data
      const branchId =
        userData?.assignedBranch?._id ||
        userData?.assignedBranch?.id ||
        userData?.assignedBranch ||
        userData?.branchId ||
        '';
      
      console.log('===== CHEF DASHBOARD LOAD START =====');
      console.log('Branch ID:', branchId);
      console.log('User assignedBranch:', JSON.stringify(userData?.assignedBranch));
      
      if (!branchId) {
        console.warn('⚠️ NO BRANCH ID - orders will not load correctly!');
      }
      
      // Fetch all dashboard data in parallel
      const [statsResponse, ordersResponse, cookingResponse, mostOrderedResponse] = await Promise.all([
        api.get('/dashboard/chef/stats'),
        api.get(`/orders/branch/all?branchId=${encodeURIComponent(branchId || '')}`),
        api.get(`/dashboard/kitchen/orders/cooking?branch=${branchId}`),
        api.get('/dashboard/kitchen/most-ordered'),
      ]);
      
      console.log('--- API Responses ---');
      console.log('stats success:', statsResponse.success);
      console.log('orders success:', ordersResponse.success, 'count:', ordersResponse.data?.orders?.length || 0);
      console.log('cooking success:', cookingResponse.success, 'count:', cookingResponse.data?.orders?.length || 0);
      
      // Check for auth errors in any response
      if (!statsResponse.success && checkAuthError(statsResponse)) return;
      if (!ordersResponse.success && checkAuthError(ordersResponse)) return;
      if (!cookingResponse.success && checkAuthError(cookingResponse)) return;
      if (!mostOrderedResponse.success && checkAuthError(mostOrderedResponse)) return;
      
      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }
      
      let loadedOrders = [];
      if (ordersResponse.success && ordersResponse.data) {
        loadedOrders = ordersResponse.data.orders || [];
        console.log('Loaded orders:', loadedOrders.length);
        if (loadedOrders.length > 0) {
          console.log('First order status:', loadedOrders[0]?.status);
          console.log('First order id:', loadedOrders[0]?.id);
        }
        setOrders(loadedOrders);
      }
      
      let loadedCookingOrders = [];
      if (cookingResponse.success && cookingResponse.data) {
        loadedCookingOrders = cookingResponse.data.orders || [];
        console.log('Loaded cooking orders:', loadedCookingOrders.length);
        if (loadedCookingOrders.length > 0) {
          console.log('First cooking order:', JSON.stringify(loadedCookingOrders[0], null, 2));
        }
        setCookingOrders(loadedCookingOrders);
      }
      
      if (mostOrderedResponse.success && mostOrderedResponse.data) {
        setMostOrdered(mostOrderedResponse.data.items || []);
      }
      
      console.log('===== CHEF DASHBOARD LOAD END =====');
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('authToken');
            await AsyncStorage.removeItem('userRole');
            await AsyncStorage.removeItem('userData');
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Login' as any }],
              })
            );
          },
        },
      ]
    );
  };

  const formatSinceMinutes = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
  };

  const getItemStatusPill = (status: string) => {
    if (status === 'FRESH') return { label: 'Fresh', bg: '#4CD964', fg: '#FFFFFF' };
    if (status === 'READY') return { label: 'Ready', bg: '#2BC48A', fg: '#FFFFFF' };
    if (status === 'PREPARING') return { label: 'Cooking', bg: '#FF9F43', fg: '#FFFFFF' };
    return { label: status, bg: '#8E8E93', fg: '#FFFFFF' };
  };

  const StatCard = ({ color, value, label, sublabel }: { color: string; value: number; label: string; sublabel?: string }) => (
    <TouchableOpacity activeOpacity={0.9} style={[styles.statCard, { backgroundColor: color }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sublabel && <Text style={styles.statSublabel}>{sublabel}</Text>}
    </TouchableOpacity>
  );

  const renderHome = () => {
    // Prefer kitchen queue orders (branch-filtered) for home screen
    const homeOrders = (cookingOrders && cookingOrders.length > 0) ? cookingOrders : orders;

    console.log('--- RENDER HOME ---');
    console.log('cookingOrders length:', cookingOrders?.length || 0);
    console.log('orders length:', orders?.length || 0);
    console.log('homeOrders length:', homeOrders?.length || 0);
    console.log('homeActiveTab:', homeActiveTab);

    const initials = 'TT';

    // Calculate real-time stats from orders data
    const newOrdersCount = homeOrders.filter(o => o.status === 'PENDING').length;
    const activeOrdersCount = homeOrders.filter(o => ['PENDING', 'PREPARING', 'KITCHEN_ACCEPTED'].includes(o.status)).length;
    const cookingOrdersCount = homeOrders.filter(o => o.status === 'KITCHEN_ACCEPTED' || o.status === 'PREPARING').length;
    const delayedOrdersCount = homeOrders.filter(o => {
      const created = new Date(o.createdAt || o.orderTime).getTime();
      const diffMinutes = (Date.now() - created) / 60000;
      return diffMinutes > 20 && ['PENDING', 'PREPARING', 'KITCHEN_ACCEPTED'].includes(o.status);
    }).length;
    const over30MinCount = homeOrders.filter(o => {
      const created = new Date(o.createdAt || o.orderTime).getTime();
      const diffMinutes = (Date.now() - created) / 60000;
      return diffMinutes > 30 && ['PENDING', 'PREPARING', 'KITCHEN_ACCEPTED'].includes(o.status);
    }).length;

    // Filter orders based on selected tab
    const filteredOrders = homeOrders.filter(order => {
      const s = String((order as any)?.status || '').toUpperCase();
      if (homeActiveTab === 'Active') return ['PENDING', 'PREPARING', 'KITCHEN_ACCEPTED'].includes(s);
      if (homeActiveTab === 'Ready') return s === 'READY';
      if (homeActiveTab === 'Completed') return ['COMPLETED', 'DELIVERED', 'SERVED'].includes(s);
      if (homeActiveTab === 'Cancelled') return s === 'CANCELLED';
      return true;
    });

    console.log('filteredOrders length:', filteredOrders?.length || 0);
    if (homeOrders.length > 0 && filteredOrders.length === 0) {
      console.log('Order statuses in homeOrders:', homeOrders.map(o => o.status));
    }

    return (
      <View style={{ flex: 1 }}>
        {/* Header with Profile */}
        <View style={homeStyles.header}>
          <TouchableOpacity 
            style={homeStyles.profileSection}
            onPress={() => setBottomTab('profile')}
            activeOpacity={0.8}
          >
            <View style={homeStyles.avatar}>
              {userData?.avatar ? (
                <Image source={{ uri: userData.avatar }} style={homeStyles.avatarImage} />
              ) : (
                <Ionicons name="person" size={24} color="#fff" />
              )}
            </View>
            <View style={homeStyles.profileInfo}>
              <Text style={homeStyles.chefName}>{userData?.name || userData?.displayName || 'Chef'}</Text>
              <View style={homeStyles.onlineRow}>
                <View style={homeStyles.onlineDot} />
                <Text style={homeStyles.onlineText}>Online</Text>
              </View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={homeStyles.iconBtn} 
            onPress={() => setShowNotificationPanel(true)}
          >
            <Animated.View style={{ transform: [{ rotate: bellShakeAnim.interpolate({
              inputRange: [-1, 1],
              outputRange: ['-15deg', '15deg']
            }) }] }}>
              <Ionicons name="notifications-outline" size={28} color={DESIGN.colors.darkText} />
            </Animated.View>
            {unreadCount > 0 && (
              <View style={[homeStyles.badge, { backgroundColor: '#FF4D4D' }]}>
                <Text style={homeStyles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={homeStyles.content}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats Cards - Functional with real-time calculations */}
          <View style={homeStyles.statsRow}>
            <TouchableOpacity 
              style={[homeStyles.statCard, { backgroundColor: '#FF7A59' }]}
              onPress={() => setHomeActiveTab('Active')}
              activeOpacity={0.9}
            >
              <Text style={homeStyles.statValue}>{newOrdersCount}</Text>
              <Text style={homeStyles.statLabel}>New Orders</Text>
              <Text style={homeStyles.statSublabel}>{activeOrdersCount} active</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[homeStyles.statCard, { backgroundColor: '#2BC48A' }]}
              onPress={() => setHomeActiveTab('Active')}
              activeOpacity={0.9}
            >
              <Text style={homeStyles.statValue}>{cookingOrdersCount}</Text>
              <Text style={homeStyles.statLabel}>Orders Cooking</Text>
              <Text style={homeStyles.statSublabel}>~15m avg time</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[homeStyles.statCard, { backgroundColor: '#8B5CF6' }]}
              onPress={() => setHomeActiveTab('Active')}
              activeOpacity={0.9}
            >
              <Text style={homeStyles.statValue}>{delayedOrdersCount}</Text>
              <Text style={homeStyles.statLabel}>Orders Delayed</Text>
              <Text style={homeStyles.statSublabel}>{over30MinCount} Over 30m</Text>
            </TouchableOpacity>
          </View>

          {/* Orders Queue */}
          <View style={homeStyles.section}>
            <Text style={homeStyles.sectionTitle}>Orders Queue</Text>
            
            <View style={homeStyles.tabRow}>
              {['Active', 'Ready', 'Completed', 'Cancelled'].map((tab) => (
                <TouchableOpacity key={tab} onPress={() => setHomeActiveTab(tab)}>
                  <Text style={[homeStyles.tabText, homeActiveTab === tab && homeStyles.tabTextActive]}>
                    {tab}
                  </Text>
                  {homeActiveTab === tab && <View key={`${tab}-indicator`} style={homeStyles.tabIndicator} />}
                </TouchableOpacity>
              ))}
            </View>

            {/* Orders */}
            {filteredOrders.length === 0 ? (
              <View style={homeStyles.emptyState} key="empty-state">
                <Ionicons name="restaurant-outline" size={48} color="#ccc" />
                <Text style={homeStyles.emptyTitle}>No {homeActiveTab?.toLowerCase()} orders</Text>
                <Text style={homeStyles.emptySub}>Try another tab</Text>
              </View>
            ) : (
              filteredOrders.map((o, index) => (
                <View key={o.id || `order-${index}`}>
                  <OrderCard
                    order={{
                      id: o._id || o.id,
                      orderNumber: o.orderNumber,
                      status: o.status as any,
                      orderType: o.orderType,
                      tableNumber: o.tableNumber,
                      items: o.items as any,
                      createdAt: o.createdAt || o.orderTime,
                      expectedReadyTime: (o as any).expectedReadyTime,
                      specialInstructions: o.specialInstructions,
                    }}
                    onStatusChange={async (orderId, status) => {
                      try {
                        await updateOrderStatus(orderId, status);
                        showToast(`Order updated: ${status}`, 'success');
                        await loadDashboardData();
                      } catch (e) {
                        showToast('Failed to update order', 'error');
                      }
                    }}
                    onItemStatusChange={updateItemStatus}
                    role="CHEF"
                  />
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderCooking = () => {
    // Use real cookingOrders from state instead of hardcoded data
    const dineInOrders = cookingOrders.filter(o => o.orderType === 'DINE_IN');
    const deliveryOrders = cookingOrders.filter(o => o.orderType === 'DELIVERY');
    
    const currentOrders = cookingOrderTypeTab === 'DINE_IN' ? dineInOrders : deliveryOrders;
    
    const filteredOrders = currentOrders.filter(o => {
      if (cookingFilterTab === 'ACTIVE') return o.status === 'PENDING' || o.status === 'PREPARING' || o.status === 'KITCHEN_ACCEPTED';
      if (cookingFilterTab === 'READY') return o.status === 'READY';
      if (cookingFilterTab === 'COMPLETED') return o.status === 'COMPLETED';
      return true;
    });

    const dineInCount = dineInOrders.filter(o => ['PENDING', 'PREPARING', 'KITCHEN_ACCEPTED', 'READY'].includes(o.status)).length;
    const deliveryCount = deliveryOrders.filter(o => ['PENDING', 'PREPARING', 'KITCHEN_ACCEPTED', 'READY'].includes(o.status)).length;

    const handleReadyClick = (order: KitchenOrder) => {
      if (order.orderType === 'DELIVERY') {
        setSelectedOrder(order);
        setShowChecklistModal(true);
        setPackingChecklist({
          itemsPacked: false,
          allItemsIncluded: false,
          specialInstructions: false,
          receiptIncluded: false,
          napkinsUtensils: false,
          packagingSealed: false,
        });
      } else {
        Alert.alert('Ready to Serve', `Order ${order.orderNumber} is ready for waiter pickup!`);
      }
    };

    const allChecked = Object.values(packingChecklist).every(v => v);

    return (
      <View style={styles.tabContent}>
        {/* Order Type Tabs - DINE-IN / DELIVERY */}
        <View style={cookingStyles.typeTabRow}>
          <TouchableOpacity
            style={[cookingStyles.typeTab, cookingOrderTypeTab === 'DINE_IN' && cookingStyles.typeTabActive]}
            onPress={() => setCookingOrderTypeTab('DINE_IN')}
          >
            <View style={cookingStyles.typeTabContent}>
              <Ionicons name="restaurant" size={18} color={cookingOrderTypeTab === 'DINE_IN' ? '#fff' : '#3498DB'} />
              <Text style={[cookingStyles.typeTabText, cookingOrderTypeTab === 'DINE_IN' && cookingStyles.typeTabTextActive]}>
                DINE-IN
              </Text>
              <View style={[cookingStyles.typeTabBadge, { backgroundColor: '#3498DB' }]}>
                <Text style={cookingStyles.typeTabBadgeText}>{dineInCount}</Text>
              </View>
            </View>
            {cookingOrderTypeTab === 'DINE_IN' && <View style={[cookingStyles.typeTabIndicator, { backgroundColor: '#3498DB' }]} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[cookingStyles.typeTab, cookingOrderTypeTab === 'DELIVERY' && cookingStyles.typeTabActiveOrange]}
            onPress={() => setCookingOrderTypeTab('DELIVERY')}
          >
            <View style={cookingStyles.typeTabContent}>
              <Ionicons name="cube" size={18} color={cookingOrderTypeTab === 'DELIVERY' ? '#fff' : '#FF6B35'} />
              <Text style={[cookingStyles.typeTabText, cookingOrderTypeTab === 'DELIVERY' && cookingStyles.typeTabTextActive]}>
                DELIVERY
              </Text>
              <View style={[cookingStyles.typeTabBadge, { backgroundColor: '#FF6B35' }]}>
                <Text style={cookingStyles.typeTabBadgeText}>{deliveryCount}</Text>
              </View>
            </View>
            {cookingOrderTypeTab === 'DELIVERY' && <View style={[cookingStyles.typeTabIndicator, { backgroundColor: '#FF6B35' }]} />}
          </TouchableOpacity>
        </View>

        {/* Filter Tabs - Active | Ready | Completed */}
        <View style={cookingStyles.filterTabRow}>
          {['ACTIVE', 'READY', 'COMPLETED'].map((tab) => (
            <TouchableOpacity 
              key={tab} 
              style={cookingStyles.filterTab}
              onPress={() => setCookingFilterTab(tab as CookingFilterTab)}
            >
              <Text style={[cookingStyles.filterTabText, cookingFilterTab === tab && cookingStyles.filterTabTextActive]}>
                {tab}
              </Text>
              {cookingFilterTab === tab && (
                <View style={[cookingStyles.filterTabIndicator, { backgroundColor: cookingOrderTypeTab === 'DINE_IN' ? '#3498DB' : '#FF6B35' }]} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {filteredOrders.length === 0 ? (
            <View style={homeStyles.emptyState}>
              <Ionicons name="restaurant-outline" size={48} color="#ccc" />
              <Text style={homeStyles.emptyTitle}>No {cookingFilterTab?.toLowerCase()} orders</Text>
              <Text style={homeStyles.emptySub}>Try another tab</Text>
            </View>
          ) : (
            filteredOrders.map(o => (
              <OrderCard
                key={o._id || o.id}
                order={{
                  id: o._id || o.id,
                  orderNumber: o.orderNumber,
                  status: o.status as any,
                  orderType: o.orderType,
                  tableNumber: o.tableNumber,
                  items: o.items as any,
                  createdAt: o.createdAt || o.orderTime,
                  expectedReadyTime: (o as any).expectedReadyTime,
                  specialInstructions: o.specialInstructions,
                }}
                onStatusChange={async (orderId, status) => {
                  try {
                    console.log('[Cooking Tab] onStatusChange called:', { orderId, status });
                    await updateOrderStatus(orderId, status);
                    showToast(`Order updated: ${status}`, 'success');
                    await loadDashboardData();
                  } catch (e: any) {
                    console.error('[Cooking Tab] onStatusChange error:', e?.message || e);
                    showToast('Failed to update order', 'error');
                  }
                }}
              />
            ))
          )}
        </ScrollView>

        {/* Checklist Modal for Delivery */}
        {showChecklistModal && selectedOrder && (
          <View style={cookingStyles.modalOverlay}>
            <View style={cookingStyles.modalContent}>
              <Text style={cookingStyles.modalTitle}>Packaging Checklist</Text>
              <Text style={cookingStyles.modalSubtitle}>{selectedOrder.orderNumber}</Text>
              
              <View style={cookingStyles.checklistContainer}>
                {[
                  { key: 'itemsPacked', label: 'Items packed in containers' },
                  { key: 'allItemsIncluded', label: 'All items included' },
                  { key: 'specialInstructions', label: 'Special instructions followed' },
                  { key: 'receiptIncluded', label: 'Receipt/invoice included' },
                  { key: 'napkinsUtensils', label: 'Napkins & utensils added' },
                  { key: 'packagingSealed', label: 'Packaging sealed properly' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={cookingStyles.checklistItem}
                    onPress={() => setPackingChecklist({ ...packingChecklist, [item.key]: !packingChecklist[item.key as keyof typeof packingChecklist] })}
                  >
                    <View style={[cookingStyles.checkbox, packingChecklist[item.key as keyof typeof packingChecklist] && cookingStyles.checkboxChecked]}>
                      {packingChecklist[item.key as keyof typeof packingChecklist] && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                    <Text style={cookingStyles.checklistLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {!allChecked && (
                <Text style={cookingStyles.checklistWarning}>Please complete all checklist items</Text>
              )}

              <TouchableOpacity
                style={[cookingStyles.confirmBtn, !allChecked && cookingStyles.confirmBtnDisabled]}
                disabled={!allChecked}
                onPress={() => {
                  setShowChecklistModal(false);
                  Alert.alert('Ready for Pickup', `${selectedOrder.orderNumber} is packed and ready for rider!`);
                }}
              >
                <Text style={cookingStyles.confirmBtnText}>Confirm Ready for Pickup</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={cookingStyles.cancelBtn}
                onPress={() => setShowChecklistModal(false)}
              >
                <Text style={cookingStyles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderNotifications = () => {
    const filteredNotifications = notificationList.filter(n => {
      if (notificationFilter === 'all') return true;
      if (notificationFilter === 'read') return n.is_read;
      if (notificationFilter === 'unread') return !n.is_read;
      return true;
    });

    return (
      <View style={[styles.tabContent, { paddingBottom: insets.bottom + 80 }]}>
        {/* Category Tabs */}
        <View style={styles.notificationTabs}>
          {[
            { key: 'all', label: 'All', count: notificationList.length },
            { key: 'read', label: 'Read', count: notificationList.filter(n => n.is_read).length },
            { key: 'unread', label: 'Unread', count: unreadCount },
          ].map(tab => {
            const isActive = notificationFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.notificationTab, isActive && styles.notificationTabActive]}
                onPress={() => setNotificationFilter(tab.key as any)}
              >
                <Text style={[styles.notificationTabText, isActive && styles.notificationTabTextActive]}>
                  {tab.label}
                </Text>
                <View style={[styles.notificationTabBadge, isActive && styles.notificationTabBadgeActive]}>
                  <Text style={[styles.notificationTabBadgeText, isActive && styles.notificationTabBadgeTextActive]}>
                    {tab.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Notification List */}
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const typeConfig = NOTIFICATION_TYPES[item.type as keyof typeof NOTIFICATION_TYPES] || NOTIFICATION_TYPES.SYSTEM_MESSAGE;
            // Extract waiter name from notification data or body if available
            const waiterName = item.raw?.data?.waiterName || item.raw?.waiterName || 
                              (item.body?.includes('by') && item.body.split('by')[1]?.trim()) ||
                              item.raw?.recipientRole === 'WAITER' ? 'Waiter' : null;
            return (
              <TouchableOpacity 
                style={[notificationStyles.item, !item.is_read && notificationStyles.unreadItem]}
                onPress={() => markNotificationAsRead(item)}
              >
                <View style={[notificationStyles.iconContainer, { backgroundColor: typeConfig.color + '20' }]}>
                  <Ionicons name={typeConfig.icon as any} size={20} color={typeConfig.color} />
                </View>
                <View style={notificationStyles.content}>
                  <Text style={notificationStyles.itemTitle}>{item.title}</Text>
                  <Text style={notificationStyles.itemBody}>{item.body}</Text>
                  {waiterName && (
                    <View style={styles.waiterInfo}>
                      <Ionicons name="person-circle" size={14} color={DESIGN.colors.muted} />
                      <Text style={styles.waiterName}>By: {waiterName}</Text>
                    </View>
                  )}
                  <Text style={notificationStyles.time}>{item.created_at}</Text>
                </View>
                {!item.is_read && <View style={notificationStyles.unreadDot} />}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={() => (
            <View style={notificationStyles.emptyState}>
              <Ionicons name="notifications-off-outline" size={48} color="#ccc" />
              <Text style={notificationStyles.emptyText}>
                {notificationFilter === 'unread' ? 'No unread notifications' : 
                 notificationFilter === 'read' ? 'No read notifications' : 'No notifications'}
              </Text>
            </View>
          )}
          contentContainerStyle={styles.notificationsList}
        />
      </View>
    );
  };

  const renderProfile = () => {
    const chefName = userData?.name || 'Chef Michael';
    const chefRole = userData?.role || 'Head Chef';

    // Profile sub-screens - render imported components
    if (profileSubScreen === 'edit') {
      return <EditProfileScreen userData={userData} setUserData={updateUserData} onBack={() => setProfileSubScreen('main')} api={api} />;
    }
    // Edit Name sub-screen (only name fields)
    if (profileSubScreen === 'editName') {
      return (
        <View style={styles.tabContent}>
          <View style={styles.subHeader}>
            <TouchableOpacity onPress={() => setProfileSubScreen('main')} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={DESIGN.colors.darkText} />
            </TouchableOpacity>
            <Text style={styles.pageTitle}>Edit Name</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.formContainer}>
            <Text style={styles.formLabel}>Your Name</Text>
            <TextInput
              style={styles.formInput}
              value={editName || chefName}
              onChangeText={setEditName}
              placeholder="Enter your name"
              placeholderTextColor={DESIGN.colors.muted}
            />
            <TouchableOpacity
              style={[styles.saveBtn, savingName && { opacity: 0.6 }]}
              onPress={saveProfileName}
              disabled={savingName}
            >
              <Text style={styles.saveBtnText}>{savingName ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    // Change Image sub-screen (only image picker)
    if (profileSubScreen === 'changeImage') {
      return (
        <View style={styles.tabContent}>
          <View style={styles.subHeader}>
            <TouchableOpacity onPress={() => setProfileSubScreen('main')} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={DESIGN.colors.darkText} />
            </TouchableOpacity>
            <Text style={styles.pageTitle}>Change Profile Image</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.imagePickerContainer}>
            <TouchableOpacity style={styles.imagePickerBox} onPress={pickProfileImage}>
              {userData?.avatar ? (
                <Image source={{ uri: userData.avatar }} style={styles.imagePickerPreview} />
              ) : (
                <Ionicons name="person" size={80} color={DESIGN.colors.muted} />
              )}
              <View style={styles.imagePickerOverlay}>
                <Ionicons name="camera" size={32} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.imagePickerHint}>Tap to change profile image</Text>
            {uploadingImage && <Text style={styles.uploadingText}>Uploading...</Text>}
          </View>
        </View>
      );
    }
    if (profileSubScreen === 'notifications') {
      return <NotificationsScreen onBack={() => setProfileSubScreen('main')} />;
    }
    if (profileSubScreen === 'hours') {
      return <OperatingHoursScreen onBack={() => setProfileSubScreen('main')} />;
    }
    if (profileSubScreen === 'schedule') {
      return <CookingScheduleScreen onBack={() => setProfileSubScreen('main')} onShift={onShift} />;
    }
    if (profileSubScreen === 'password') {
      return <ChangePasswordScreen onBack={() => setProfileSubScreen('main')} userData={userData} api={api} />;
    }
    if (profileSubScreen === 'kitchen') {
      return <KitchenSettingsScreen onBack={() => setProfileSubScreen('main')} userRole={userData?.role} />;
    }
    if (profileSubScreen === 'logout') {
      return <LogoutConfirmScreen onBack={() => setProfileSubScreen('main')} api={api} />;
    }
    if (profileSubScreen === 'notificationHistory') {
      return <NotificationHistoryScreen onBack={() => setProfileSubScreen('main')} />;
    }
    
    return (
      <ScrollView
        style={styles.tabContent}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileAvatarLarge}>
            {userData?.avatar ? (
              <Image source={{ uri: userData.avatar }} style={styles.profileAvatarImage} />
            ) : (
              <Ionicons name="person" size={40} color="#fff" />
            )}
          </View>
          <Text style={styles.profileName}>{chefName}</Text>
          <Text style={styles.profileRole}>{chefRole}</Text>
        </View>

        {/* Menu Items */}
        <View style={styles.profileMenu}>
          {[
            { icon: 'image-outline', label: 'Change Profile Image', action: () => setProfileSubScreen('changeImage'), hasArrow: true },
            { icon: 'person-outline', label: 'Edit Profile Name', action: () => { setEditName(chefName); setProfileSubScreen('editName'); }, hasArrow: true },
            { icon: 'lock-closed-outline', label: 'Change Password', action: () => setProfileSubScreen('password'), hasArrow: true },
            { icon: 'log-out-outline', label: 'Logout', action: () => setProfileSubScreen('logout'), hasArrow: true, color: DESIGN.colors.red },
          ].map((item, index) => (
            <TouchableOpacity key={index} style={styles.profileMenuItem} onPress={item.action}>
              <Ionicons name={item.icon as any} size={20} color={item.color || DESIGN.colors.muted} />
              <Text style={[styles.profileMenuText, item.color ? { color: item.color } : undefined]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={20} color={DESIGN.colors.muted} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={{
      flex: 1,
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      backgroundColor: DESIGN.colors.lightBg,
    }}>
      <StatusBar barStyle="dark-content" backgroundColor={DESIGN.colors.white} />

      {/* Header - Hidden on Home tab since renderHome has its own */}
      {bottomTab !== 'home' && bottomTab !== 'profile' && (
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            {bottomTab === 'notifications' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => setShowNotificationPanel(true)}>
                  <Ionicons name="notifications-outline" size={22} color={DESIGN.colors.darkText} />
                  {unreadCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{unreadCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={styles.pageTitle}>Notifications</Text>
              </View>
            ) : (
              <Text style={styles.pageTitle}>
                {bottomTab === 'cooking' ? 'Cooking' : bottomTab === 'profile' ? 'Profile' : ''}
              </Text>
            )}
            {bottomTab !== 'notifications' && (
              <View style={styles.headerIcons}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => setShowNotificationPanel(true)}>
                  <Ionicons name="notifications-outline" size={22} color={DESIGN.colors.darkText} />
                  {unreadCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{unreadCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Profile Header (same style as other pages) */}
      {bottomTab === 'profile' && (
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Text style={styles.pageTitle}>Profile</Text>
            <View style={styles.headerIcons}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setShowNotificationPanel(true)}>
                <Ionicons name="notifications-outline" size={22} color={DESIGN.colors.darkText} />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Main Content */}
      {bottomTab === 'home' && renderHome()}
      {bottomTab === 'cooking' && renderCooking()}
      {bottomTab === 'notifications' && renderNotifications()}
      {bottomTab === 'profile' && renderProfile()}

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + (Platform.OS === 'android' ? 10 : 0) }]}>
        {[
          { key: 'home', label: 'Home', icon: 'home' },
          { key: 'cooking', label: 'Cooking', icon: 'flame' },
          { key: 'notifications', label: 'Notifications', icon: 'notifications', badge: unreadCount },
          { key: 'profile', label: 'Profile', icon: 'person' },
        ].map(tab => {
          const isActive = bottomTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.navItem}
              onPress={() => setBottomTab(tab.key as BottomTab)}
            >
              <View style={styles.navIconContainer}>
                <Ionicons 
                  name={isActive ? (tab.icon as any) : (`${tab.icon}-outline` as any)} 
                  size={24} 
                  color={isActive ? DESIGN.colors.orange : DESIGN.colors.muted} 
                />
                {(tab as any).badge > 0 && (
                  <View style={styles.navBadge}>
                    <Text style={styles.navBadgeText}>
                      {(tab as any).badge > 99 ? '99+' : (tab as any).badge}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{tab.label}</Text>
              {isActive && <View style={styles.navIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Notification Panel Modal */}
      <Modal
        visible={showNotificationPanel}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNotificationPanel(false)}
        statusBarTranslucent
      >
        <TouchableOpacity 
          style={notificationStyles.overlay}
          activeOpacity={1}
          onPress={() => setShowNotificationPanel(false)}
        >
          <TouchableOpacity 
            style={notificationStyles.panel}
            activeOpacity={1}
            onPress={() => {}}
          >
            {/* Header */}
            <View style={notificationStyles.header}>
              <View>
                <Text style={notificationStyles.title}>Notifications</Text>
                <Text style={notificationStyles.subtitle}>({unreadCount} unread)</Text>
              </View>
              <View style={notificationStyles.headerActions}>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={async () => {
                    setNotificationList(prev => prev.map(n => ({ ...n, is_read: true })));
                    setUnreadCount(0);
                    try {
                      await api.put('/notifications/mark-all-read');
                    } catch (error) {
                      console.log('Error marking all notifications as read:', error);
                    }
                  }}>
                    <Text style={notificationStyles.markAll}>Mark all read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowNotificationPanel(false)}>
                  <Ionicons name="close" size={24} color={DESIGN.colors.darkText} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Notification List */}
            {notificationList.length === 0 ? (
              <View style={notificationStyles.emptyState}>
                <Ionicons name="notifications-off-outline" size={48} color="#ccc" />
                <Text style={notificationStyles.emptyText}>No notifications</Text>
              </View>
            ) : (
              <FlatList
                data={notificationList}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const typeConfig = NOTIFICATION_TYPES[item.type as keyof typeof NOTIFICATION_TYPES] || NOTIFICATION_TYPES.SYSTEM_MESSAGE;
                  return (
                    <TouchableOpacity 
                      style={[notificationStyles.item, !item.is_read && notificationStyles.unreadItem]}
                      onPress={() => markNotificationAsRead(item)}
                    >
                      <View style={[notificationStyles.iconContainer, { backgroundColor: typeConfig.color + '20' }]}>
                        <Ionicons name={typeConfig.icon as any} size={20} color={typeConfig.color} />
                      </View>
                      <View style={notificationStyles.content}>
                        <Text style={notificationStyles.itemTitle}>{item.title}</Text>
                        <Text style={notificationStyles.itemBody}>{item.body}</Text>
                        <Text style={notificationStyles.time}>{item.created_at}</Text>
                      </View>
                      {!item.is_read && <View style={notificationStyles.unreadDot} />}
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            {/* View All Link */}
            <TouchableOpacity 
              style={notificationStyles.viewAll}
              onPress={() => {
                setShowNotificationPanel(false);
                setBottomTab('notifications');
              }}
            >
              <Text style={notificationStyles.viewAllText}>View All Notifications</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Toast Notifications */}
      <View style={toastStyles.container}>
        {toasts.map((toast) => (
          <Animated.View 
            key={toast.id} 
            style={[
              toastStyles.toast, 
              { backgroundColor: toast.type === 'success' ? '#2BC48A' : toast.type === 'error' ? '#FF4D4D' : toast.type === 'warning' ? '#FF9F43' : '#6C63FF' }
            ]}
          >
            <Text style={toastStyles.text}>{toast.message}</Text>
          </Animated.View>
        ))}
      </View>

      {/* Order Details Modal */}
      <Modal
        visible={showOrderDetailsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOrderDetailsModal(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Order Details</Text>
              <TouchableOpacity onPress={() => setShowOrderDetailsModal(false)}>
                <Ionicons name="close" size={24} color={DESIGN.colors.darkText} />
              </TouchableOpacity>
            </View>
            {selectedOrderFromNotification && (
              <ScrollView style={modalStyles.content}>
                <View style={modalStyles.orderHeader}>
                  <Text style={modalStyles.orderNumber}>{selectedOrderFromNotification.orderNumber}</Text>
                  <Text style={modalStyles.tableNumber}>Table {selectedOrderFromNotification.tableNumber}</Text>
                </View>
                <View style={modalStyles.section}>
                  <Text style={modalStyles.sectionTitle}>Items</Text>
                  {selectedOrderFromNotification.items?.map((item: any, index: number) => (
                    <View key={index} style={modalStyles.itemRow}>
                      <Text style={modalStyles.itemText}>{item.quantity}x {item.name}</Text>
                      <Text style={[modalStyles.itemStatus, { color: item.status === 'READY' ? '#2BC48A' : item.status === 'PREPARING' ? '#FF9F43' : '#666' }]}>
                        {item.status}
                      </Text>
                    </View>
                  ))}
                </View>
                {selectedOrderFromNotification.specialInstructions && (
                  <View style={modalStyles.section}>
                    <Text style={modalStyles.sectionTitle}>Special Instructions</Text>
                    <Text style={modalStyles.instructions}>{selectedOrderFromNotification.specialInstructions}</Text>
                  </View>
                )}
                
                {/* Status indicator */}
                <View style={modalStyles.statusContainer}>
                  <Text style={modalStyles.statusLabel}>Current Status: </Text>
                  <View style={[modalStyles.statusBadge, 
                    { backgroundColor: selectedOrderFromNotification.status === 'PENDING' ? '#FF9F43' : 
                      selectedOrderFromNotification.status === 'PREPARING' ? '#6C63FF' : 
                      selectedOrderFromNotification.status === 'READY' ? '#2BC48A' : '#666' }
                  ]}>
                    <Text style={modalStyles.statusText}>{selectedOrderFromNotification.status}</Text>
                  </View>
                </View>

                {/* Dynamic action buttons based on status */}
                <View style={modalStyles.actions}>
                  {selectedOrderFromNotification.status === 'PENDING' && (
                    <>
                      <TouchableOpacity 
                        style={[modalStyles.actionBtn, { backgroundColor: '#FF4D4D' }]}
                        onPress={() => {
                          setShowOrderDetailsModal(false);
                          setShowRejectionModal(true);
                        }}
                      >
                        <Text style={modalStyles.actionBtnText}>Reject Order</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[modalStyles.actionBtn, { backgroundColor: '#2BC48A' }]}
                        onPress={() => handleAcceptOrder(selectedOrderFromNotification)}
                      >
                        <Text style={modalStyles.actionBtnText}>Accept Order</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {selectedOrderFromNotification.status === 'PREPARING' && (
                    <>
                      <TouchableOpacity 
                        style={[modalStyles.actionBtn, { backgroundColor: '#FF4D4D' }]}
                        onPress={() => {
                          setShowOrderDetailsModal(false);
                          setShowRejectionModal(true);
                        }}
                      >
                        <Text style={modalStyles.actionBtnText}>Cancel Order</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[modalStyles.actionBtn, { backgroundColor: '#2BC48A' }]}
                        onPress={() => handleMarkComplete(selectedOrderFromNotification)}
                      >
                        <Text style={modalStyles.actionBtnText}>Mark Complete</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {selectedOrderFromNotification.status === 'READY' && (
                    <TouchableOpacity 
                      style={[modalStyles.actionBtn, { backgroundColor: '#2BC48A', flex: 1 }]}
                      onPress={() => handleMarkComplete(selectedOrderFromNotification)}
                    >
                      <Text style={modalStyles.actionBtnText}>Mark as Completed</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Rejection Reason Modal */}
      <Modal
        visible={showRejectionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRejectionModal(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.container, { maxHeight: height * 0.6 }]}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Rejection Reason</Text>
              <TouchableOpacity onPress={() => setShowRejectionModal(false)}>
                <Ionicons name="close" size={24} color={DESIGN.colors.darkText} />
              </TouchableOpacity>
            </View>
            <ScrollView style={modalStyles.content}>
              <Text style={modalStyles.label}>Select a reason:</Text>
              {['Out of ingredients', 'Kitchen too busy', 'Equipment malfunction', 'Staff shortage', 'Other'].map((reason) => (
                <TouchableOpacity 
                  key={reason}
                  style={[modalStyles.reasonBtn, rejectionReason === reason && modalStyles.reasonBtnActive]}
                  onPress={() => setRejectionReason(reason)}
                >
                  <Text style={[modalStyles.reasonText, rejectionReason === reason && modalStyles.reasonTextActive]}>{reason}</Text>
                  {rejectionReason === reason && <Ionicons name="checkmark" size={20} color="#fff" />}
                </TouchableOpacity>
              ))}
              {rejectionReason === 'Other' && (
                <TextInput
                  style={modalStyles.customInput}
                  placeholder="Enter custom reason..."
                  value={customRejectionReason}
                  onChangeText={setCustomRejectionReason}
                  multiline
                  numberOfLines={3}
                />
              )}
              <TouchableOpacity 
                style={[modalStyles.submitBtn, (!rejectionReason || (rejectionReason === 'Other' && !customRejectionReason)) && modalStyles.submitBtnDisabled]}
                onPress={() => {
                  if (rejectionReason) {
                    const finalReason = rejectionReason === 'Other' ? customRejectionReason : rejectionReason;
                    handleRejectOrder(finalReason);
                  }
                }}
                disabled={!rejectionReason || (rejectionReason === 'Other' && !customRejectionReason)}
              >
                <Text style={modalStyles.submitBtnText}>Submit Rejection</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: DESIGN.spacing.pagePad,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: DESIGN.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN.colors.border,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: DESIGN.colors.darkText,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DESIGN.colors.lightBg,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: DESIGN.colors.red,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  tabContent: {
    flex: 1,
  },
  subTabRow: {
    flexDirection: 'row',
    paddingHorizontal: DESIGN.spacing.pagePad,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 16,
  },
  subTab: {
    position: 'relative',
    paddingBottom: 8,
  },
  subTabActive: {
    // Active styling
  },
  subTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN.colors.muted,
  },
  subTabTextActive: {
    color: DESIGN.colors.darkText,
    fontWeight: '800',
  },
  subTabBadge: {
    backgroundColor: DESIGN.colors.orange,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  subTabBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  subTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: DESIGN.colors.orange,
    borderRadius: 2,
  },
  inProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DESIGN.spacing.pagePad,
    marginBottom: 12,
  },
  inProgressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DESIGN.colors.green,
    marginRight: 8,
  },
  inProgressText: {
    fontSize: 13,
    color: DESIGN.colors.muted,
    flex: 1,
  },
  filterBtn: {
    padding: 4,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: DESIGN.spacing.pagePad,
  },
  orderCard: {
    backgroundColor: DESIGN.colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  orderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: DESIGN.colors.orange,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  orderBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  orderMetaLeft: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: DESIGN.colors.darkText,
  },
  orderTimeInfo: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  tableText: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
  },
  timeText: {
    fontSize: 11,
    color: DESIGN.colors.muted,
    marginTop: 2,
  },
  orderItemsRow: {
    gap: 8,
    marginBottom: 12,
  },
  itemWithStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderItemLine: {
    fontSize: 14,
    color: DESIGN.colors.darkText,
    fontWeight: '500',
  },
  itemStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  orderNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  orderNoteText: {
    fontSize: 12,
    color: DESIGN.colors.muted,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  priorityLabel: {
    fontSize: 12,
    color: DESIGN.colors.muted,
  },
  priorityPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityNormal: {
    backgroundColor: '#E8F5E9',
  },
  priorityUrgent: {
    backgroundColor: '#FFEBEE',
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  priorityTextNormal: {
    color: DESIGN.colors.green,
  },
  priorityTextUrgent: {
    color: DESIGN.colors.red,
  },
  cancelledBadge: {
    backgroundColor: DESIGN.colors.red,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cancelledText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: DESIGN.colors.green,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#FFEBEE',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  rejectBtnText: {
    color: DESIGN.colors.red,
    fontSize: 14,
    fontWeight: '800',
  },
  cancelledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  cancelledByText: {
    fontSize: 12,
    color: DESIGN.colors.muted,
    flex: 1,
  },
  rejectedBtn: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  rejectedBtnText: {
    color: DESIGN.colors.red,
    fontSize: 12,
    fontWeight: '700',
  },
  moreOrdersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  moreOrdersText: {
    fontSize: 14,
    color: DESIGN.colors.orange,
    fontWeight: '700',
  },
  cookingTabScroll: {
    maxHeight: 50,
  },
  cookingTabRow: {
    flexDirection: 'row',
    paddingHorizontal: DESIGN.spacing.pagePad,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  cookingTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: DESIGN.colors.lightBg,
    position: 'relative',
  },
  cookingTabActive: {
    backgroundColor: '#FFF3E0',
  },
  cookingTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: DESIGN.colors.muted,
  },
  cookingTabTextActive: {
    color: DESIGN.colors.orange,
    fontWeight: '800',
  },
  cookingTabIndicator: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -20,
    width: 40,
    height: 3,
    backgroundColor: DESIGN.colors.orange,
    borderRadius: 2,
  },
  timeLeftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginLeft: DESIGN.spacing.pagePad,
    marginBottom: 12,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  timeLeftDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DESIGN.colors.orange,
  },
  timeLeftText: {
    fontSize: 12,
    fontWeight: '800',
    color: DESIGN.colors.orange,
  },
  cookingCard: {
    backgroundColor: DESIGN.colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderBadgeSmall: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: DESIGN.colors.orange,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  orderBadgeTextSmall: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  cookingMeta: {
    flex: 1,
  },
  orderNumberSmall: {
    fontSize: 14,
    fontWeight: '800',
    color: DESIGN.colors.darkText,
  },
  tableTextSmall: {
    fontSize: 12,
    color: DESIGN.colors.muted,
  },
  timeTextSmall: {
    fontSize: 12,
    color: DESIGN.colors.muted,
    marginRight: 8,
  },
  cookingItems: {
    gap: 8,
    marginBottom: 12,
  },
  cookingItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cookingItemText: {
    fontSize: 14,
    color: DESIGN.colors.darkText,
  },
  itemStatusPillSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  itemStatusTextSmall: {
    fontSize: 9,
    fontWeight: '700',
  },
  specialInstBox: {
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  specialInstTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN.colors.cooking,
    marginBottom: 4,
  },
  specialInstText: {
    fontSize: 12,
    color: DESIGN.colors.darkText,
  },
  progressSection: {
    marginTop: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 11,
    color: DESIGN.colors.muted,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: DESIGN.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  lateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  lateText: {
    fontSize: 12,
    color: DESIGN.colors.red,
    fontWeight: '600',
    flex: 1,
  },
  lateTime: {
    fontSize: 12,
    color: DESIGN.colors.red,
    fontWeight: '800',
  },
  mostOrderedSection: {
    backgroundColor: DESIGN.colors.white,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  mostOrderedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: DESIGN.colors.darkText,
    marginBottom: 16,
  },
  mostOrderedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  mostOrderedRank: {
    fontSize: 14,
    fontWeight: '700',
    color: DESIGN.colors.muted,
    width: 24,
  },
  mostOrderedName: {
    fontSize: 14,
    color: DESIGN.colors.darkText,
    flex: 1,
  },
  mostOrderedTime: {
    fontSize: 13,
    color: DESIGN.colors.muted,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  profileAvatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: DESIGN.colors.orange,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: DESIGN.colors.darkText,
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    color: DESIGN.colors.muted,
    marginBottom: 16,
  },
  editProfileBtn: {
    backgroundColor: DESIGN.colors.orange,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  editProfileText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  shiftToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
    gap: 8,
  },
  shiftToggleOn: {
    backgroundColor: '#FFF3E0',
  },
  shiftToggleOff: {
    backgroundColor: '#F5F5F5',
  },
  shiftIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  shiftIndicatorOn: {
    backgroundColor: DESIGN.colors.orange,
  },
  shiftIndicatorOff: {
    backgroundColor: DESIGN.colors.muted,
  },
  shiftToggleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  shiftToggleTextOn: {
    color: DESIGN.colors.orange,
  },
  shiftToggleTextOff: {
    color: DESIGN.colors.muted,
  },
  profileMenu: {
    backgroundColor: DESIGN.colors.white,
    borderRadius: 16,
    marginHorizontal: DESIGN.spacing.pagePad,
    marginTop: 8,
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN.colors.border,
  },
  profileMenuText: {
    fontSize: 14,
    color: DESIGN.colors.darkText,
    flex: 1,
    marginLeft: 12,
  },
  menuBadge: {
    backgroundColor: DESIGN.colors.red,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  menuBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: DESIGN.colors.white,
    flexDirection: 'row',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: DESIGN.colors.border,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  navLabel: {
    fontSize: 11,
    color: DESIGN.colors.muted,
    marginTop: 2,
    fontWeight: '600',
  },
  navLabelActive: {
    color: DESIGN.colors.orange,
    fontWeight: '800',
  },
  navIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 20,
    height: 3,
    backgroundColor: DESIGN.colors.orange,
    borderRadius: 2,
  },
  navIconContainer: {
    position: 'relative',
  },
  navBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: DESIGN.colors.red,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  navBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  // Notifications tab styles
  notificationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DESIGN.spacing.pagePad,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: DESIGN.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN.colors.border,
  },
  notificationsTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: DESIGN.colors.darkText,
  },
  markAllReadBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: DESIGN.colors.orange + '15',
    borderRadius: 12,
  },
  markAllReadText: {
    fontSize: 12,
    color: DESIGN.colors.orange,
    fontWeight: '700',
  },
  notificationsList: {
    paddingHorizontal: DESIGN.spacing.pagePad,
    paddingTop: 12,
  },
  notificationsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
  },
  notificationTabs: {
    flexDirection: 'row',
    paddingHorizontal: DESIGN.spacing.pagePad,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: DESIGN.colors.white,
    gap: 8,
  },
  notificationTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: DESIGN.colors.lightBg,
    borderRadius: 20,
    gap: 6,
  },
  notificationTabActive: {
    backgroundColor: DESIGN.colors.orange + '15',
  },
  notificationTabText: {
    fontSize: 13,
    color: DESIGN.colors.muted,
    fontWeight: '600',
  },
  notificationTabTextActive: {
    color: DESIGN.colors.orange,
    fontWeight: '700',
  },
  notificationTabBadge: {
    backgroundColor: DESIGN.colors.muted + '20',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationTabBadgeActive: {
    backgroundColor: DESIGN.colors.orange,
  },
  notificationTabBadgeText: {
    fontSize: 10,
    color: DESIGN.colors.muted,
    fontWeight: '700',
  },
  notificationTabBadgeTextActive: {
    color: '#fff',
  },
  waiterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  waiterName: {
    fontSize: 12,
    color: DESIGN.colors.muted,
  },
  // Home page styles
  content: {
    flex: 1,
    paddingHorizontal: DESIGN.spacing.pagePad,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
  },
  statCard: {
    width: (width - (DESIGN.spacing.pagePad * 2) - 16) / 3,
    borderRadius: 16,
    padding: 12,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginTop: 4,
    opacity: 0.95,
  },
  statSublabel: {
    fontSize: 10,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: DESIGN.colors.darkText,
    marginBottom: 12,
  },
  segmentedRow: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN.colors.border,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  segmentBtnActive: {
    // Active state handled by indicator
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: DESIGN.colors.muted,
  },
  segmentTextActive: {
    color: DESIGN.colors.darkText,
    fontWeight: '800',
  },
  segmentIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 40,
    height: 3,
    backgroundColor: DESIGN.colors.orange,
    borderRadius: 2,
  },
  emptyState: {
    backgroundColor: DESIGN.colors.white,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: DESIGN.colors.muted,
    marginTop: 4,
  },
  // Profile sub-screen styles
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DESIGN.spacing.pagePad,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: DESIGN.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN.colors.border,
  },
  backBtn: {
    padding: 4,
  },
  formContainer: {
    padding: DESIGN.spacing.pagePad,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN.colors.darkText,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: DESIGN.colors.white,
    borderWidth: 1,
    borderColor: DESIGN.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: DESIGN.colors.darkText,
    marginBottom: 16,
  },
  saveBtn: {
    backgroundColor: DESIGN.colors.orange,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  imagePickerContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  imagePickerBox: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: DESIGN.colors.lightBg,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imagePickerPreview: {
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  imagePickerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  imagePickerHint: {
    marginTop: 16,
    fontSize: 14,
    color: DESIGN.colors.muted,
  },
  uploadingText: {
    marginTop: 8,
    fontSize: 14,
    color: DESIGN.colors.orange,
    fontWeight: '600',
  },
});

const homeStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DESIGN.spacing.pagePad,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: DESIGN.colors.lightBg,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DESIGN.colors.orange,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  profileInfo: {
    justifyContent: 'center',
  },
  chefName: {
    fontSize: 16,
    fontWeight: '800',
    color: DESIGN.colors.darkText,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2BC48A',
    marginRight: 6,
  },
  onlineText: {
    fontSize: 12,
    color: DESIGN.colors.muted,
    fontWeight: '600',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DESIGN.colors.lightBg,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: DESIGN.colors.red,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    paddingHorizontal: DESIGN.spacing.pagePad,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
  },
  statCard: {
    width: (width - (DESIGN.spacing.pagePad * 2) - 16) / 3,
    borderRadius: 16,
    padding: 12,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    marginTop: 4,
    opacity: 0.95,
  },
  statSublabel: {
    fontSize: 10,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: DESIGN.colors.darkText,
    marginBottom: 12,
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN.colors.border,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN.colors.muted,
    paddingVertical: 12,
    marginRight: 20,
    position: 'relative',
  },
  tabTextActive: {
    color: DESIGN.colors.darkText,
    fontWeight: '800',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 24,
    height: 3,
    backgroundColor: DESIGN.colors.orange,
    borderRadius: 2,
  },
  orderCard: {
    backgroundColor: DESIGN.colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: DESIGN.colors.orange,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  orderBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  orderMeta: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: DESIGN.colors.darkText,
  },
  tableTimeText: {
    fontSize: 12,
    color: DESIGN.colors.muted,
    marginTop: 2,
  },
  itemsList: {
    gap: 8,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemText: {
    fontSize: 14,
    color: DESIGN.colors.darkText,
    fontWeight: '500',
  },
  itemPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  urgentTag: {
    backgroundColor: DESIGN.colors.red,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  urgentText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  specialBox: {
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  specialTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF9F43',
    marginBottom: 4,
  },
  specialText: {
    fontSize: 12,
    color: DESIGN.colors.darkText,
  },
  orderFooter: {
    borderTopWidth: 1,
    borderTopColor: DESIGN.colors.border,
    paddingTop: 12,
  },
  expectedTime: {
    fontSize: 11,
    color: DESIGN.colors.muted,
    marginBottom: 12,
  },
  completeBtn: {
    backgroundColor: DESIGN.colors.orange,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  completeBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyState: {
    backgroundColor: DESIGN.colors.white,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: DESIGN.colors.muted,
    marginTop: 4,
  },
});



const cookingStyles = StyleSheet.create({
  typeTabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: DESIGN.colors.white,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  typeTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    position: 'relative',
  },
  typeTabActive: {
    backgroundColor: '#3498DB',
  },
  typeTabActiveOrange: {
    backgroundColor: '#FF6B35',
  },
  typeTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
  },
  typeTabTextActive: {
    color: '#fff',
  },
  typeTabBadge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  typeTabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  typeTabIndicator: {
    position: 'absolute',
    bottom: -4,
    left: '20%',
    right: '20%',
    height: 3,
    borderRadius: 2,
  },
  filterTabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN.colors.border,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: DESIGN.colors.muted,
  },
  filterTabTextActive: {
    color: DESIGN.colors.darkText,
  },
  filterTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    right: '25%',
    height: 3,
    borderRadius: 2,
  },
  orderCard: {
    backgroundColor: DESIGN.colors.white,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  dineInCard: {
    borderColor: '#3498DB',
    backgroundColor: '#EBF5FB',
  },
  deliveryCard: {
    borderColor: '#FF6B35',
    backgroundColor: '#FEF5E7',
  },
  typeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dineInBadge: {
    backgroundColor: '#3498DB',
  },
  deliveryBadge: {
    backgroundColor: '#FF6B35',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  orderBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  orderMeta: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: DESIGN.colors.darkText,
  },
  tableTimeText: {
    fontSize: 13,
    color: DESIGN.colors.muted,
    marginTop: 2,
  },
  urgentBadge: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  urgentText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  itemsList: {
    gap: 8,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemText: {
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN.colors.darkText,
  },
  itemPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  itemPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  specialBox: {
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  specialTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F39C12',
    marginBottom: 4,
  },
  specialText: {
    fontSize: 13,
    color: DESIGN.colors.darkText,
    fontStyle: 'italic',
  },
  packingBox: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  packingTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B35',
    marginBottom: 6,
  },
  packingList: {
    gap: 2,
  },
  packingItem: {
    fontSize: 12,
    color: DESIGN.colors.darkText,
  },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeInfo: {
    flex: 1,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
    color: DESIGN.colors.darkText,
  },
  locationText: {
    fontSize: 11,
    color: DESIGN.colors.muted,
    marginTop: 2,
  },
  readyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 140,
    alignItems: 'center',
  },
  dineInReadyBtn: {
    backgroundColor: '#2BC48A',
  },
  deliveryReadyBtn: {
    backgroundColor: '#2BC48A',
  },
  readyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2BC48A20',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  readyBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2BC48A',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: DESIGN.colors.white,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: DESIGN.colors.darkText,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: DESIGN.colors.muted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  checklistContainer: {
    gap: 12,
    marginBottom: 20,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: DESIGN.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2BC48A',
    borderColor: '#2BC48A',
  },
  checklistLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: DESIGN.colors.darkText,
    flex: 1,
  },
  checklistWarning: {
    fontSize: 13,
    color: '#E74C3C',
    textAlign: 'center',
    marginBottom: 16,
  },
  confirmBtn: {
    backgroundColor: '#2BC48A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: DESIGN.colors.border,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: DESIGN.colors.muted,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  acceptBtn: {
    backgroundColor: '#2BC48A',
  },
  acceptBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  rejectBtn: {
    backgroundColor: '#FF4D4D',
  },
  rejectBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

const notificationStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  panel: {
    backgroundColor: DESIGN.colors.white,
    height: height * 0.55,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
    paddingTop: 50, // Add padding to avoid status bar
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN.colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
  },
  subtitle: {
    fontSize: 13,
    color: DESIGN.colors.muted,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  markAll: {
    fontSize: 14,
    color: DESIGN.colors.orange,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  item: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN.colors.border,
    alignItems: 'flex-start',
  },
  unreadItem: {
    backgroundColor: '#FFF8F5',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
    marginBottom: 4,
  },
  itemBody: {
    fontSize: 13,
    color: DESIGN.colors.muted,
    lineHeight: 18,
  },
  time: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4D4D',
    marginLeft: 8,
    marginTop: 6,
  },
  viewAll: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: DESIGN.colors.border,
  },
  viewAllText: {
    fontSize: 14,
    color: DESIGN.colors.orange,
    fontWeight: '600',
  },
});

const toastStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
    maxWidth: width - 40,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: DESIGN.colors.white,
    borderRadius: 16,
    width: width - 40,
    maxHeight: height * 0.7,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN.colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
  },
  content: {
    padding: 20,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
  },
  tableNumber: {
    fontSize: 14,
    color: DESIGN.colors.muted,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN.colors.muted,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemText: {
    fontSize: 14,
    color: DESIGN.colors.darkText,
  },
  itemStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  instructions: {
    fontSize: 14,
    color: DESIGN.colors.darkText,
    backgroundColor: '#FFF8F5',
    padding: 12,
    borderRadius: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 14,
    color: DESIGN.colors.muted,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN.colors.darkText,
    marginBottom: 12,
  },
  reasonBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    marginBottom: 8,
  },
  reasonBtnActive: {
    backgroundColor: DESIGN.colors.orange,
  },
  reasonText: {
    fontSize: 14,
    color: DESIGN.colors.darkText,
  },
  reasonTextActive: {
    color: '#fff',
  },
  customInput: {
    borderWidth: 1,
    borderColor: DESIGN.colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: DESIGN.colors.darkText,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitBtn: {
    backgroundColor: DESIGN.colors.orange,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: {
    backgroundColor: '#ddd',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});


