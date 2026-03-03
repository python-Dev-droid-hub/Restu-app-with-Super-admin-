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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';
import { CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const [activeTab, setActiveTab] = useState<'home' | 'orders' | 'tables' | 'profile'>('home');
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
  const loadingRef = React.useRef(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    const POLL_MS = 8000;
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
          const userData = JSON.parse(userDataRaw);
          setWaiterName(userData?.display_name || userData?.name || 'Waiter');
          setCurrentBranch(userData?.branch_name || userData?.assigned_branch_name || 'My Branch');
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

      const ordersResponse = await api.get('/orders/waiter/my-orders');
      if (ordersResponse.success && ordersResponse.data) {
        const rawOrders = ordersResponse.data.orders || [];
        const formattedOrders: SqlOrder[] = rawOrders.map((order: any) => {
          const id = order.id || order._id;
          const createdAt = order.created_at || order.createdAt;
          const orderNumber = order.order_number || order.orderNumber || `ORD-${String(id).slice(-6).toUpperCase()}`;
          const status = (order.status || 'PENDING') as SqlOrderStatus;
          const orderType = (order.order_type || order.orderType || 'DINE_IN') as SqlOrderType;
          const itemsRaw = order.items || order.orderItems || [];
          const items: SqlOrderItem[] = itemsRaw.map((item: any) => ({
            id: item.id || item._id || `${id}-${item.product_id || item.productId || item.product_name || item.productName}`,
            product_name: item.product_name || item.productName || 'Item',
            size_name: item.size_name || item.sizeName || null,
            quantity: item.quantity || 1,
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

        const activeOrders = formattedOrders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
        const readyToServe = formattedOrders.filter(o => o.status === 'READY');
        setStats(prev => ({
          active_orders: prev.active_orders || activeOrders.length,
          ready_to_serve: prev.ready_to_serve || readyToServe.length,
          served_today: prev.served_today,
        }));
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
    try {
      (navigation as any).navigate('ChangePassword');
    } catch {
      Alert.alert('Change Password', 'This action is not available yet.');
    }
  };

  const handleNotifications = () => {
    Alert.alert('Notifications', 'Notifications screen can be added next.');
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

  const saveProfile = async () => {
    const nextName = editDisplayName.trim();
    if (!nextName) {
      Alert.alert('Invalid Name', 'Please enter a name.');
      return;
    }

    setWaiterName(nextName);
    try {
      const userDataRaw = await AsyncStorage.getItem('userData');
      if (userDataRaw) {
        const userData = JSON.parse(userDataRaw);
        const updated = { ...userData, display_name: nextName, name: nextName };
        await AsyncStorage.setItem('userData', JSON.stringify(updated));
      }
    } catch {
      // ignore
    }
    setShowEditProfile(false);
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
    if (status === 'COMPLETED') return 'COMPLETED';
    if (status === 'CANCELLED') return 'CANCELLED';
    if (status === 'READY' && !pickedUpAt) return 'READY';
    if (status === 'PENDING' || status === 'KITCHEN_ACCEPTED' || status === 'PREPARING' || status === 'PICKED_UP' || status === 'DELIVERED') return 'ACTIVE';
    return 'ACTIVE';
  };

  const getOrderStatusPill = (status: SqlOrderStatus) => {
    if (status === 'READY') return { label: 'Ready', bg: '#2BC48A', fg: '#FFFFFF' };
    if (status === 'PREPARING' || status === 'KITCHEN_ACCEPTED') return { label: 'Cooking', bg: '#FF9F43', fg: '#FFFFFF' };
    if (status === 'PENDING') return { label: 'Urgent', bg: '#FF4D4D', fg: '#FFFFFF' };
    if (status === 'COMPLETED') return { label: 'Completed', bg: '#8E8E93', fg: '#FFFFFF' };
    if (status === 'CANCELLED') return { label: 'Cancelled', bg: '#FF4D4D', fg: '#FFFFFF' };
    return { label: 'Active', bg: '#6C63FF', fg: '#FFFFFF' };
  };

  const getOrderTypePill = (type: SqlOrderType) => {
    if (type === 'DINE_IN') return { label: 'Dine-in', bg: 'rgba(255,122,89,0.14)', fg: '#FF7A59' };
    if (type === 'TAKEAWAY') return { label: 'Takeaway', bg: 'rgba(108,99,255,0.14)', fg: '#6C63FF' };
    return { label: 'Delivery', bg: 'rgba(43,196,138,0.14)', fg: '#2BC48A' };
  };

  const pickUpOrder = async (orderId: string) => {
    try {
      const response = await api.put(`/orders/${orderId}/status`, { 
        status: 'PICKED_UP',
        picked_up_at: new Date().toISOString()
      });
      if (response.success) {
        await loadDashboardData();
      } else {
        Alert.alert('Error', response.message || 'Failed to update order');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update order');
    }
  };

  const StatCard = ({ color, value, label, sublabel }: { color: string; value: number; label: string; sublabel?: string }) => (
    <TouchableOpacity activeOpacity={0.9} style={[styles.statCardNew, { backgroundColor: color }]}>
      <Text style={styles.statValueNew}>{value}</Text>
      <Text style={styles.statLabelNew}>{label}</Text>
      {sublabel && <Text style={styles.statSublabelNew}>{sublabel}</Text>}
    </TouchableOpacity>
  );

  const OrderCardNew = ({ order }: { order: SqlOrder }) => {
    const tableLabel = order.table_number ? `Table ${order.table_number}` : 'Table';
    const statusPill = getOrderStatusPill(order.status);
    const isUrgent = order.status === 'PENDING';
    const isCooking = order.status === 'PREPARING' || order.status === 'KITCHEN_ACCEPTED';
    
    return (
      <View style={styles.orderCardNew}>
        {/* Header Row */}
        <View style={styles.orderTopRow}>
          <View style={styles.orderBadge}>
            <Text style={styles.orderBadgeText}>TT</Text>
          </View>
          <View style={styles.orderMetaLeft}>
            <Text style={styles.orderNumberNew}>{order.order_number}</Text>
          </View>
          <View style={styles.orderTimeInfo}>
            <Text style={styles.tableText}>{tableLabel}</Text>
            <Text style={styles.timeText}>{formatSinceMinutes(order.created_at)}</Text>
          </View>
        </View>

        {/* Status Pills */}
        <View style={styles.pillsRow}>
          {isUrgent && (
            <View style={[styles.statusPill, styles.urgentPill]}>
              <Text style={styles.statusPillText}>Urgent</Text>
            </View>
          )}
          <View style={[styles.statusPill, { backgroundColor: statusPill.bg }]}>
            <Text style={[styles.statusPillText, { color: statusPill.fg }]}>{statusPill.label}</Text>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.orderItemsNew}>
          {order.items.map((item, index) => (
            <Text key={index} style={styles.orderItemLineNew}>
              {item.quantity}x {item.product_name}
            </Text>
          ))}
        </View>

        {/* Special Instructions */}
        {!!order.special_instructions && (
          <View style={styles.orderNoteBox}>
            <Text style={styles.orderNoteTitle}>Special Instructions</Text>
            <Text style={styles.orderNoteText}>{order.special_instructions}</Text>
          </View>
        )}

        {/* Bottom Row */}
        <View style={styles.orderBottomRow}>
          <Text style={styles.expectedTime}>Expected Time: {formatTime(order.created_at)}</Text>
          <View style={[styles.statusPillSmall, { backgroundColor: statusPill.bg }]}>
            <Text style={[styles.statusPillTextSmall, { color: statusPill.fg }]}>{statusPill.label}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderHome = () => {
    const activeOrders = orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
    const readyOrders = orders.filter(o => o.status === 'READY');
    return (
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === 'android' ? 70 : 60) + 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsRowNew}>
          <StatCard 
            color="#FF7A59" 
            value={activeOrders.length} 
            label="New Orders" 
            sublabel="Active"
          />
          <StatCard 
            color="#2BC48A" 
            value={readyOrders.length} 
            label="Ready" 
            sublabel="To Serve"
          />
          <StatCard 
            color="#FF4D4D" 
            value={orders.filter(o => o.status === 'PENDING').length} 
            label="Pending" 
            sublabel="Urgent"
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

          {activeOrders.length === 0 ? (
            <View style={styles.emptyStateNew}>
              <Text style={styles.emptyTitleNew}>No orders</Text>
              <Text style={styles.emptySubNew}>Try another tab</Text>
            </View>
          ) : (
            activeOrders.slice(0, 5).map(o => <OrderCardNew key={o.id} order={o} />)
          )}
        </View>
      </ScrollView>
    );
  };

  const renderOrders = () => {
    const filteredOrders = orders
      .filter(o => toOrderFilterGroup(o.status, o.picked_up_at) === orderFilter)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return (
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
                  onPress={() => setOrderFilter(seg.id as any)}
                >
                  <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>{seg.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {filteredOrders.length === 0 ? (
            <View style={styles.emptyStateNew}>
              <Text style={styles.emptyTitleNew}>No orders</Text>
              <Text style={styles.emptySubNew}>Try another filter</Text>
            </View>
          ) : (
            filteredOrders.map(o => <OrderCardNew key={o.id} order={o} />)
          )}
        </View>
      </ScrollView>
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
                  {/* Floor number property not available in SqlRestaurantTable */}

                  <View style={styles.modalActionsRow}>
                    <TouchableOpacity
                      style={styles.modalCancelBtn}
                      onPress={() => {
                        Alert.alert('Table Actions', `Actions for Table ${table.table_number}`);
                      }}
                    >
                      <Text style={styles.modalCancelText}>View Details</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderProfile = () => (
    <ScrollView
      style={styles.content}
      contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === 'android' ? 70 : 60) + 16 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.sectionNew}>
        <View style={styles.profileHeader}>
          <TouchableOpacity style={styles.profileAvatarLarge}>
            <Ionicons name="person" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.profileNameCentered}>{waiterName}</Text>
          <Text style={styles.profileRoleCentered}>Waiter</Text>
          <TouchableOpacity
            style={styles.profileEditBtn}
            onPress={openEditProfile}
          >
            <Text style={styles.profileEditText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileSectionCard}>
          <Text style={styles.profileSectionTitle}>Performance</Text>
          <TouchableOpacity style={styles.profileRow} onPress={() => Alert.alert('Tips Summary', 'Coming soon.')}
            >
            <View style={[styles.profileRowIcon, { backgroundColor: 'rgba(255,122,89,0.18)' }]}>
              <Ionicons name="stats-chart" size={16} color="#FF7A59" />
            </View>
            <Text style={styles.profileRowText}>Tips Summary</Text>
            <Text style={styles.profileRowValue}>--</Text>
            <Ionicons name="chevron-forward" size={16} color="#bbb" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileRow} onPress={() => Alert.alert('Payment History', 'Coming soon.')}
            >
            <View style={[styles.profileRowIcon, { backgroundColor: 'rgba(108,99,255,0.18)' }]}>
              <Ionicons name="wallet" size={16} color="#6C63FF" />
            </View>
            <Text style={styles.profileRowText}>Payment History</Text>
            <Text style={styles.profileRowValue}>--</Text>
            <Ionicons name="chevron-forward" size={16} color="#bbb" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileSectionCard}>
          <Text style={styles.profileSectionTitle}>Support</Text>
          <TouchableOpacity style={styles.profileRow} onPress={() => Alert.alert('Info & Support', 'Coming soon.')}
            >
            <View style={[styles.profileRowIcon, { backgroundColor: 'rgba(43,196,138,0.18)' }]}>
              <Ionicons name="help-circle" size={16} color="#2BC48A" />
            </View>
            <Text style={styles.profileRowText}>Info & Support</Text>
            <Text style={styles.profileRowValue}></Text>
            <Ionicons name="chevron-forward" size={16} color="#bbb" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileRow} onPress={handleChangePassword}
            >
            <View style={[styles.profileRowIcon, { backgroundColor: 'rgba(160,160,160,0.18)' }]}>
              <Ionicons name="settings" size={16} color="#666" />
            </View>
            <Text style={styles.profileRowText}>Change Password</Text>
            <Text style={styles.profileRowValue}></Text>
            <Ionicons name="chevron-forward" size={16} color="#bbb" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleLogout} style={styles.profileLogoutBtn}>
          <Text style={styles.profileLogoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

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

      <View style={styles.headerNew}>
        <View style={styles.headerTopRow}>
          <Text style={styles.headerTitleNew}>Waiter</Text>
          <View style={styles.headerIconsRow}>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => setActiveTab('tables')}>
              <Ionicons name="grid-outline" size={22} color={DESIGN.colors.darkText} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconBtn} onPress={handleNotifications}>
              <Ionicons name="notifications-outline" size={22} color={DESIGN.colors.darkText} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatar} onPress={() => setActiveTab('profile')}>
              <Ionicons name="person" size={18} color="#fff" />
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
      {activeTab === 'tables' && renderTables()}
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
          { id: 'tables', icon: 'grid-outline', label: 'Tables' },
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

      <TouchableOpacity style={styles.fabAdd} onPress={openNewOrder} activeOpacity={0.9}>
        <Ionicons name="add" size={24} color={DESIGN.colors.white} />
      </TouchableOpacity>

      <Modal visible={showEditProfile} transparent animationType="fade" onRequestClose={() => setShowEditProfile(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditProfile(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={DESIGN.colors.darkText} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.editAvatarBtn}
              onPress={() => Alert.alert('Profile Image', 'Image picker can be added next.')}
              activeOpacity={0.9}
            >
              <Ionicons name="camera" size={18} color={DESIGN.colors.white} />
              <Text style={styles.editAvatarText}>Change Photo</Text>
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <View style={styles.inputBox}>
                <Text style={styles.inputValue}>{editDisplayName || ' '}</Text>
              </View>
              <TouchableOpacity
                style={styles.inputOverlay}
                onPress={() => Alert.alert('Edit Name', 'Name input can be added next.')}
              />
            </View>

            <TouchableOpacity style={styles.changePasswordBtn} onPress={handleChangePassword}>
              <Ionicons name="lock-closed" size={16} color={DESIGN.colors.darkText} />
              <Text style={styles.changePasswordText}>Change Password</Text>
              <Ionicons name="chevron-forward" size={16} color={DESIGN.colors.muted} />
            </TouchableOpacity>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DESIGN.colors.lightBg,
  },
  headerNew: {
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: DESIGN.colors.orange,
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 12,
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
});
