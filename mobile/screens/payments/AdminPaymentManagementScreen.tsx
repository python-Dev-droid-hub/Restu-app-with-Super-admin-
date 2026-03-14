import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../../context/SettingsContext';
import { getAdminPayments, approvePayout, rejectPayout, getAdminPaymentStats } from '../../services/paymentService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
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
};

interface Payment {
  _id: string;
  paymentNumber: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  type: string;
  createdAt: string;
  customer?: {
    displayName: string;
    email: string;
    phoneNumber: string;
  };
  rider?: {
    displayName: string;
    email: string;
    phoneNumber: string;
  };
  order?: {
    orderNumber: string;
    totalAmount: number;
  };
}

const AdminPaymentManagementScreen: React.FC = () => {
  const { formatPrice, currencySymbol } = useSettings();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'SUCCESS' | 'FAILED'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'order_payment' | 'payout'>('all');

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      
      const status = filter === 'all' ? undefined : filter;
      const type = typeFilter === 'all' ? undefined : typeFilter;
      
      const result = await getAdminPayments(status, undefined, type, 100);
      
      if (result.success) {
        setPayments(result.payments || []);
        setStats(result.stats || []);
      }
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  }, [filter, typeFilter]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPayments();
    setRefreshing(false);
  };

  const handleApprovePayout = async (payoutId: string) => {
    Alert.alert(
      'Approve Payout',
      'Are you sure you want to approve this payout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            const result = await approvePayout(payoutId);
            if (result.success) {
              Alert.alert('Success', 'Payout approved successfully');
              loadPayments();
            } else {
              Alert.alert('Error', result.error || 'Failed to approve payout');
            }
          },
        },
      ]
    );
  };

  const handleRejectPayout = async (payoutId: string) => {
    Alert.alert(
      'Reject Payout',
      'Are you sure you want to reject this payout? The amount will be refunded to the rider\'s wallet.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            const result = await rejectPayout(payoutId, 'Rejected by admin');
            if (result.success) {
              Alert.alert('Success', 'Payout rejected and amount refunded');
              loadPayments();
            } else {
              Alert.alert('Error', result.error || 'Failed to reject payout');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return COLORS.success;
      case 'PENDING':
        return COLORS.warning;
      case 'FAILED':
        return COLORS.danger;
      case 'APPROVED':
        return COLORS.info;
      case 'REFUNDED':
        return COLORS.gray;
      default:
        return COLORS.gray;
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'card':
        return 'card';
      case 'cash':
        return 'cash';
      case 'wallet':
        return 'wallet';
      case 'bank_transfer':
        return 'business';
      default:
        return 'card';
    }
  };

  const renderPaymentCard = ({ item }: { item: Payment }) => (
    <View style={[styles.card, { borderLeftColor: getStatusColor(item.status) }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.paymentNumber}>{item.paymentNumber}</Text>
          <Text style={styles.orderNumber}>
            {item.order?.orderNumber || 'No Order'}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>

      {/* Type Badge */}
      <View style={styles.typeContainer}>
        <View style={[styles.typeBadge, item.type === 'payout' ? styles.payoutBadge : styles.orderBadge]}>
          <Text style={styles.typeText}>
            {item.type === 'payout' ? '💰 Payout' : '🛒 Order Payment'}
          </Text>
        </View>
      </View>

      {/* Amount */}
      <View style={styles.amountRow}>
        <Ionicons name={getMethodIcon(item.paymentMethod) as any} size={20} color={COLORS.primary} />
        <Text style={styles.amountLabel}>{item.paymentMethod.toUpperCase()}</Text>
        <Text style={styles.amountValue}>
          {currencySymbol}{Number(item.amount || 0).toFixed(2)}
        </Text>
      </View>

      {/* User Info */}
      <View style={styles.userInfo}>
        {item.type === 'payout' && item.rider ? (
          <>
            <Ionicons name="bicycle" size={16} color={COLORS.gray} />
            <Text style={styles.userName}>{item.rider.displayName}</Text>
            <Text style={styles.userPhone}>{item.rider.phoneNumber}</Text>
          </>
        ) : item.customer ? (
          <>
            <Ionicons name="person" size={16} color={COLORS.gray} />
            <Text style={styles.userName}>{item.customer.displayName}</Text>
            <Text style={styles.userPhone}>{item.customer.phoneNumber}</Text>
          </>
        ) : null}
      </View>

      {/* Date */}
      <Text style={styles.date}>
        {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString()}
      </Text>

      {/* Actions for pending payouts */}
      {item.type === 'payout' && item.status === 'PENDING' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.approveButton}
            onPress={() => handleApprovePayout(item._id)}
          >
            <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={() => handleRejectPayout(item._id)}
          >
            <Ionicons name="close-circle" size={18} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Ionicons name="today" size={24} color={COLORS.primary} />
        <Text style={styles.statLabel}>Today</Text>
        <Text style={styles.statValue}>
          {Number(stats.find(s => s._id === 'today')?.total || 0).toFixed(2)}
        </Text>
      </View>
      <View style={styles.statCard}>
        <Ionicons name="calendar" size={24} color={COLORS.info} />
        <Text style={styles.statLabel}>Month</Text>
        <Text style={styles.statValue}>
          {Number(stats.find(s => s._id === 'month')?.total || 0).toFixed(2)}
        </Text>
      </View>
      <View style={styles.statCard}>
        <Ionicons name="trending-up" size={24} color={COLORS.success} />
        <Text style={styles.statLabel}>Total</Text>
        <Text style={styles.statValue}>
          {Number(stats.find(s => s._id === 'total')?.total || 0).toFixed(2)}
        </Text>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading payments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filters */}
      <View style={styles.filtersContainer}>
        {/* Status Filter */}
        <View style={styles.filterRow}>
          {['all', 'PENDING', 'SUCCESS', 'FAILED'].map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f as any)}
              style={[
                styles.filterButton,
                filter === f && styles.filterButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === f && styles.filterTextActive,
                ]}
              >
                {f === 'all' ? 'All' : f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Type Filter */}
        <View style={styles.filterRow}>
          {['all', 'order_payment', 'payout'].map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTypeFilter(t as any)}
              style={[
                styles.filterButton,
                typeFilter === t && styles.filterButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  typeFilter === t && styles.filterTextActive,
                ]}
              >
                {t === 'all' ? 'All Types' : t === 'payout' ? 'Payouts' : 'Orders'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Stats */}
      {renderStats()}

      {/* Payments List */}
      <FlatList
        data={payments}
        renderItem={renderPaymentCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="card-outline" size={60} color={COLORS.gray} />
            <Text style={styles.emptyText}>No payments found</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.lightBg,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.gray,
  },
  filtersContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.lightBg,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 13,
    color: COLORS.darkText,
    fontWeight: '500',
  },
  filterTextActive: {
    color: COLORS.white,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  paymentNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.darkText,
  },
  orderNumber: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  typeContainer: {
    marginBottom: 12,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  orderBadge: {
    backgroundColor: COLORS.info + '20',
  },
  payoutBadge: {
    backgroundColor: COLORS.warning + '20',
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.darkText,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  amountLabel: {
    fontSize: 14,
    color: COLORS.gray,
    flex: 1,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  userName: {
    fontSize: 14,
    color: COLORS.darkText,
    fontWeight: '500',
  },
  userPhone: {
    fontSize: 12,
    color: COLORS.gray,
  },
  date: {
    fontSize: 12,
    color: COLORS.gray,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.success,
    paddingVertical: 10,
    borderRadius: 8,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.danger,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.gray,
    marginTop: 12,
  },
});

export default AdminPaymentManagementScreen;
