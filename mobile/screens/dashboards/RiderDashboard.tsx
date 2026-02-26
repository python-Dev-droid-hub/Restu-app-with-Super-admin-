import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  RefreshControl,
  Modal,
  StatusBar,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';
import { CommonActions } from '@react-navigation/native';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;
const HEADER_MARGIN = Platform.OS === 'ios' ? 50 : 20;

const { width } = Dimensions.get('window');

interface Delivery {
  id: string;
  orderNumber: string;
  restaurantName: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  items: string[];
  totalAmount: number;
  status: 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED';
  estimatedTime: string;
  distance: string;
}

interface RiderStats {
  todayDeliveries: number;
  todayEarnings: number;
  totalDeliveries: number;
  rating: number;
  isOnline: boolean;
}

interface RiderEarnings {
  totalEarnings: number;
  thisWeekEarnings: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
}

export default function RiderDashboard() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<'overview' | 'deliveries' | 'earnings'>('overview');
  const [stats, setStats] = useState<RiderStats>({
    todayDeliveries: 0,
    todayEarnings: 0,
    totalDeliveries: 0,
    rating: 4.8,
    isOnline: true,
  });
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [earnings, setEarnings] = useState<RiderEarnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load rider stats
      const statsResponse = await api.get('/dashboard/rider/stats');
      if (statsResponse.success && statsResponse.data) {
        setStats({
          todayDeliveries: statsResponse.data.assignedDeliveries || 0,
          todayEarnings: statsResponse.data.todayEarnings || 0,
          totalDeliveries: statsResponse.data.completedDeliveries || 0,
          rating: 4.8,
          isOnline: true,
        });
      }

      // Load assigned deliveries
      const deliveriesResponse = await api.get('/orders/driver/my-orders');
      if (deliveriesResponse.success && deliveriesResponse.data) {
        const formattedDeliveries = deliveriesResponse.data.deliveries?.map((order: any) => ({
          id: order._id,
          orderNumber: order.orderNumber || `ORD-${order._id.toString().slice(-6).toUpperCase()}`,
          restaurantName: order.branch?.branchName || 'Unknown Restaurant',
          customerName: order.customer?.displayName || 'Unknown Customer',
          customerPhone: order.customer?.phoneNumber || 'N/A',
          deliveryAddress: order.deliveryAddress?.street || 'N/A',
          items: order.items?.map((item: any) => item.product?.name || 'Unknown Item') || [],
          totalAmount: order.totalAmount || 0,
          status: order.status || 'ASSIGNED',
          estimatedTime: '15 min',
          distance: '2.3 km',
        })) || [];
        setDeliveries(formattedDeliveries);
      }

      // Load earnings data
      const earningsResponse = await api.get('/dashboard/rider/earnings');
      if (earningsResponse.success && earningsResponse.data) {
        setEarnings(earningsResponse.data);
      }
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
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('userRole');
    await AsyncStorage.removeItem('userData');
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'RoleSelection' as any }],
      })
    );
  };

  const toggleOnlineStatus = async () => {
    setStats(prev => ({ ...prev, isOnline: !prev.isOnline }));
    // API call would go here to update online status
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ASSIGNED: '#ff9800',
      PICKED_UP: '#9c27b0',
      IN_TRANSIT: '#2196f3',
      DELIVERED: '#4caf50',
    };
    return colors[status] || '#757575';
  };

  const updateDeliveryStatus = async (deliveryId: string, newStatus: string) => {
    try {
      // Optimistic update
      setDeliveries(prevDeliveries =>
        prevDeliveries.map(delivery =>
          delivery.id === deliveryId ? { ...delivery, status: newStatus as any } : delivery
        )
      );

      // API call would go here
      await api.put(`/orders/${deliveryId}`, { status: newStatus });
    } catch (error) {
      console.error('Error updating delivery status:', error);
      // Revert optimistic update on error
      loadDashboardData();
    }
  };

  const DeliveryCard = ({ delivery }: { delivery: Delivery }) => (
    <View style={[styles.deliveryCard, { borderLeftColor: getStatusColor(delivery.status) }]}>
      <View style={styles.deliveryHeader}>
        <View>
          <Text style={styles.orderNumber}>{delivery.orderNumber}</Text>
          <Text style={styles.restaurantName}>{delivery.restaurantName}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(delivery.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(delivery.status) }]}>
            {delivery.status.replace('_', ' ')}
          </Text>
        </View>
      </View>

      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>👤 {delivery.customerName}</Text>
        <Text style={styles.customerPhone}>📞 {delivery.customerPhone}</Text>
      </View>

      <View style={styles.deliveryInfo}>
        <Text style={styles.deliveryAddress}>📍 {delivery.deliveryAddress}</Text>
        <Text style={styles.deliveryDetails}>🚴 {delivery.distance} • ⏱️ {delivery.estimatedTime}</Text>
      </View>

      <View style={styles.itemsSummary}>
        <Text style={styles.itemsText}>{delivery.items.join(', ')}</Text>
        <Text style={styles.amountText}>${delivery.totalAmount.toFixed(2)}</Text>
      </View>

      <View style={styles.actionButtons}>
        {delivery.status === 'ASSIGNED' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#9c27b0' }]}
            onPress={() => updateDeliveryStatus(delivery.id, 'PICKED_UP')}
          >
            <Text style={styles.actionButtonText}>🛍️ Pick Up Order</Text>
          </TouchableOpacity>
        )}
        {delivery.status === 'PICKED_UP' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#2196f3' }]}
            onPress={() => updateDeliveryStatus(delivery.id, 'IN_TRANSIT')}
          >
            <Text style={styles.actionButtonText}>🚴 Start Delivery</Text>
          </TouchableOpacity>
        )}
        {delivery.status === 'IN_TRANSIT' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#4caf50' }]}
            onPress={() => updateDeliveryStatus(delivery.id, 'DELIVERED')}
          >
            <Text style={styles.actionButtonText}>✅ Mark Delivered</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#f5f5f5' }]}>
          <Text style={[styles.actionButtonText, { color: '#666' }]}>🗺️ Navigate</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTabNavigation = () => (
    <View style={styles.tabNavigation}>
      {[
        { id: 'overview', label: 'Overview', icon: '📊' },
        { id: 'deliveries', label: 'Deliveries', icon: '🚚' },
        { id: 'earnings', label: 'Earnings', icon: '💰' },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[styles.tabButton, activeTab === tab.id && styles.tabButtonActive]}
          onPress={() => setActiveTab(tab.id as any)}
        >
          <Text style={styles.tabIcon}>{tab.icon}</Text>
          <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <ScrollView style={styles.tabContent}>
            {renderTabNavigation()}

            {/* Online Status Toggle */}
            <View style={styles.onlineStatusCard}>
              <View style={styles.onlineStatusContent}>
                <View>
                  <Text style={styles.onlineStatusText}>
                    {stats.isOnline ? '🟢 Online' : '🔴 Offline'}
                  </Text>
                  <Text style={styles.onlineStatusSubtext}>
                    {stats.isOnline ? 'You are receiving delivery requests' : 'You are not receiving orders'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.onlineToggle, { backgroundColor: stats.isOnline ? '#dc3545' : '#28a745' }]}
                  onPress={toggleOnlineStatus}
                >
                  <Text style={styles.onlineToggleText}>
                    {stats.isOnline ? 'Go Offline' : 'Go Online'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Stats Cards */}
            <View style={styles.statsContainer}>
              <View style={[styles.statCard, { borderLeftColor: '#1976d2' }]}>
                <View style={styles.statIcon}>
                  <Text style={styles.statIconText}>📦</Text>
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>{stats.todayDeliveries}</Text>
                  <Text style={styles.statTitle}>Today's Deliveries</Text>
                </View>
              </View>

              <View style={[styles.statCard, { borderLeftColor: '#4caf50' }]}>
                <View style={styles.statIcon}>
                  <Text style={styles.statIconText}>💰</Text>
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>${stats.todayEarnings.toFixed(2)}</Text>
                  <Text style={styles.statTitle}>Today's Earnings</Text>
                </View>
              </View>

              <View style={[styles.statCard, { borderLeftColor: '#ff9800' }]}>
                <View style={styles.statIcon}>
                  <Text style={styles.statIconText}>🚴</Text>
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>{stats.totalDeliveries}</Text>
                  <Text style={styles.statTitle}>Total Deliveries</Text>
                </View>
              </View>

              <View style={[styles.statCard, { borderLeftColor: '#9c27b0' }]}>
                <View style={styles.statIcon}>
                  <Text style={styles.statIconText}>⭐</Text>
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>{stats.rating}</Text>
                  <Text style={styles.statTitle}>Rating</Text>
                </View>
              </View>
            </View>

            {/* Current Deliveries */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Current Deliveries</Text>
              {deliveries.filter(d => d.status !== 'DELIVERED').length > 0 ? (
                deliveries.filter(d => d.status !== 'DELIVERED').slice(0, 2).map((delivery) => (
                  <DeliveryCard delivery={delivery} />
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>🚚</Text>
                  <Text style={styles.emptyText}>No active deliveries</Text>
                  <Text style={styles.emptySubtext}>New deliveries will appear here</Text>
                </View>
              )}
            </View>
          </ScrollView>
        );

      case 'deliveries':
        return (
          <ScrollView style={styles.tabContent}>
            {renderTabNavigation()}
            <Text style={styles.pageTitle}>My Deliveries</Text>

            {deliveries.length > 0 ? (
              deliveries.map((delivery) => (
                <DeliveryCard key={delivery.id} delivery={delivery} />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🚚</Text>
                <Text style={styles.emptyText}>No deliveries assigned</Text>
                <Text style={styles.emptySubtext}>Deliveries will appear here when assigned</Text>
              </View>
            )}
          </ScrollView>
        );

      case 'earnings':
        return (
          <ScrollView style={styles.tabContent}>
            {renderTabNavigation()}
            <Text style={styles.pageTitle}>Earnings</Text>

            <View style={styles.earningsOverview}>
              <Text style={styles.earningsTitle}>Total Earnings</Text>
              <Text style={styles.earningsAmount}>
                ${earnings?.totalEarnings?.toFixed(2) || '0.00'}
              </Text>
            </View>

            <View style={styles.earningsGrid}>
              <View style={styles.earningsCard}>
                <Text style={styles.earningsCardTitle}>This Week</Text>
                <Text style={styles.earningsCardAmount}>
                  ${earnings?.thisWeekEarnings?.toFixed(2) || '0.00'}
                </Text>
              </View>
              <View style={styles.earningsCard}>
                <Text style={styles.earningsCardTitle}>This Month</Text>
                <Text style={styles.earningsCardAmount}>
                  ${earnings?.thisMonthEarnings?.toFixed(2) || '0.00'}
                </Text>
              </View>
              <View style={styles.earningsCard}>
                <Text style={styles.earningsCardTitle}>Last Month</Text>
                <Text style={styles.earningsCardAmount}>
                  ${earnings?.lastMonthEarnings?.toFixed(2) || '0.00'}
                </Text>
              </View>
            </View>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: STATUSBAR_HEIGHT }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      {/* Header */}
      <View style={[styles.header, { marginTop: HEADER_MARGIN }]}>
        <Text style={styles.headerTitle}>Rider Dashboard</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderTabContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1a1a2e',
    padding: 20,
    paddingTop: 50, // Add top padding to prevent merge with status bar
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#1976d2',
  },
  tabIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  tabText: {
    fontSize: 12,
    color: '#666',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  onlineStatusCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  onlineStatusContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  onlineStatusText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  onlineStatusSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  onlineToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  onlineToggleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    padding: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    width: (width - 40 - 16) / 2,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconText: {
    fontSize: 20,
  },
  statContent: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 16,
  },
  deliveryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  restaurantName: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  customerInfo: {
    marginBottom: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a2e',
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  deliveryInfo: {
    marginBottom: 12,
  },
  deliveryAddress: {
    fontSize: 14,
    color: '#666',
  },
  deliveryDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  itemsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  itemsText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  amountText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4caf50',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
    margin: 20,
  },
  earningsOverview: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  earningsTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  earningsAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  earningsGrid: {
    padding: 20,
  },
  earningsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  earningsCardTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  earningsCardAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    marginHorizontal: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
