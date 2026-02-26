import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;
const { width } = Dimensions.get('window');

type OrderStatus = 'PENDING' | 'KITCHEN_ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';

interface OrderItem {
  id: string;
  product_name: string;
  size_name?: string | null;
  quantity: number;
  special_instructions?: string;
}

interface Order {
  id: string;
  order_number: string;
  table_id?: string;
  table_number?: string;
  status: OrderStatus;
  items: OrderItem[];
  special_instructions?: string;
  created_at: string;
  kitchen_accepted_at?: string;
  waiter_name?: string;
}

interface UserData {
  id: string;
  display_name?: string;
  assigned_branch_id?: string;
}

export default function KitchenDisplay() {
  const navigation = useNavigation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [filter, setFilter] = useState<'all' | 'KITCHEN_ACCEPTED' | 'PREPARING'>('all');

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (userData) {
      loadOrders();
      // Poll for updates every 30 seconds
      const interval = setInterval(loadOrders, 30000);
      return () => clearInterval(interval);
    }
  }, [userData]);

  const loadUserData = async () => {
    try {
      const userDataRaw = await AsyncStorage.getItem('userData');
      if (userDataRaw) {
        const user = JSON.parse(userDataRaw);
        setUserData({
          id: user.id || user._id,
          display_name: user.display_name || user.name,
          assigned_branch_id: user.assigned_branch_id || user.branch_id,
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      
      // Fetch orders with KITCHEN_ACCEPTED or PREPARING status
      const response = await api.get('/orders?status=KITCHEN_ACCEPTED,PREPARING');
      
      if (response.success && response.data) {
        const rawOrders = response.data.orders || response.data || [];
        const formattedOrders: Order[] = rawOrders.map((order: any) => {
          const id = order.id || order._id;
          const createdAt = order.created_at || order.createdAt || order.kitchen_accepted_at;
          const orderNumber = order.order_number || order.orderNumber || `ORD-${String(id).slice(-6).toUpperCase()}`;
          
          const itemsRaw = order.items || order.orderItems || [];
          const items: OrderItem[] = itemsRaw.map((item: any) => ({
            id: item.id || item._id || `${id}-${item.product_id || item.productId}`,
            product_name: item.product_name || item.productName || item.product?.name || 'Item',
            size_name: item.size_name || item.sizeName || item.size?.sizeName || null,
            quantity: item.quantity || 1,
            special_instructions: item.special_instructions || item.specialInstructions,
          }));

          return {
            id: String(id),
            order_number: String(orderNumber),
            table_id: order.table_id || order.tableId || order.table?._id,
            table_number: order.table_number || order.tableNumber || order.table?.tableNumber || '-',
            status: (order.status || 'PENDING') as OrderStatus,
            items,
            special_instructions: order.special_instructions || order.specialInstructions,
            created_at: createdAt || new Date().toISOString(),
            kitchen_accepted_at: order.kitchen_accepted_at || order.kitchenAcceptedAt,
            waiter_name: order.waiter?.display_name || order.waiter?.displayName || order.waiter_name,
          };
        });

        // Filter for kitchen orders only
        const kitchenOrders = formattedOrders.filter(
          o => o.status === 'KITCHEN_ACCEPTED' || o.status === 'PREPARING'
        );

        // Sort by kitchen_accepted_at or created_at (oldest first - most urgent)
        kitchenOrders.sort((a, b) => {
          const aTime = new Date(a.kitchen_accepted_at || a.created_at).getTime();
          const bTime = new Date(b.kitchen_accepted_at || b.created_at).getTime();
          return aTime - bTime;
        });

        setOrders(kitchenOrders);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
  };

  const calculateElapsedMinutes = (order: Order): number => {
    const startTime = order.kitchen_accepted_at || order.created_at;
    const start = new Date(startTime).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((now - start) / 60000));
  };

  const getTimeWarningColor = (minutes: number): string => {
    if (minutes >= 30) return '#FF4444'; // Red - urgent
    if (minutes >= 15) return '#FFB347'; // Orange/Yellow - warning
    return '#2BC48A'; // Green - ok
  };

  const getTimeWarningBg = (minutes: number): string => {
    if (minutes >= 30) return 'rgba(255,68,68,0.15)';
    if (minutes >= 15) return 'rgba(255,179,71,0.15)';
    return 'rgba(43,196,138,0.15)';
  };

  const markAsReady = async (orderId: string) => {
    try {
      const response = await api.put(`/orders/${orderId}/status`, {
        status: 'READY',
        ready_at: new Date().toISOString(),
      });

      if (response.success) {
        Alert.alert('Success', 'Order marked as ready!');
        loadOrders();
      } else {
        Alert.alert('Error', response.message || 'Failed to update order');
      }
    } catch (error: any) {
      console.error('Error marking order as ready:', error);
      Alert.alert('Error', error?.message || 'Failed to update order');
    }
  };

  const startPreparing = async (orderId: string) => {
    try {
      const response = await api.put(`/orders/${orderId}/status`, {
        status: 'PREPARING',
      });

      if (response.success) {
        loadOrders();
      } else {
        Alert.alert('Error', response.message || 'Failed to update order');
      }
    } catch (error: any) {
      console.error('Error updating order:', error);
      Alert.alert('Error', error?.message || 'Failed to update order');
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  const renderOrderCard = (order: Order) => {
    const elapsedMinutes = calculateElapsedMinutes(order);
    const timeColor = getTimeWarningColor(elapsedMinutes);
    const timeBg = getTimeWarningBg(elapsedMinutes);

    return (
      <View key={order.id} style={styles.orderCard}>
        {/* Header Row */}
        <View style={styles.orderHeader}>
          <View style={styles.orderHeaderLeft}>
            <View style={[styles.tableBadge, { backgroundColor: timeBg }]}>
              <Ionicons name="restaurant" size={14} color={timeColor} />
              <Text style={[styles.tableNumber, { color: timeColor }]}>
                Table {order.table_number}
              </Text>
            </View>
            <Text style={styles.orderNumber}>{order.order_number}</Text>
          </View>
          <View style={[styles.timeBadge, { backgroundColor: timeBg }]}>
            <Ionicons name="time" size={14} color={timeColor} />
            <Text style={[styles.timeText, { color: timeColor }]}>
              {elapsedMinutes} min
            </Text>
          </View>
        </View>

        {/* Status Badge */}
        <View style={styles.statusRow}>
          <View style={[
            styles.statusBadge,
            order.status === 'KITCHEN_ACCEPTED' ? styles.statusAccepted : styles.statusPreparing
          ]}>
            <Text style={styles.statusText}>
              {order.status === 'KITCHEN_ACCEPTED' ? 'New Order' : 'Preparing'}
            </Text>
          </View>
          {order.waiter_name && (
            <Text style={styles.waiterName}>by {order.waiter_name}</Text>
          )}
        </View>

        {/* Items List */}
        <View style={styles.itemsContainer}>
          {order.items.map((item, index) => (
            <View key={item.id || index} style={styles.itemRow}>
              <Text style={styles.itemQuantity}>{item.quantity}x</Text>
              <Text style={styles.itemName}>{item.product_name}</Text>
              {item.size_name && (
                <View style={styles.sizeBadge}>
                  <Text style={styles.sizeText}>{item.size_name}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Special Instructions */}
        {(order.special_instructions || order.items.some(i => i.special_instructions)) && (
          <View style={styles.specialInstructionsBox}>
            <View style={styles.specialHeader}>
              <Ionicons name="information-circle" size={16} color="#FF7A59" />
              <Text style={styles.specialTitle}>Special Instructions</Text>
            </View>
            {order.special_instructions && (
              <Text style={styles.specialText}>{order.special_instructions}</Text>
            )}
            {order.items.filter(i => i.special_instructions).map((item, idx) => (
              <Text key={idx} style={styles.specialText}>
                • {item.product_name}: {item.special_instructions}
              </Text>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          {order.status === 'KITCHEN_ACCEPTED' && (
            <TouchableOpacity
              style={styles.startBtn}
              onPress={() => startPreparing(order.id)}
            >
              <Ionicons name="flame" size={18} color="#6C63FF" />
              <Text style={styles.startBtnText}>Start Preparing</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[
              styles.readyBtn,
              order.status === 'KITCHEN_ACCEPTED' && styles.readyBtnSecondary
            ]}
            onPress={() => markAsReady(order.id)}
          >
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.readyBtnText}>Mark Ready</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: STATUSBAR_HEIGHT }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#1A1A2E" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Kitchen Display</Text>
          <Text style={styles.headerSubtitle}>
            {filteredOrders.length} orders in queue
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={onRefresh}
        >
          <Ionicons name="refresh" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {[
          { id: 'all', label: 'All' },
          { id: 'KITCHEN_ACCEPTED', label: 'New' },
          { id: 'PREPARING', label: 'Preparing' },
        ].map(tab => {
          const isActive = filter === tab.id;
          const count = tab.id === 'all' 
            ? orders.length 
            : orders.filter(o => o.status === tab.id).length;
          
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
              onPress={() => setFilter(tab.id as any)}
            >
              <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                {tab.label}
              </Text>
              <View style={[styles.filterBadge, isActive && styles.filterBadgeActive]}>
                <Text style={[styles.filterBadgeText, isActive && styles.filterBadgeTextActive]}>
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Orders List */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={64} color="#444" />
            <Text style={styles.emptyTitle}>No orders in queue</Text>
            <Text style={styles.emptySubtitle}>
              New orders will appear here when submitted
            </Text>
          </View>
        ) : (
          <View style={styles.ordersGrid}>
            {filteredOrders.map(order => renderOrderCard(order))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: '#FF7A59',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  filterBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.8)',
  },
  filterBadgeTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  ordersGrid: {
    paddingBottom: 20,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  tableNumber: {
    fontSize: 13,
    fontWeight: '800',
  },
  orderNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusAccepted: {
    backgroundColor: 'rgba(108,99,255,0.15)',
  },
  statusPreparing: {
    backgroundColor: 'rgba(255,179,71,0.15)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6C63FF',
  },
  waiterName: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
  },
  itemsContainer: {
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 8,
  },
  itemQuantity: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF7A59',
    width: 30,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  sizeBadge: {
    backgroundColor: 'rgba(108,99,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sizeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6C63FF',
  },
  specialInstructionsBox: {
    backgroundColor: 'rgba(255,122,89,0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  specialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  specialTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF7A59',
  },
  specialText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  startBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(108,99,255,0.15)',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  startBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6C63FF',
  },
  readyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2BC48A',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  readyBtnSecondary: {
    backgroundColor: '#FF7A59',
  },
  readyBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 8,
    textAlign: 'center',
  },
});
