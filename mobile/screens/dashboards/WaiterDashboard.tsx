import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Modal,
  StatusBar,
  Image,
  Platform,
  Dimensions,
  Switch,
  AppState,
  TextInput,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';
import { CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OrderCard from '../../components/ChefDashboard/OrderCard';
import { getChefOrders, populateOrdersWithProductDetails } from '../../services/orderService';
import PaymentHistoryScreen from '../profile/PaymentHistoryScreen';
import NotificationHistoryScreen from '../profile/NotificationHistoryScreen';
import ChangePasswordScreen from '../profile/ChangePasswordScreen';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;
const HEADER_MARGIN = Platform.OS === 'ios' ? 50 : 20;

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

const { width } = Dimensions.get('window');

interface SqlRestaurantTable {
  id: string;
  table_number: string;
  seating_capacity: number;
  section?: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'OUT_OF_SERVICE';
  current_waiter_id?: string | null;
}

type SqlOrderType = 'DELIVERY' | 'DINE_IN' | 'TAKEAWAY';
type SqlOrderStatus =
  | 'PENDING'
  | 'KITCHEN_ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'PICKED_UP'
  | 'SERVED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

interface SqlOrderItem {
  id: string;
  product_name: string;
  size_name?: string | null;
  quantity: number;
  status?: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'RETURNED';
  price?: number;
  unit_price?: number;
  total_price?: number;
  image?: string | null;
}

interface SqlOrder {
  id: string;
  order_number: string;
  order_type: SqlOrderType;
  status: SqlOrderStatus;
  table_id?: string | null;
  table_number?: string | null;
  special_instructions?: string | null;
  created_at: string;
  items: SqlOrderItem[];
  total_amount?: number;
  picked_up_at?: string | null;
  ready_at?: string | null;
}

interface WaiterDashboardStats {
  active_orders: number;
  ready_to_serve: number;
  served_today: number;
}

export default function WaiterDashboard() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'home' | 'orders' | 'tables' | 'notifications' | 'profile'>('home');
  const [onShift, setOnShift] = useState(true);
  const [orderFilter, setOrderFilter] = useState<'ACTIVE' | 'READY' | 'COMPLETED' | 'CANCELLED'>('ACTIVE');
  const [tableFilter, setTableFilter] = useState<'ALL' | 'OCCUPIED' | 'RESERVED' | 'AVAILABLE'>('ALL');
  const [tableSearch, setTableSearch] = useState('');
  const [stats, setStats] = useState<WaiterDashboardStats>({
    active_orders: 0,
    ready_to_serve: 0,
    served_today: 0,
  });
  const [tables, setTables] = useState<SqlRestaurantTable[]>([]);
  const [orders, setOrders] = useState<SqlOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [waiterName, setWaiterName] = useState('Waiter');
  const [currentBranch, setCurrentBranch] = useState('My Branch');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [appState, setAppState] = useState(AppState.currentState);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileSubScreen, setProfileSubScreen] = useState<'main' | 'payment' | 'password'>('main');
  const [showNotifications, setShowNotifications] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrderForBill, setSelectedOrderForBill] = useState<SqlOrder | null>(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const loadingRef = React.useRef(false);

  const handlePrintInvoice = async () => {
    if (!selectedOrderForBill) return;

    const lines: string[] = [];
    lines.push(`Invoice - ${selectedOrderForBill.order_number}`);
    lines.push(`Order Type: ${selectedOrderForBill.order_type}`);
    if (selectedOrderForBill.table_number) {
      lines.push(`Table: ${selectedOrderForBill.table_number}`);
    }
    lines.push('');
    lines.push('Items:');

    (selectedOrderForBill.items || []).forEach((item: any) => {
      const name = item.product_name || item.name || 'Item';
      const qty = Number(item.quantity || 0);
      const price = Number(item.total_price || item.price || 0).toFixed(2);
      lines.push(`- ${name} x${qty}  $${price}`);
    });

    lines.push('');
    lines.push(`Total: $${Number(selectedOrderForBill.total_amount || 0).toFixed(2)}`);
    lines.push('');
    lines.push('Thank you!');

    try {
      await Share.share({
        title: `Invoice ${selectedOrderForBill.order_number}`,
        message: lines.join('\n'),
      });
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to open print/share');
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    const POLL_MS = 3000; // Poll every 3 seconds for near real-time updates
    const id = setInterval(() => {
      loadDashboardData({ silent: true });
    }, POLL_MS);

    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      setAppState(nextState);
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (appState === 'active') {
      loadDashboardData({ silent: true });
    }
  }, [appState]);

  const loadDashboardData = async ({ silent }: { silent?: boolean } = {}) => {
    if (loadingRef.current) return;
    try {
      loadingRef.current = true;
      if (!silent) setLoading(true);

      try {
        const userDataRaw = await AsyncStorage.getItem('userData');
        if (userDataRaw) {
          const userDataParsed = JSON.parse(userDataRaw);
          setUserData(userDataParsed);
          // Server returns displayName (camelCase), also check for snake_case fallback
          setWaiterName(userDataParsed?.displayName || userDataParsed?.display_name || userDataParsed?.name || 'Waiter');
          setCurrentBranch(userDataParsed?.branch_name || userDataParsed?.assigned_branch_name || 'My Branch');
          if (userDataParsed?.profileImage || userDataParsed?.avatar || userDataParsed?.image) {
            const rawImage = userDataParsed?.profileImage || userDataParsed?.avatar || userDataParsed?.image;
            // Normalize image URL
            let normalizedImage = rawImage;
            if (rawImage && !rawImage.startsWith('http://') && !rawImage.startsWith('https://') && !rawImage.startsWith('data:')) {
              const baseUrl = api.getBaseURL().replace('/api', '');
              normalizedImage = rawImage.startsWith('/') ? baseUrl + rawImage : baseUrl + '/' + rawImage;
            }
            setProfileImage(normalizedImage);
          }
        }
      } catch {
        // ignore
      }

      const statsResponse = await api.get('/dashboard/waiter/stats');
      if (statsResponse.success && statsResponse.data) {
        setStats({
          active_orders: statsResponse.data.active_orders ?? statsResponse.data.activeOrders ?? 0,
          ready_to_serve: statsResponse.data.ready_to_serve ?? statsResponse.data.ordersToServe ?? 0,
          served_today: statsResponse.data.served_today ?? statsResponse.data.ordersServed ?? 0,
        });
      }

      const ordersResponse = await api.get('/orders/branch/all?limit=500');
      if (ordersResponse.success && ordersResponse.data) {
        const rawOrders = ordersResponse.data.orders || [];
        const totalOrdersFromDb = ordersResponse.data.pagination?.total;
        console.log('[WAITER] Branch orders count:', rawOrders.length);
        
        // Populate product details for orders with incomplete product data
        const populatedOrders = await populateOrdersWithProductDetails(rawOrders);
        
        const formattedOrders: SqlOrder[] = populatedOrders.map((order: any) => {
          const id = order.id || order._id;
          const createdAt = order.created_at || order.createdAt;
          const orderNumber = order.order_number || order.orderNumber || `ORD-${String(id).slice(-6).toUpperCase()}`;
          const status = String(order.status || 'PENDING').toUpperCase() as SqlOrderStatus;
          const orderType = (order.order_type || order.orderType || 'DINE_IN') as SqlOrderType;
          const itemsRaw = order.items || order.orderItems || [];
          const items: SqlOrderItem[] = itemsRaw.map((item: any) => ({
            id: item.id || item._id || `${id}-${item.product_id || item.productId || item.product_name || item.productName}`,
            product_name: item.productName || item.product_name || item.name || (item.product?.name) || 'Item',
            size_name: item.size_name || item.sizeName || null,
            quantity: Number(item.quantity) || 1,
            status: String(item.status || 'PENDING').toUpperCase() as any,
            price: Number(item.price || item.unitPrice || item.unit_price || item.totalPrice || item.total_price || 0),
            unit_price: Number(item.unitPrice || item.unit_price || item.price || 0),
            total_price: Number(item.totalPrice || item.total_price || (item.price * item.quantity) || 0),
            image: item.image || item.product?.image || item.product?.imageUrl || null,
          }));
          return {
            id: String(id),
            order_number: String(orderNumber),
            order_type: orderType,
            status,
            table_id: order.table_id || order.tableId || null,
            table_number: order.table_number || order.tableNumber || null,
            special_instructions: order.special_instructions || order.specialInstructions || null,
            created_at: createdAt || new Date().toISOString(),
            items,
            total_amount: order.total_amount ?? order.totalAmount,
          };
        });

        setOrders(formattedOrders);

        const activeOrders = formattedOrders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED' && o.status !== 'SERVED');
        const readyToServe = formattedOrders.filter(o => o.status === 'READY');
        const servedToday = formattedOrders.filter(o =>
          (o.status === 'COMPLETED' || o.status === 'SERVED') &&
          new Date(o.created_at).toDateString() === new Date().toDateString()
        ).length;

        setStats(prev => {
          const activeFromApi = typeof prev.active_orders === 'number' ? prev.active_orders : 0;
          const readyFromApi = typeof prev.ready_to_serve === 'number' ? prev.ready_to_serve : 0;
          const servedFromApi = typeof prev.served_today === 'number' ? prev.served_today : 0;

          return {
            active_orders: activeFromApi || activeOrders.length,
            ready_to_serve: readyFromApi || readyToServe.length,
            served_today: servedFromApi || servedToday,
            total_orders: typeof totalOrdersFromDb === 'number' ? totalOrdersFromDb : (prev as any)?.total_orders,
          } as any;
        });
      }

      const tablesResponse = await api.get('/tables');
      if (tablesResponse.success && tablesResponse.data) {
        const rawTables = tablesResponse.data.tables || tablesResponse.data || [];
        const formattedTables: SqlRestaurantTable[] = rawTables.map((t: any) => ({
          id: String(t.id || t._id),
          table_number: t.table_number || t.tableNumber || t.number || '1',
          seating_capacity: t.seating_capacity || t.seatingCapacity || 4,
          section: t.section,
          status: t.status || 'AVAILABLE',
          current_waiter_id: t.current_waiter_id || t.currentWaiterId || null,
        }));
        setTables(formattedTables);
      } else if (tables.length === 0) {
        setTables([
          { id: '1', table_number: '6', seating_capacity: 4, section: 'Main', status: 'OCCUPIED' },
          { id: '2', table_number: '2', seating_capacity: 2, section: 'Main', status: 'AVAILABLE' },
          { id: '3', table_number: '18', seating_capacity: 6, section: 'VIP', status: 'RESERVED' },
        ]);
      }

      setLastUpdatedAt(Date.now());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      if (!silent) setLoading(false);
      loadingRef.current = false;
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('userRole');
    await AsyncStorage.removeItem('userData');
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' as any }],
      })
    );
  };

  const handleChangePassword = () => {
    setProfileSubScreen('password');
  };

  const handleNotifications = async () => {
    try {
      const response = await api.get('/notifications?limit=5');
      if (response.success && response.data?.notifications) {
        setRecentNotifications(response.data.notifications);
      }
      setShowNotifications(true);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setShowNotifications(true);
    }
  };

  const openNewOrder = () => {
    try {
      (navigation as any).navigate('OrderForm');
    } catch {
      Alert.alert('New Order', 'Order form screen is not available yet.');
    }
  };

  const openEditProfile = () => {
    setEditDisplayName(waiterName);
    setShowEditProfile(true);
  };

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
        quality: 0.7,
        base64: true,
      });
      if (!pickerResult.canceled && pickerResult.assets[0]) {
        const asset = pickerResult.assets[0];
        const uri = asset.uri;
        setProfileImage(uri);
        
        // Convert to base64 and upload
        if (asset.base64) {
          const mimeType = asset.mimeType || 'image/jpeg';
          const base64Data = `data:${mimeType};base64,${asset.base64}`;
          
          try {
            // Upload base64 image
            const uploadResponse = await api.post('/upload', {
              image: base64Data,
              filename: `profile-${Date.now()}.jpg`,
              mimeType: mimeType,
            });
            
            if (uploadResponse.success && uploadResponse.data?.url) {
              let imageUrl = uploadResponse.data.url;
              // Prepend server URL if it's a relative path
              if (imageUrl.startsWith('/uploads/')) {
                const baseUrl = api.getBaseURL().replace('/api', '');
                imageUrl = baseUrl + imageUrl;
              }
              
              // Update user profile with image URL
              const response = await api.patch('/users/profile', { avatar: imageUrl });
              
              if (response.success) {
                // Update local storage
                const userDataRaw = await AsyncStorage.getItem('userData');
                if (userDataRaw) {
                  const parsed = JSON.parse(userDataRaw);
                  const updated = { ...parsed, profileImage: imageUrl };
                  await AsyncStorage.setItem('userData', JSON.stringify(updated));
                  setUserData(updated);
                  setProfileImage(imageUrl);
                }
                Alert.alert('Success', 'Profile image updated');
              } else {
                Alert.alert('Error', response.message || 'Failed to update profile');
              }
            } else {
              Alert.alert('Error', 'Failed to upload image');
            }
          } catch (uploadError) {
            console.error('Error uploading image:', uploadError);
            Alert.alert('Error', 'Failed to upload profile image');
          }
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const openPaymentHistory = () => {
    setProfileSubScreen('payment');
  };

  const saveProfile = async () => {
    const nextName = editDisplayName.trim();
    if (!nextName) {
      Alert.alert('Invalid Name', 'Please enter a name.');
      return;
    }

    try {
      // Save to server - use /users/profile endpoint
      const response = await api.patch('/users/profile', { name: nextName });
      
      if (response.success) {
        setWaiterName(nextName);
        // Update local storage with server response format (displayName)
        const userDataRaw = await AsyncStorage.getItem('userData');
        if (userDataRaw) {
          const parsed = JSON.parse(userDataRaw);
          const updated = { 
            ...parsed, 
            displayName: nextName,
            display_name: nextName, 
            name: nextName 
          };
          await AsyncStorage.setItem('userData', JSON.stringify(updated));
          setUserData(updated);
        }
        setShowEditProfile(false);
        Alert.alert('Success', 'Name updated successfully');
      } else {
        Alert.alert('Error', response.message || 'Failed to update name');
      }
    } catch (error) {
      console.error('Error saving name:', error);
      Alert.alert('Error', 'Failed to save name');
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatSinceMinutes = (iso: string) => {
    const d = new Date(iso).getTime();
    const diff = Date.now() - d;
    const mins = Math.max(0, Math.floor(diff / 60000));
    return `${mins} min ago`;
  };

  const toOrderFilterGroup = (status: SqlOrderStatus, pickedUpAt?: string | null): 'ACTIVE' | 'READY' | 'COMPLETED' | 'CANCELLED' => {
    const s = status?.toUpperCase() || '';
    if (s === 'COMPLETED' || s === 'SERVED' || s === 'DELIVERED') return 'COMPLETED';
    if (s === 'CANCELLED') return 'CANCELLED';
    if (s === 'READY') return 'READY';
    // PENDING, KITCHEN_ACCEPTED, PREPARING, PICKED_UP all go to ACTIVE
    return 'ACTIVE';
  };

  const getOrderStatusPill = (status: SqlOrderStatus) => {
    const s = status?.toUpperCase() || '';
    if (s === 'READY') return { label: 'Ready', bg: '#2BC48A', fg: '#FFFFFF' };
    if (s === 'PREPARING' || s === 'KITCHEN_ACCEPTED') return { label: 'Cooking', bg: '#FF9F43', fg: '#FFFFFF' };
    if (s === 'PENDING') return { label: 'Urgent', bg: '#FF4D4D', fg: '#FFFFFF' };
    if (s === 'PICKED_UP') return { label: 'Picked Up', bg: '#6C63FF', fg: '#FFFFFF' };
    if (s === 'COMPLETED') return { label: 'Completed', bg: '#8E8E93', fg: '#FFFFFF' };
    if (s === 'CANCELLED') return { label: 'Cancelled', bg: '#FF4D4D', fg: '#FFFFFF' };
    return { label: 'Active', bg: '#6C63FF', fg: '#FFFFFF' };
  };

  const getOrderTypePill = (type: SqlOrderType) => {
    if (type === 'DINE_IN') return { label: 'Dine-in', bg: 'rgba(255,122,89,0.14)', fg: '#FF7A59' };
    if (type === 'TAKEAWAY') return { label: 'Takeaway', bg: 'rgba(108,99,255,0.14)', fg: '#6C63FF' };
    return { label: 'Delivery', bg: 'rgba(43,196,138,0.14)', fg: '#2BC48A' };
  };

  const openEditOrder = (order: SqlOrder) => {
    if (['COMPLETED', 'CANCELLED'].includes(order.status)) {
      Alert.alert('Cannot Edit', 'This order is already completed or cancelled.');
      return;
    }
    // @ts-ignore
    navigation.navigate('EditOrder', { orderId: order.id });
  };

  const pickUpOrder = async (orderId: string) => {
    try {
      const response = await api.put(`/orders/${orderId}/status`, { 
        status: 'PICKED_UP',
        picked_up_at: new Date().toISOString()
      });
      if (response.success) {
        // Get the order and update its status locally before showing modal
        const order = orders.find(o => o.id === orderId);
        if (order) {
          // Update the order status locally
          order.status = 'PICKED_UP';
          setSelectedOrderForBill({...order, status: 'PICKED_UP'} as SqlOrder);
          setShowBillModal(true);
        }
        // Refresh data in background
        loadDashboardData();
      } else {
        Alert.alert('Error', response.message || 'Failed to update order');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update order');
    }
  };

  const cancelOrder = async (orderId: string, reason?: string) => {
    try {
      const response = await api.patch(`/orders/${orderId}/status`, { 
        status: 'CANCELLED',
        reason: reason || 'Cancelled by waiter'
      });
      if (response.success) {
        await loadDashboardData();
      } else {
        Alert.alert('Error', response.message || 'Failed to cancel order');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to cancel order');
    }
  };

  const handleOrderStatusChange = async (orderId: string, status: string) => {
    if (status === 'cancelled') {
      Alert.alert(
        'Cancel Order',
        'Are you sure you want to cancel this order?',
        [
          { text: 'No', style: 'cancel' },
          { 
            text: 'Yes, Cancel', 
            style: 'destructive',
            onPress: () => cancelOrder(orderId)
          }
        ]
      );
    } else if (status === 'picked_up' || status === 'served') {
      await pickUpOrder(orderId);
    } else {
      // Handle other status changes
      try {
        const response = await api.put(`/orders/${orderId}/status`, { status });
        if (response.success) {
          await loadDashboardData();
        } else {
          Alert.alert('Error', response.message || 'Failed to update order');
        }
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Failed to update order');
      }
    }
  };

  // Handle item status change - for returning items
  const handleItemStatusChange = async (orderId: string, itemId: string, status: 'PREPARING' | 'READY' | 'SERVED' | 'RETURNED', reason?: string) => {
    try {
      const response = await api.patch(`/orders/${orderId}/items/${itemId}/status`, { status, reason });
      if (response.success) {
        await loadDashboardData();
        if (status === 'RETURNED') {
          Alert.alert('Success', 'Item returned successfully');
        }
      } else {
        Alert.alert('Error', response.message || 'Failed to update item status');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update item status');
    }
  };

  const StatCard = ({ color, value, label, sublabel, onPress }: { color: string; value: number; label: string; sublabel?: string; onPress?: () => void }) => (
    <TouchableOpacity activeOpacity={0.9} style={[styles.statCardNew, { backgroundColor: color }]} onPress={onPress}>
      <Text style={styles.statValueNew}>{value}</Text>
      <Text style={styles.statLabelNew}>{label}</Text>
      {sublabel && <Text style={styles.statSublabelNew}>{sublabel}</Text>}
    </TouchableOpacity>
  );

  const renderHome = () => {
    const activeOrders = orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
    const readyOrders = orders.filter(o => o.status === 'READY');
    const filteredHomeOrders = orders
      .filter(o => toOrderFilterGroup(o.status, o.picked_up_at) === orderFilter)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return (
      <View style={{ flex: 1 }}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === 'android' ? 70 : 60) + 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.statsRowNew}>
          <StatCard 
            color="#FF7A59" 
            value={(stats as any)?.active_orders ?? activeOrders.length} 
            label="New Orders" 
            sublabel="Active"
            onPress={() => {
              setOrderFilter('ACTIVE');
              setActiveTab('orders');
            }}
          />
          <StatCard 
            color="#2BC48A" 
            value={(stats as any)?.ready_to_serve ?? readyOrders.length} 
            label="Ready" 
            sublabel="To Serve"
            onPress={() => {
              setOrderFilter('READY');
              setActiveTab('orders');
            }}
          />
          <StatCard 
            color="#FF4D4D" 
            value={orders.filter(o => o.status === 'PENDING').length} 
            label="Pending" 
            sublabel="Urgent"
            onPress={() => {
              setOrderFilter('ACTIVE');
              setActiveTab('orders');
            }}
          />
        </View>

          <View style={styles.sectionNew}>
          <Text style={styles.sectionTitleNew}>Orders Queue</Text>
          
          <View style={styles.segmentedRow}>
            {[
              { id: 'ACTIVE', label: 'Active' },
              { id: 'READY', label: 'Ready' },
              { id: 'COMPLETED', label: 'Completed' },
              { id: 'CANCELLED', label: 'Cancelled' },
            ].map(seg => {
              const selected = orderFilter === (seg.id as any);
              return (
                <TouchableOpacity
                  key={seg.id}
                  style={[styles.segmentBtn, selected && styles.segmentBtnActive]}
                  onPress={() => setOrderFilter(seg.id as any)}
                >
                  <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>{seg.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {filteredHomeOrders.length === 0 ? (
            <View style={styles.emptyStateNew}>
              <Text style={styles.emptyTitleNew}>No orders</Text>
              <Text style={styles.emptySubNew}>Pull down to refresh or create a new order</Text>
            </View>
          ) : (
            filteredHomeOrders.slice(0, 5).map((o, idx) => (
              <View key={`home-${o.id}-${idx}`} style={{ marginBottom: 12 }}>
                <OrderCard
                  order={{
                    id: o.id,
                    orderNumber: o.order_number,
                    status: String(o.status || 'PENDING').toLowerCase() as any,
                    orderType: o.order_type,
                    tableNumber: o.table_number || undefined,
                    items: o.items.map(item => ({
                      id: item.id,
                      _id: item.id,
                      quantity: Number(item.quantity) || 1,
                      status: item.status,
                      product: {
                        name: item.product_name,
                        image: item.image,
                      }
                    })) as any,
                    createdAt: o.created_at,
                    specialInstructions: o.special_instructions || undefined,
                    totalAmount: o.total_amount,
                  }}
                  onStatusChange={async (orderId, status) => {
                    try {
                      await handleOrderStatusChange(orderId, status);
                    } catch (e: any) {
                      Alert.alert('Error', e?.message || 'Failed to update order');
                    }
                  }}
                  onItemStatusChange={handleItemStatusChange}
                  role="WAITER"
                  showPayment={true}
                  showActions={o.status === 'READY'}
                />
                {/* Generate Bill button - show for PICKED_UP orders AND all items SERVED */}
                {['PICKED_UP', 'picked_up', 'Picked_Up', 'PICKED-UP'].includes(o.status) && 
                 (o.items?.every((item: any) => item.status === 'SERVED') ?? true) && (
                  <TouchableOpacity
                    style={{
                      marginTop: 8,
                      backgroundColor: DESIGN.colors.green,
                      borderRadius: 12,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onPress={() => {
                      setSelectedOrderForBill(o);
                      setShowBillModal(true);
                    }}
                  >
                    <Ionicons name="receipt-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Generate Bill</Text>
                  </TouchableOpacity>
                )}
                {/* Show warning if some items not served yet */}
                {['PICKED_UP', 'picked_up', 'Picked_Up', 'PICKED-UP'].includes(o.status) && 
                 !(o.items?.every((item: any) => item.status === 'SERVED') ?? true) && (
                  <View style={{
                    marginTop: 8,
                    backgroundColor: '#FFF3CD',
                    borderRadius: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}>
                    <Ionicons name="warning-outline" size={18} color="#856404" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#856404', fontWeight: '600', fontSize: 13 }}>
                      {o.items?.filter((item: any) => item.status !== 'SERVED').length || 0} item(s) pending from kitchen
                    </Text>
                  </View>
                )}
                {/* Edit button - allow adding items until payment succeeds (blocked only for COMPLETED/CANCELLED) */}
                {!['COMPLETED', 'CANCELLED'].includes(o.status) && (
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      backgroundColor: DESIGN.colors.orange,
                      borderRadius: 16,
                      width: 32,
                      height: 32,
                      justifyContent: 'center',
                      alignItems: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 4,
                      elevation: 4,
                    }}
                    onPress={() => openEditOrder(o)}
                  >
                    <Ionicons name="pencil" size={16} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
          </View>
        </ScrollView>

        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + (Platform.OS === 'android' ? 80 : 70) }]}
          onPress={openNewOrder}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderOrders = () => {
    // If we have a selected order, scroll to it or highlight it
    const selectedOrder = selectedOrderId ? orders.find(o => o.id === selectedOrderId) : null;
    
    const filteredOrders = orders
      .filter(o => toOrderFilterGroup(o.status, o.picked_up_at) === orderFilter)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return (
      <View style={{ flex: 1 }}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === 'android' ? 70 : 60) + 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionNew}>
          <Text style={styles.sectionTitleNew}>Orders Queue</Text>

          <View style={styles.segmentedRow}>
            {[
              { id: 'ACTIVE', label: 'Active' },
              { id: 'READY', label: 'Ready' },
              { id: 'COMPLETED', label: 'Completed' },
              { id: 'CANCELLED', label: 'Cancelled' },
            ].map(seg => {
              const selected = orderFilter === (seg.id as any);
              return (
                <TouchableOpacity
                  key={seg.id}
                  style={[styles.segmentBtn, selected && styles.segmentBtnActive]}
                  onPress={() => {
                    setOrderFilter(seg.id as any);
                    setSelectedOrderId(null); // Clear selection when filter changes
                  }}
                >
                  <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>{seg.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {filteredOrders.length === 0 ? (
            <View style={styles.emptyStateNew}>
              <Text style={styles.emptyTitleNew}>No orders</Text>
              <Text style={styles.emptySubNew}>Pull down to refresh or create a new order</Text>
            </View>
          ) : (
            filteredOrders.map((o, idx) => (
              <View 
                key={`orders-${o.id}-${idx}`} 
                style={{ 
                  marginBottom: 12,
                  borderWidth: selectedOrderId === o.id ? 2 : 0,
                  borderColor: DESIGN.colors.orange,
                  borderRadius: 16,
                  backgroundColor: selectedOrderId === o.id ? DESIGN.colors.orange + '10' : 'transparent',
                }}
              >
                <OrderCard
                  order={{
                    id: o.id,
                    orderNumber: o.order_number,
                    status: o.status.toLowerCase() as any,
                    orderType: o.order_type,
                    tableNumber: o.table_number || undefined,
                    items: o.items.map(item => ({
                      id: item.id,
                      _id: item.id,
                      quantity: Number(item.quantity) || 1,
                      status: item.status,
                      product: {
                        name: item.product_name,
                        image: item.image,
                      }
                    })) as any,
                    createdAt: o.created_at,
                    specialInstructions: o.special_instructions || undefined,
                    totalAmount: o.total_amount,
                  }}
                  onStatusChange={async (orderId, status) => {
                    try {
                      await handleOrderStatusChange(orderId, status);
                    } catch (e: any) {
                      Alert.alert('Error', e?.message || 'Failed to update order');
                    }
                  }}
                  onItemStatusChange={handleItemStatusChange}
                  role="WAITER"
                  showPayment={true}
                  showActions={o.status === 'READY'}
                />
                {/* Generate Bill button - show for PICKED_UP orders AND all items SERVED */}
                {['PICKED_UP', 'picked_up', 'Picked_Up', 'PICKED-UP'].includes(o.status) && 
                 (o.items?.every((item: any) => item.status === 'SERVED') ?? true) && (
                  <TouchableOpacity
                    style={{
                      marginTop: 8,
                      backgroundColor: DESIGN.colors.green,
                      borderRadius: 12,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onPress={() => {
                      setSelectedOrderForBill(o);
                      setShowBillModal(true);
                    }}
                  >
                    <Ionicons name="receipt-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Generate Bill</Text>
                  </TouchableOpacity>
                )}
                {/* Show warning if some items not served yet */}
                {['PICKED_UP', 'picked_up', 'Picked_Up', 'PICKED-UP'].includes(o.status) && 
                 !(o.items?.every((item: any) => item.status === 'SERVED') ?? true) && (
                  <View style={{
                    marginTop: 8,
                    backgroundColor: '#FFF3CD',
                    borderRadius: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}>
                    <Ionicons name="warning-outline" size={18} color="#856404" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#856404', fontWeight: '600', fontSize: 13 }}>
                      {o.items?.filter((item: any) => item.status !== 'SERVED').length || 0} item(s) pending from kitchen
                    </Text>
                  </View>
                )}
                {/* Edit button - allow adding items until payment succeeds (blocked only for COMPLETED/CANCELLED) */}
                {!['COMPLETED', 'CANCELLED'].includes(o.status) && (
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      backgroundColor: DESIGN.colors.orange,
                      borderRadius: 16,
                      width: 32,
                      height: 32,
                      justifyContent: 'center',
                      alignItems: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 4,
                      elevation: 4,
                    }}
                    onPress={() => openEditOrder(o)}
                  >
                    <Ionicons name="pencil" size={16} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + (Platform.OS === 'android' ? 80 : 70) }]}
        onPress={openNewOrder}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
    );
  };

  const renderTables = () => {
    const getTableStatusPill = (status: string) => {
      if (status === 'AVAILABLE') return { bg: 'rgba(43,196,138,0.15)', fg: '#2BC48A', label: 'Available' };
      if (status === 'OCCUPIED') return { bg: 'rgba(255,122,89,0.15)', fg: '#FF7A59', label: 'Occupied' };
      if (status === 'RESERVED') return { bg: 'rgba(108,99,255,0.15)', fg: '#6C63FF', label: 'Reserved' };
      if (status === 'CLEANING') return { bg: 'rgba(255,179,71,0.15)', fg: '#FFB347', label: 'Cleaning' };
      return { bg: 'rgba(160,160,160,0.15)', fg: '#777', label: status };
    };

    return (
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === 'android' ? 70 : 60) + 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.sectionNew}>
          <Text style={styles.sectionTitleNew}>My Tables</Text>
          <Text style={styles.sectionTitleNew}>Tables assigned to you</Text>
        </View>

        {tables.length === 0 ? (
          <View style={styles.emptyStateNew}>
            <Ionicons name="restaurant-outline" size={48} color="#ccc" />
            <Text style={styles.emptyTitleNew}>No tables assigned</Text>
            <Text style={styles.emptySubNew}>You don't have any tables assigned yet.</Text>
          </View>
        ) : (
          <View style={styles.tablesGridNew}>
            {tables.map(table => {
              const pill = getTableStatusPill(table.status);
              return (
                <View key={table.id} style={styles.tableCardNew}>
                  <View style={styles.tableCardTopRow}>
                    <View style={styles.tableTitleRow}>
                      <Ionicons name="restaurant" size={16} color="#FF7A59" />
                      <Text style={styles.tableTitleText}>Table {table.table_number}</Text>
                    </View>
                    <View style={[styles.pill, { backgroundColor: pill.bg }]}>
                      <Text style={[styles.pillText, { color: pill.fg }]}>{pill.label}</Text>
                    </View>
                  </View>

                  <Text style={styles.tableMetaNew}>Capacity: {table.seating_capacity}</Text>
                  {table.section && <Text style={styles.tableMetaNew}>Section: {table.section}</Text>}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderMenu = () => (
    <ScrollView
      style={styles.content}
      contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === 'android' ? 70 : 60) + 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: DESIGN.colors.darkText, marginBottom: 16 }}>
          Menu
        </Text>
        
        {/* Quick Add Order Button */}
        <TouchableOpacity
          style={{
            backgroundColor: DESIGN.colors.orange,
            borderRadius: 16,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
          onPress={openNewOrder}
          activeOpacity={0.9}
        >
          <Ionicons name="add-circle" size={24} color={DESIGN.colors.white} />
          <Text style={{ color: DESIGN.colors.white, fontWeight: '800', fontSize: 16, marginLeft: 8 }}>
            New Order
          </Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 14, color: DESIGN.colors.muted, textAlign: 'center', marginTop: 20 }}>
          Tap "New Order" to browse menu and place orders
        </Text>
      </View>
    </ScrollView>
  );

  const renderProfile = () => {
    // Handle sub-screens
    if (profileSubScreen === 'payment') {
      return <PaymentHistoryScreen onBack={() => setProfileSubScreen('main')} />;
    }
    if (profileSubScreen === 'password') {
      return <ChangePasswordScreen onBack={() => setProfileSubScreen('main')} userData={userData} api={api} />;
    }

    // Main profile screen
    return (
    <ScrollView
      style={styles.content}
      contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === 'android' ? 70 : 60) + 16 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.sectionNew}>
        <View style={styles.profileHeader}>
          <TouchableOpacity style={styles.profileAvatarLarge} onPress={pickProfileImage}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileAvatarImage} />
            ) : (
              <Ionicons name="person" size={40} color="#fff" />
            )}
            <View style={styles.profileAvatarBadge}>
              <Ionicons name="camera" size={12} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.profileName}>{waiterName}</Text>
          <Text style={styles.profileRole}>Waiter</Text>
        </View>

        <View style={styles.profileMenu}>
          <TouchableOpacity style={styles.profileMenuItem} onPress={openEditProfile}>
            <Ionicons name="person-outline" size={20} color={DESIGN.colors.muted} />
            <Text style={styles.profileMenuText}>Change Name</Text>
            <Ionicons name="chevron-forward" size={16} color="#bbb" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileMenuItem} onPress={pickProfileImage}>
            <Ionicons name="image-outline" size={20} color={DESIGN.colors.muted} />
            <Text style={styles.profileMenuText}>Change Profile Image</Text>
            <Ionicons name="chevron-forward" size={16} color="#bbb" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileMenuItem} onPress={handleChangePassword}>
            <Ionicons name="lock-closed-outline" size={20} color={DESIGN.colors.muted} />
            <Text style={styles.profileMenuText}>Change Password</Text>
            <Ionicons name="chevron-forward" size={16} color="#bbb" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileMenuItem} onPress={openPaymentHistory}>
            <Ionicons name="wallet-outline" size={20} color={DESIGN.colors.muted} />
            <Text style={styles.profileMenuText}>Payment History</Text>
            <Ionicons name="chevron-forward" size={16} color="#bbb" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileMenuItem} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={DESIGN.colors.red} />
            <Text style={[styles.profileMenuText, { color: DESIGN.colors.red }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
  };

  return (
    <View
      style={{
        flex: 1,
        paddingTop: insets.top,
        paddingLeft: insets.left,
        paddingRight: insets.right,
        backgroundColor: DESIGN.colors.lightBg,
      }}
    >
      <StatusBar barStyle="dark-content" backgroundColor={DESIGN.colors.white} />

      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.headerTitleNew}>Waiter</Text>
          <View style={styles.headerIconsRow}>
            <TouchableOpacity style={styles.headerIconBtn} onPress={handleNotifications}>
              <Ionicons name="notifications-outline" size={22} color={DESIGN.colors.darkText} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatar} onPress={() => setActiveTab('profile')}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.headerBottomRow}>
          <View style={styles.shiftRow}>
            <Text style={styles.shiftText}>On Shift</Text>
            <Switch
              value={onShift}
              onValueChange={setOnShift}
              trackColor={{ false: DESIGN.colors.muted, true: DESIGN.colors.orange }}
              thumbColor={DESIGN.colors.white}
            />
          </View>
          <Text style={styles.waiterNameText}>{waiterName}</Text>
        </View>
      </View>

      {activeTab === 'home' && renderHome()}
      {activeTab === 'orders' && renderOrders()}
      {activeTab === 'notifications' && <NotificationHistoryScreen onBack={() => setActiveTab('home')} />}
      {activeTab === 'profile' && renderProfile()}

      <View
        style={[
          styles.bottomTabs,
          {
            height: (Platform.OS === 'android' ? 70 : 60) + insets.bottom,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        {[
          { id: 'home', icon: 'home-outline', label: 'Home' },
          { id: 'orders', icon: 'document-text-outline', label: 'Orders' },
          { id: 'notifications', icon: 'notifications-outline', label: 'Alerts' },
          { id: 'profile', icon: 'person-outline', label: 'Profile' },
        ].map(tab => {
          const isActive = activeTab === (tab.id as any);
          return (
            <TouchableOpacity key={tab.id} style={styles.bottomTabItem} onPress={() => setActiveTab(tab.id as any)}>
              <Ionicons name={tab.icon as any} size={24} color={isActive ? DESIGN.colors.orange : DESIGN.colors.muted} />
              <Text style={[styles.bottomTabText, isActive && styles.bottomTabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Modal visible={showEditProfile} transparent animationType="fade" onRequestClose={() => setShowEditProfile(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Change Name</Text>
              <TouchableOpacity onPress={() => setShowEditProfile(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={DESIGN.colors.darkText} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Your Name</Text>
              <TextInput
                style={styles.textInput}
                value={editDisplayName}
                onChangeText={setEditDisplayName}
                placeholder="Enter your name"
                placeholderTextColor={DESIGN.colors.muted}
              />
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowEditProfile(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={saveProfile}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showNotifications} transparent animationType="fade" onRequestClose={() => setShowNotifications(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: '70%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Recent Notifications</Text>
              <TouchableOpacity onPress={() => setShowNotifications(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={DESIGN.colors.darkText} />
              </TouchableOpacity>
            </View>
            
            {recentNotifications.length === 0 ? (
              <View style={styles.emptyNotifications}>
                <Ionicons name="notifications-off-outline" size={48} color={DESIGN.colors.muted} />
                <Text style={styles.emptyText}>No new notifications</Text>
              </View>
            ) : (
              <>
                <ScrollView style={styles.notificationsList}>
                  {recentNotifications.map((notification: any) => {
                    const isUnread = !notification.isRead && !notification.is_read;
                    const relatedOrderId = notification.relatedOrder?._id || notification.relatedOrder || notification.orderId || notification.order_id || notification.data?.orderId;
                    
                    return (
                      <TouchableOpacity 
                        key={notification.id || notification._id} 
                        style={[styles.notificationItem, isUnread && styles.unreadNotification]}
                        onPress={() => {
                          setShowNotifications(false);
                          // Navigate to orders tab if notification has related order
                          if (relatedOrderId) {
                            setSelectedOrderId(relatedOrderId);
                            // Set the correct filter based on order status
                            const orderStatus = notification.relatedOrder?.status;
                            if (orderStatus === 'DELIVERED' || orderStatus === 'COMPLETED' || orderStatus === 'SERVED') {
                              setOrderFilter('COMPLETED');
                            } else if (orderStatus === 'READY' || orderStatus === 'READY_TO_PICKUP') {
                              setOrderFilter('READY');
                            } else {
                              setOrderFilter('ACTIVE');
                            }
                            setActiveTab('orders');
                          }
                        }}
                      >
                        <View style={styles.notificationIcon}>
                          <Ionicons 
                            name={notification.type === 'NEW_ORDER' ? 'bag-outline' : 
                                  notification.type === 'ORDER_READY' ? 'checkmark-circle-outline' : 
                                  'notifications-outline'} 
                            size={20} 
                            color={DESIGN.colors.orange} 
                          />
                        </View>
                        <View style={styles.notificationContent}>
                          <Text style={styles.notificationTitle}>{notification.title || 'Notification'}</Text>
                          <Text style={styles.notificationMessage} numberOfLines={2}>{notification.message || notification.body}</Text>
                          <Text style={styles.notificationTime}>
                            {new Date(notification.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity 
                  style={styles.viewAllBtn} 
                  onPress={() => {
                    setShowNotifications(false);
                    setActiveTab('notifications');
                  }}
                >
                  <Text style={styles.viewAllText}>View All Notifications</Text>
                  <Ionicons name="chevron-forward" size={16} color={DESIGN.colors.orange} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Bill/Invoice Modal */}
      <Modal visible={showBillModal} transparent animationType="slide" onRequestClose={() => setShowBillModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Order Bill</Text>
              <TouchableOpacity onPress={() => setShowBillModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={DESIGN.colors.darkText} />
              </TouchableOpacity>
            </View>
            
            {selectedOrderForBill && (
              <ScrollView style={styles.billContent}>
                <View style={styles.billSection}>
                  <Text style={styles.billOrderNumber}>{selectedOrderForBill.order_number}</Text>
                  <Text style={styles.billLabel}>Order Type: {selectedOrderForBill.order_type}</Text>
                  {selectedOrderForBill.table_number && (
                    <Text style={styles.billLabel}>Table: {selectedOrderForBill.table_number}</Text>
                  )}
                </View>

                <View style={styles.billDivider} />

                <Text style={styles.billSectionTitle}>Items</Text>
                {selectedOrderForBill.items.map((item: any, idx: number) => (
                  <View key={idx} style={styles.billItemRow}>
                    <Text style={styles.billItemName}>{item.product_name || item.name}</Text>
                    <Text style={styles.billItemQty}>x{item.quantity}</Text>
                    <Text style={styles.billItemPrice}>${Number(item.total_price || item.price || 0).toFixed(2)}</Text>
                  </View>
                ))}

                <View style={styles.billDivider} />

                <View style={styles.billTotalRow}>
                  <Text style={styles.billTotalLabel}>Total</Text>
                  <Text style={styles.billTotalAmount}>${Number(selectedOrderForBill.total_amount || 0).toFixed(2)}</Text>
                </View>

                <View style={styles.billDivider} />

                {/* Payment Method Selection */}
                <Text style={styles.billSectionTitle}>Payment Method</Text>
                <View style={styles.paymentMethodsRow}>
                  {[
                    { id: 'CASH', label: 'Cash', icon: 'cash-outline' },
                    { id: 'CARD', label: 'Card', icon: 'card-outline' },
                    { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: 'wallet-outline' },
                  ].map(method => (
                    <TouchableOpacity
                      key={method.id}
                      style={[
                        styles.paymentMethodBtn,
                        selectedPaymentMethod === method.id && styles.paymentMethodBtnSelected
                      ]}
                      onPress={() => setSelectedPaymentMethod(method.id)}
                    >
                      <Ionicons 
                        name={method.icon as any} 
                        size={20} 
                        color={selectedPaymentMethod === method.id ? '#fff' : DESIGN.colors.darkText} 
                      />
                      <Text style={[
                        styles.paymentMethodText,
                        selectedPaymentMethod === method.id && styles.paymentMethodTextSelected
                      ]}>
                        {method.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.billActions}>
                  <TouchableOpacity
                    style={styles.billCloseBtn}
                    onPress={handlePrintInvoice}
                  >
                    <Text style={styles.billCloseBtnText}>Print</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.billPayBtn, !selectedPaymentMethod && { opacity: 0.5 }]}
                    disabled={!selectedPaymentMethod}
                    onPress={async () => {
                      if (!selectedPaymentMethod) {
                        Alert.alert('Error', 'Please select a payment method');
                        return;
                      }
                      try {
                        // Update order with payment info and complete
                        const response = await api.put(`/orders/${selectedOrderForBill.id}/status`, { 
                          status: 'COMPLETED',
                          paymentMethod: selectedPaymentMethod,
                          paymentStatus: 'SUCCESS'
                        });
                        if (response.success) {
                          setShowBillModal(false);
                          setSelectedOrderForBill(null);
                          setSelectedPaymentMethod(null);
                          await loadDashboardData();
                          Alert.alert('Success', `Payment received via ${selectedPaymentMethod}. Order completed!`);
                        }
                      } catch (e: any) {
                        Alert.alert('Error', e?.message || 'Failed to complete order');
                      }
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.billPayBtnText}>Confirm Payment & Complete</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.billCloseBtn}
                    onPress={() => {
                      setShowBillModal(false);
                      setSelectedPaymentMethod(null);
                    }}
                  >
                    <Text style={styles.billCloseBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DESIGN.colors.lightBg,
  },
  fab: {
    position: 'absolute',
    right: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: DESIGN.colors.orange,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: DESIGN.spacing.pagePad,
    paddingBottom: 16,
    backgroundColor: DESIGN.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN.colors.border,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  waiterNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN.colors.darkText,
  },
  headerTitleRow: {
    marginBottom: 8,
  },
  headerControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: DESIGN.colors.white,
  },
  headerTitleNew: {
    fontSize: 24,
    fontWeight: '800',
    color: DESIGN.colors.darkText,
  },
  shiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shiftText: {
    fontSize: 14,
    color: DESIGN.colors.darkText,
    fontWeight: '600',
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DESIGN.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DESIGN.colors.border,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DESIGN.colors.orange,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  content: {
    flex: 1,
    paddingHorizontal: DESIGN.spacing.pagePad,
  },
  branchRow: {
    marginTop: 12,
  },
  branchLabel: {
    fontSize: 14,
    color: DESIGN.colors.darkText,
    fontWeight: '500',
    marginBottom: 8,
  },
  branchSelectFake: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: DESIGN.colors.border,
    backgroundColor: DESIGN.colors.white,
  },
  branchSelectText: {
    fontSize: 14,
    color: DESIGN.colors.darkText,
    fontWeight: '400',
  },
  statsRowNew: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  statCardNew: {
    width: (width - (DESIGN.spacing.pagePad * 2) - 16) / 3,
    borderRadius: 16,
    padding: 12,
    paddingTop: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statValueNew: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  statLabelNew: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginTop: 4,
    opacity: 0.95,
  },
  sectionNew: {
    marginTop: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleNew: {
    fontSize: 16,
    fontWeight: '800',
    color: DESIGN.colors.darkText,
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: '500',
    color: DESIGN.colors.orange,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: DESIGN.colors.border,
    marginTop: 8,
    marginBottom: 12,
  },
  orderCardNew: {
    backgroundColor: DESIGN.colors.white,
    borderRadius: DESIGN.radius.card,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  orderMetaLeft: {
    flex: 1,
    paddingRight: 10,
  },
  orderNumberNew: {
    fontSize: 14,
    fontWeight: '800',
    color: DESIGN.colors.darkText,
    marginBottom: 4,
  },
  orderSubNew: {
    fontSize: 12,
    color: DESIGN.colors.muted,
    fontWeight: '400',
  },
  orderSinceNew: {
    fontSize: 12,
    color: DESIGN.colors.muted,
    fontWeight: '400',
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  orderItemsNew: {
    marginBottom: 10,
  },
  emptyStateNew: {
    backgroundColor: DESIGN.colors.lightBg,
    borderRadius: DESIGN.radius.card,
    padding: 24,
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitleNew: {
    fontSize: 14,
    fontWeight: '800',
    color: DESIGN.colors.darkText,
    marginTop: 8,
  },
  emptySubNew: {
    fontSize: 12,
    fontWeight: '400',
    color: DESIGN.colors.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  bottomTabs: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: DESIGN.colors.white,
    borderTopWidth: 1,
    borderTopColor: DESIGN.colors.border,
  },
  bottomTabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    paddingBottom: 4,
  },
  bottomTabText: {
    fontSize: 12,
    color: DESIGN.colors.muted,
    fontWeight: '400',
    marginTop: 2,
  },
  bottomTabTextActive: {
    color: DESIGN.colors.orange,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  segmentedRow: {
    flexDirection: 'row',
    backgroundColor: DESIGN.colors.white,
    borderRadius: 14,
    padding: 4,
    marginTop: 12,
    marginBottom: 12,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 12,
  },
  segmentBtnActive: {
    backgroundColor: DESIGN.colors.darkText,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '800',
    color: DESIGN.colors.muted,
  },
  segmentTextActive: {
    color: DESIGN.colors.white,
  },
  searchRow: {
    marginTop: 12,
    backgroundColor: DESIGN.colors.white,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchPlaceholder: {
    color: DESIGN.colors.muted,
    fontWeight: '700',
    fontSize: 12,
  },
  searchOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 52,
    height: 44,
    borderRadius: 14,
  },
  orderItemLineNew: {
    fontSize: 12,
    color: DESIGN.colors.darkText,
    fontWeight: '600',
    marginBottom: 3,
  },
  orderNoteBox: {
    backgroundColor: DESIGN.colors.lightBg,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  orderNoteTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  orderNoteText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  orderBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  orderAmountLabel: {
    fontSize: 12,
    color: DESIGN.colors.muted,
    fontWeight: '700',
  },
  orderAmountValue: {
    fontSize: 14,
    color: DESIGN.colors.darkText,
    fontWeight: '900',
  },
  orderActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  orderActionBtnReady: {
    backgroundColor: DESIGN.colors.orange,
  },
  orderActionBtnDisabled: {
    backgroundColor: '#eee',
  },
  orderActionText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '800',
  },
  orderActionTextDisabled: {
    color: DESIGN.colors.muted,
  },
  tablesGridNew: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  tableCardNew: {
    width: (width - 32 - 12) / 2,
    backgroundColor: DESIGN.colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  tableCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tableTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tableTitleText: {
    fontSize: 13,
    fontWeight: '900',
    color: DESIGN.colors.darkText,
  },
  tableSinceText: {
    fontSize: 11,
    color: DESIGN.colors.muted,
    fontWeight: '700',
  },
  tableBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  tableAmountText: {
    fontSize: 13,
    fontWeight: '900',
    color: DESIGN.colors.darkText,
  },
  tablePillsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tableNumberNew: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1A1A2E',
  },
  tableStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pillAvailable: {
    backgroundColor: 'rgba(43,196,138,0.15)',
  },
  pillOccupied: {
    backgroundColor: 'rgba(255,122,89,0.15)',
  },
  pillOther: {
    backgroundColor: 'rgba(108,99,255,0.15)',
  },
  tableStatusText: {
    fontSize: 11,
    fontWeight: '800',
    color: DESIGN.colors.darkText,
  },
  tableMetaNew: {
    fontSize: 12,
    color: DESIGN.colors.muted,
    fontWeight: '600',
  },
  profileHeader: {
    backgroundColor: DESIGN.colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  profileAvatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF7A59',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileNameCentered: {
    fontSize: 18,
    fontWeight: '900',
    color: DESIGN.colors.darkText,
    marginBottom: 2,
  },
  profileRoleCentered: {
    fontSize: 12,
    color: DESIGN.colors.muted,
    fontWeight: '800',
    marginBottom: 12,
  },
  profileEditBtn: {
    backgroundColor: DESIGN.colors.darkText,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  profileEditText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  },
  profileSectionCard: {
    backgroundColor: DESIGN.colors.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  profileSectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: DESIGN.colors.darkText,
    marginBottom: 6,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: DESIGN.colors.border,
  },
  profileRowIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  profileRowText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
    color: DESIGN.colors.darkText,
  },
  profileRowValue: {
    fontSize: 12,
    fontWeight: '900',
    color: DESIGN.colors.muted,
    marginRight: 6,
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
  profileLogoutBtn: {
    backgroundColor: DESIGN.colors.red,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  profileLogoutText: {
    color: DESIGN.colors.white,
    fontWeight: '800',
    fontSize: 13,
  },
  fabAdd: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'android' ? 140 : 102,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: DESIGN.colors.orange,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    backgroundColor: DESIGN.colors.white,
    borderRadius: 16,
    padding: 14,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: DESIGN.colors.darkText,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: DESIGN.colors.lightBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: DESIGN.colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  editAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  editAvatarOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  editAvatarText: {
    color: DESIGN.colors.white,
    fontWeight: '900',
    fontSize: 12,
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: DESIGN.colors.darkText,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: DESIGN.colors.lightBg,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: DESIGN.colors.darkText,
    fontWeight: '600',
  },
  inputBox: {
    backgroundColor: DESIGN.colors.lightBg,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  inputValue: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
  },
  inputOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 44,
    borderRadius: 14,
  },
  changePasswordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: DESIGN.colors.lightBg,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 2,
    marginBottom: 12,
  },
  changePasswordText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    fontWeight: '900',
    color: DESIGN.colors.darkText,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: DESIGN.colors.lightBg,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: DESIGN.colors.darkText,
    fontWeight: '900',
    fontSize: 12,
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: DESIGN.colors.darkText,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSaveText: {
    color: DESIGN.colors.white,
    fontWeight: '900',
    fontSize: 12,
  },
  statSublabelNew: {
    fontSize: 10,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  // Chef Dashboard UI Styles
  orderBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FF7A59',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  orderBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  orderTimeInfo: {
    alignItems: 'flex-end',
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
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  urgentPill: {
    backgroundColor: '#FF4D4D',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  statusPillSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusPillTextSmall: {
    fontSize: 10,
    fontWeight: '700',
  },
  expectedTime: {
    fontSize: 12,
    color: DESIGN.colors.muted,
    fontWeight: '600',
  },
  profileAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: DESIGN.colors.orange,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  emptyNotifications: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: DESIGN.colors.muted,
    marginTop: 12,
  },
  notificationsList: {
    maxHeight: 300,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN.colors.border,
  },
  unreadNotification: {
    backgroundColor: DESIGN.colors.lightBg,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DESIGN.colors.orange + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
    marginBottom: 2,
  },
  notificationMessage: {
    fontSize: 12,
    color: DESIGN.colors.muted,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 10,
    color: DESIGN.colors.muted,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: DESIGN.colors.border,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: DESIGN.colors.orange,
  },
  billContent: {
    paddingHorizontal: 16,
  },
  billSection: {
    marginBottom: 16,
  },
  billOrderNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: DESIGN.colors.darkText,
    marginBottom: 8,
  },
  billLabel: {
    fontSize: 14,
    color: DESIGN.colors.muted,
    marginBottom: 4,
  },
  billDivider: {
    height: 1,
    backgroundColor: DESIGN.colors.border,
    marginVertical: 12,
  },
  billSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
    marginBottom: 12,
  },
  billItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  billItemName: {
    flex: 1,
    fontSize: 14,
    color: DESIGN.colors.darkText,
  },
  billItemQty: {
    fontSize: 12,
    color: DESIGN.colors.muted,
    marginHorizontal: 12,
  },
  billItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN.colors.darkText,
  },
  billTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  billTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
  },
  billTotalAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: DESIGN.colors.orange,
  },
  billActions: {
    marginTop: 20,
    paddingBottom: 20,
  },
  billPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DESIGN.colors.green,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  billPayBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 8,
  },
  billCloseBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  billCloseBtnText: {
    fontSize: 14,
    color: DESIGN.colors.muted,
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  paymentMethodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: DESIGN.colors.lightBg,
    borderWidth: 1,
    borderColor: DESIGN.colors.border,
  },
  paymentMethodBtnSelected: {
    backgroundColor: DESIGN.colors.green,
    borderColor: DESIGN.colors.green,
  },
  paymentMethodText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN.colors.darkText,
  },
  paymentMethodTextSelected: {
    color: '#fff',
  },
});
