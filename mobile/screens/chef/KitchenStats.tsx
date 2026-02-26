import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;
const { width } = Dimensions.get('window');

interface KitchenStats {
  pending_orders: number;
  preparing_orders: number;
  ready_orders: number;
  completed_today: number;
  avg_preparation_time: number;
  orders_last_hour: number;
}

interface RecentOrder {
  id: string;
  order_number: string;
  table_number: string;
  status: string;
  items_count: number;
  created_at: string;
}

export default function KitchenStatsScreen() {
  const [stats, setStats] = useState<KitchenStats>({
    pending_orders: 0,
    preparing_orders: 0,
    ready_orders: 0,
    completed_today: 0,
    avg_preparation_time: 0,
    orders_last_hour: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Fetch kitchen orders for stats calculation
      const response = await api.get('/orders?status=KITCHEN_ACCEPTED,PREPARING,READY,PICKED_UP');
      
      if (response.success && response.data) {
        const orders = response.data.orders || response.data || [];
        
        // Calculate stats from orders
        const pendingOrders = orders.filter((o: any) => o.status === 'KITCHEN_ACCEPTED').length;
        const preparingOrders = orders.filter((o: any) => o.status === 'PREPARING').length;
        const readyOrders = orders.filter((o: any) => o.status === 'READY').length;
        
        // Count completed today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const completedToday = orders.filter((o: any) => 
          (o.status === 'PICKED_UP' || o.status === 'COMPLETED') && 
          new Date(o.created_at) >= today
        ).length;
        
        // Orders in last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const ordersLastHour = orders.filter((o: any) => 
          new Date(o.created_at) >= oneHourAgo
        ).length;

        setStats({
          pending_orders: pendingOrders,
          preparing_orders: preparingOrders,
          ready_orders: readyOrders,
          completed_today: completedToday,
          avg_preparation_time: 15, // Default estimate
          orders_last_hour: ordersLastHour,
        });

        // Format recent orders
        const recent: RecentOrder[] = orders.slice(0, 10).map((o: any) => ({
          id: o.id || o._id,
          order_number: o.order_number || o.orderNumber || `ORD-${String(o.id).slice(-6)}`,
          table_number: o.table_number || o.tableNumber || o.table?.tableNumber || '-',
          status: o.status,
          items_count: (o.items || []).length,
          created_at: o.created_at || o.createdAt,
        }));
        setRecentOrders(recent);
      }
    } catch (error) {
      console.error('Error loading kitchen stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'KITCHEN_ACCEPTED':
        return { bg: 'rgba(108,99,255,0.15)', fg: '#6C63FF' };
      case 'PREPARING':
        return { bg: 'rgba(255,179,71,0.15)', fg: '#FFB347' };
      case 'READY':
        return { bg: 'rgba(43,196,138,0.15)', fg: '#2BC48A' };
      default:
        return { bg: 'rgba(160,160,160,0.15)', fg: '#666' };
    }
  };

  const StatCard = ({ 
    icon, 
    value, 
    label, 
    color, 
    bgColor 
  }: { 
    icon: string; 
    value: number; 
    label: string; 
    color: string; 
    bgColor: string;
  }) => (
    <View style={[styles.statCard, { backgroundColor: bgColor }]}>
      <View style={[styles.statIconCircle, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={20} color="#fff" />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { paddingTop: STATUSBAR_HEIGHT }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A2E" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kitchen Stats</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="time"
            value={stats.pending_orders}
            label="Pending"
            color="#FF7A59"
            bgColor="rgba(255,122,89,0.12)"
          />
          <StatCard
            icon="flame"
            value={stats.preparing_orders}
            label="Preparing"
            color="#6C63FF"
            bgColor="rgba(108,99,255,0.12)"
          />
          <StatCard
            icon="checkmark-circle"
            value={stats.ready_orders}
            label="Ready"
            color="#2BC48A"
            bgColor="rgba(43,196,138,0.12)"
          />
          <StatCard
            icon="checkmark-done"
            value={stats.completed_today}
            label="Completed"
            color="#FFB347"
            bgColor="rgba(255,179,71,0.12)"
          />
        </View>

        {/* Summary Stats */}
        <View style={styles.summarySection}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Ionicons name="stats-chart" size={20} color="#FF7A59" />
              <Text style={styles.summaryLabel}>Orders Last Hour</Text>
            </View>
            <Text style={styles.summaryValue}>{stats.orders_last_hour}</Text>
          </View>
          
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Ionicons name="timer" size={20} color="#6C63FF" />
              <Text style={styles.summaryLabel}>Avg Prep Time</Text>
            </View>
            <Text style={styles.summaryValue}>{stats.avg_preparation_time} min</Text>
          </View>
        </View>

        {/* Performance Bar */}
        <View style={styles.performanceSection}>
          <Text style={styles.sectionTitle}>Queue Status</Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressSegment, 
                { 
                  flex: stats.pending_orders || 0.1,
                  backgroundColor: '#FF7A59'
                }
              ]} 
            />
            <View 
              style={[
                styles.progressSegment, 
                { 
                  flex: stats.preparing_orders || 0.1,
                  backgroundColor: '#6C63FF'
                }
              ]} 
            />
            <View 
              style={[
                styles.progressSegment, 
                { 
                  flex: stats.ready_orders || 0.1,
                  backgroundColor: '#2BC48A'
                }
              ]} 
            />
          </View>
          <View style={styles.progressLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF7A59' }]} />
              <Text style={styles.legendText}>Pending ({stats.pending_orders})</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#6C63FF' }]} />
              <Text style={styles.legendText}>Preparing ({stats.preparing_orders})</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#2BC48A' }]} />
              <Text style={styles.legendText}>Ready ({stats.ready_orders})</Text>
            </View>
          </View>
        </View>

        {/* Recent Orders */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          {recentOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={40} color="#444" />
              <Text style={styles.emptyText}>No recent orders</Text>
            </View>
          ) : (
            recentOrders.map(order => {
              const statusColor = getStatusColor(order.status);
              return (
                <View key={order.id} style={styles.orderRow}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderNumber}>{order.order_number}</Text>
                    <Text style={styles.orderTable}>Table {order.table_number}</Text>
                  </View>
                  <View style={styles.orderMeta}>
                    <Text style={styles.orderItems}>{order.items_count} items</Text>
                    <Text style={styles.orderTime}>{formatTime(order.created_at)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                    <Text style={[styles.statusText, { color: statusColor.fg }]}>
                      {order.status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: (width - 48) / 2,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
    marginTop: 4,
  },
  summarySection: {
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  performanceSection: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  progressBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressSegment: {
    height: '100%',
  },
  progressLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  recentSection: {
    marginBottom: 30,
  },
  orderRow: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  orderTable: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  orderMeta: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  orderItems: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  orderTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 10,
  },
});
