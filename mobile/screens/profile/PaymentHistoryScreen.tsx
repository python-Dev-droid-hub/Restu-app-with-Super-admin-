import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../components/api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  },
  spacing: { pagePad: 16 },
} as const;

interface PaymentHistoryScreenProps {
  onBack: () => void;
}

interface PaymentRecord {
  _id: string;
  orderNumber: string;
  amount: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  invoiceNumber?: string;
  waiterName?: string;
  tableNumber?: string;
}

export default function PaymentHistoryScreen({ onBack }: PaymentHistoryScreenProps) {
  const insets = useSafeAreaInsets();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPayments = async () => {
    try {
      setLoading(true);
      // Fetch completed orders with higher limit
      const response = await api.get('/orders?status=COMPLETED&limit=100');
      
      console.log('[PaymentHistory] Response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        const orders = response.data.orders || response.data;
        console.log('[PaymentHistory] Orders received:', orders.length);
        
        // Filter orders that have payment completed (SUCCESS status or payment method set)
        const completedOrders = orders.filter((order: any) => {
          const hasPayment = order.paymentStatus === 'SUCCESS' || order.paymentMethod;
          console.log('[PaymentHistory] Order:', order.orderNumber, 'paymentStatus:', order.paymentStatus, 'paymentMethod:', order.paymentMethod, 'hasPayment:', hasPayment);
          return hasPayment;
        });
        
        console.log('[PaymentHistory] Completed orders with payment:', completedOrders.length);
        
        setPayments(completedOrders.map((order: any) => ({
          _id: order._id,
          orderNumber: order.orderNumber || order.order_number,
          amount: order.totalAmount || order.total_amount,
          status: order.paymentStatus || 'SUCCESS',
          paymentMethod: order.paymentMethod || 'CASH',
          createdAt: order.completedAt || order.completed_at || order.updatedAt,
          invoiceNumber: order.invoiceNumber,
          waiterName: order.waiterName || order.waiter?.displayName || order.waiter?.name || '-',
          tableNumber: order.tableNumber || order.table_number || '-',
        })));
      }
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadPayments();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderPaymentItem = ({ item }: { item: PaymentRecord }) => (
    <View style={styles.paymentCard}>
      <View style={styles.paymentHeader}>
        <View style={styles.paymentInfo}>
          <Text style={styles.orderNumber}>Order #{item.orderNumber}</Text>
          {item.invoiceNumber && (
            <Text style={styles.invoiceNumber}>Invoice: {item.invoiceNumber}</Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: DESIGN.colors.green + '20' }]}>
          <Text style={[styles.statusText, { color: DESIGN.colors.green }]}>Paid</Text>
        </View>
      </View>
      <View style={styles.paymentDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="wallet-outline" size={16} color={DESIGN.colors.muted} />
          <Text style={styles.detailText}>${item.amount?.toFixed(2) || '0.00'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="card-outline" size={16} color={DESIGN.colors.muted} />
          <Text style={styles.detailText}>{item.paymentMethod}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={16} color={DESIGN.colors.muted} />
          <Text style={styles.detailText}>Waiter: {item.waiterName}</Text>
        </View>
        {item.tableNumber && item.tableNumber !== '-' && (
          <View style={styles.detailRow}>
            <Ionicons name="restaurant-outline" size={16} color={DESIGN.colors.muted} />
            <Text style={styles.detailText}>Table: {item.tableNumber}</Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color={DESIGN.colors.muted} />
          <Text style={styles.detailText}>{formatDate(item.createdAt)}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={DESIGN.colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment History</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : payments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="wallet-outline" size={64} color={DESIGN.colors.muted} />
          <Text style={styles.emptyText}>No payment history yet</Text>
          <Text style={styles.emptySubtext}>Completed orders with payments will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item) => item._id}
          renderItem={renderPaymentItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DESIGN.colors.lightBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DESIGN.spacing.pagePad,
    paddingVertical: 16,
    backgroundColor: DESIGN.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN.colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DESIGN.colors.lightBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: DESIGN.colors.darkText,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: DESIGN.colors.muted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: DESIGN.colors.muted,
    marginTop: 8,
    textAlign: 'center',
  },
  listContent: {
    padding: DESIGN.spacing.pagePad,
    paddingBottom: 100,
  },
  paymentCard: {
    backgroundColor: DESIGN.colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
  },
  invoiceNumber: {
    fontSize: 12,
    color: DESIGN.colors.muted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  paymentDetails: {
    borderTopWidth: 1,
    borderTopColor: DESIGN.colors.border,
    paddingTop: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: DESIGN.colors.darkText,
  },
});
