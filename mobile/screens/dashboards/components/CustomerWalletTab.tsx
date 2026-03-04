import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../components/api/client';

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

interface PaymentMethod {
  _id: string;
  type: 'card' | 'paypal' | 'apple_pay' | 'google_pay';
  last4: string;
  brand: string;
  isDefault: boolean;
}

interface Transaction {
  _id: string;
  type: 'payment' | 'refund' | 'topup';
  amount: number;
  date: string;
  description: string;
  status: 'completed' | 'pending' | 'failed';
}

interface CustomerWalletTabProps {
  formatPrice: (amount: number) => string;
}

export default function CustomerWalletTab({ formatPrice }: CustomerWalletTabProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWalletData = useCallback(async () => {
    try {
      const [methodsRes, transactionsRes, balanceRes] = await Promise.all([
        api.get('/payments/methods'),
        api.get('/payments/transactions'),
        api.get('/wallet/balance'),
      ]);

      if (methodsRes.success) setPaymentMethods(methodsRes.data?.methods || []);
      if (transactionsRes.success) setTransactions(transactionsRes.data?.transactions || []);
      if (balanceRes.success) setWalletBalance(balanceRes.data?.balance || 0);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchWalletData();
    setRefreshing(false);
  }, [fetchWalletData]);

  const getCardIcon = (brand: string) => {
    const icons: Record<string, string> = {
      visa: 'card-outline',
      mastercard: 'card-outline',
      amex: 'card-outline',
      default: 'card-outline',
    };
    return icons[brand?.toLowerCase()] || icons.default;
  };

  const getTransactionIcon = (type: string) => {
    const icons: Record<string, string> = {
      payment: 'cart-outline',
      refund: 'return-down-back-outline',
      topup: 'add-circle-outline',
    };
    return icons[type] || 'swap-horizontal-outline';
  };

  const getTransactionColor = (type: string) => {
    const colors: Record<string, string> = {
      payment: COLORS.danger,
      refund: COLORS.success,
      topup: COLORS.success,
    };
    return colors[type] || COLORS.gray;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Wallet Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Wallet Balance</Text>
        <Text style={styles.balanceAmount}>{formatPrice(walletBalance)}</Text>
        <View style={styles.balanceActions}>
          <TouchableOpacity style={styles.balanceButton}>
            <Ionicons name="add-circle" size={20} color={COLORS.white} />
            <Text style={styles.balanceButtonText}>Add Money</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.balanceButton}>
            <Ionicons name="send" size={20} color={COLORS.white} />
            <Text style={styles.balanceButtonText}>Transfer</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Payment Methods */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Payment Methods</Text>
          <TouchableOpacity>
            <Text style={styles.addButton}>+ Add New</Text>
          </TouchableOpacity>
        </View>

        {paymentMethods.length > 0 ? (
          paymentMethods.map((method) => (
            <View key={method._id} style={styles.paymentMethodCard}>
              <View style={styles.paymentIcon}>
                <Ionicons
                  name={getCardIcon(method.brand) as any}
                  size={28}
                  color={COLORS.primary}
                />
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentBrand}>
                  {method.brand?.toUpperCase()} ending in {method.last4}
                </Text>
                {method.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultText}>Default</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity>
                <Ionicons name="ellipsis-vertical" size={20} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <TouchableOpacity style={styles.addPaymentCard}>
            <Ionicons name="add-circle-outline" size={32} color={COLORS.primary} />
            <Text style={styles.addPaymentText}>Add Payment Method</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Payment Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Pay</Text>
        <View style={styles.quickPayGrid}>
          {['Apple Pay', 'Google Pay', 'PayPal'].map((option) => (
            <TouchableOpacity key={option} style={styles.quickPayButton}>
              <Ionicons
                name={
                  option === 'Apple Pay'
                    ? 'phone-portrait-outline'
                    : option === 'Google Pay'
                    ? 'logo-google'
                    : 'logo-paypal'
                }
                size={24}
                color={COLORS.primary}
              />
              <Text style={styles.quickPayText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Transaction History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        
        {transactions.length > 0 ? (
          transactions.slice(0, 10).map((transaction) => (
            <View key={transaction._id} style={styles.transactionCard}>
              <View
                style={[
                  styles.transactionIcon,
                  { backgroundColor: getTransactionColor(transaction.type) + '20' },
                ]}
              >
                <Ionicons
                  name={getTransactionIcon(transaction.type) as any}
                  size={20}
                  color={getTransactionColor(transaction.type)}
                />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionDescription}>
                  {transaction.description}
                </Text>
                <Text style={styles.transactionDate}>
                  {formatTime(transaction.date)}
                </Text>
              </View>
              <Text
                style={[
                  styles.transactionAmount,
                  {
                    color:
                      transaction.type === 'payment'
                        ? COLORS.danger
                        : COLORS.success,
                  },
                ]}
              >
                {transaction.type === 'payment' ? '-' : '+'}
                {formatPrice(transaction.amount)}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyTransactions}>
            <Ionicons name="receipt-outline" size={40} color={COLORS.gray} />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        )}

        {transactions.length > 10 && (
          <TouchableOpacity style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All Transactions</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceCard: {
    backgroundColor: COLORS.primary,
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 20,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: 12,
  },
  balanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  balanceButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginBottom: 12,
  },
  addButton: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentBrand: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkText,
    marginBottom: 4,
  },
  defaultBadge: {
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  defaultText: {
    fontSize: 10,
    color: COLORS.success,
    fontWeight: '600',
  },
  addPaymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
    borderStyle: 'dashed',
    gap: 8,
  },
  addPaymentText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  quickPayGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickPayButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickPayText: {
    fontSize: 12,
    color: COLORS.darkText,
    marginTop: 8,
    fontWeight: '500',
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkText,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: COLORS.gray,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyTransactions: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 8,
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
