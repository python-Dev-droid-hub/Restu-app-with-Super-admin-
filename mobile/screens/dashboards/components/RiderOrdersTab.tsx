import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// App Styling Constants
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

const FONTS = {
  sectionTitle: { fontSize: 16, fontWeight: '700' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
};

const SPACING = {
  horizontal: 16,
  verticalGap: 12,
};

interface RiderOrdersTabProps {
  orders: any[];
  onCallCustomer?: (phone: string) => void;
  onStartRide?: (orderId: string) => void;
  onRejectOrder?: (orderId: string) => void;
  formatPrice?: (amount: number) => string;
}

export default function RiderOrdersTab({ orders, onCallCustomer, onStartRide, onRejectOrder, formatPrice }: RiderOrdersTabProps) {
  const [activeFilter, setActiveFilter] = useState<'Completed' | 'Undelivered'>('Undelivered');

  // Use branch currency format or fallback to ₹
  const fmtPrice = formatPrice ?? ((amount: number) => `₹${amount.toFixed(0)}`);

  const filteredOrders = orders.filter((order) => {
    const status = String(order?.status || '').toLowerCase();
    if (activeFilter === 'Completed') {
      return status === 'delivered' || status === 'completed';
    }
    return status !== 'delivered' && status !== 'completed';
  });

  const getStatusColor = (status: string) => {
    const s = String(status || '').toLowerCase();
    switch (s) {
      case 'delivered':
      case 'completed':
        return COLORS.success;
      case 'cancelled':
        return COLORS.danger;
      default:
        return COLORS.warning;
    }
  };

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <View style={styles.filterRow}>
          {(['Completed', 'Undelivered'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterButton, activeFilter === filter && styles.filterButtonActive]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === filter && styles.filterTextActive,
                ]}
              >
                {filter}
              </Text>
              {activeFilter === filter && <View style={styles.filterIndicator} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Orders List */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order, index) => (
            (() => {
              const status = String(order?.status || '').toLowerCase();
              const isCompleted = status === 'delivered' || status === 'completed';
              const showActions = activeFilter !== 'Completed' && !isCompleted;

              return (
            <View
              key={order.id || index}
              style={[
                styles.orderCard,
                { borderLeftColor: getStatusColor(order.status) },
              ]}
            >
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>{order.orderNumber}</Text>
                <View style={styles.ratingContainer}>
                  <Text style={styles.ratingText}>⭐ 4.8</Text>
                </View>
              </View>

              <Text style={styles.customerName}>{order.customerName}</Text>

              <Text style={styles.itemsText}>{order.items.join(', ')}</Text>

              <View style={styles.orderFooter}>
                <Text style={styles.orderDetails}>
                  {order.distance} | {fmtPrice(order.totalAmount || 0)} | {order.status}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(order.status) },
                  ]}
                >
                  <Text style={styles.statusText}>{order.status}</Text>
                </View>
              </View>

              {showActions && (
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.callButton]}
                    onPress={() => onCallCustomer?.(String(order?.customerPhone || ''))}
                  >
                    <Ionicons name="call" size={14} color={COLORS.white} />
                    <Text style={styles.actionButtonText}>Call</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.startRideButton]}
                    onPress={() => onStartRide?.(String(order?._id || order?.id || ''))}
                  >
                    <Ionicons name="navigate" size={14} color={COLORS.white} />
                    <Text style={styles.actionButtonText}>Start Ride</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => onRejectOrder?.(String(order?._id || order?.id || ''))}
                  >
                    <Ionicons name="close-circle" size={14} color={COLORS.white} />
                    <Text style={styles.actionButtonText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
              );
            })()
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={60} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>No orders</Text>
            <Text style={styles.emptySubtitle}>Check other tab</Text>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    paddingHorizontal: SPACING.horizontal,
  },
  filterRow: {
    flexDirection: 'row',
    height: 44,
  },
  filterButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterButtonActive: {},
  filterText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  filterTextActive: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  filterIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 3,
    backgroundColor: COLORS.primary,
  },
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: SPACING.horizontal,
    marginTop: SPACING.verticalGap,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontSize: FONTS.sectionTitle.fontSize,
    fontWeight: '700',
    color: COLORS.darkText,
  },
  ratingContainer: {},
  ratingText: {
    fontSize: FONTS.small.fontSize,
    color: COLORS.warning,
  },
  customerName: {
    fontSize: FONTS.body.fontSize,
    fontWeight: '600',
    color: COLORS.darkText,
    marginBottom: 4,
  },
  itemsText: {
    fontSize: FONTS.small.fontSize,
    color: COLORS.gray,
    marginBottom: 8,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderDetails: {
    fontSize: FONTS.small.fontSize,
    color: COLORS.darkText,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: FONTS.small.fontSize,
    color: COLORS.white,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
  },
  callButton: {
    backgroundColor: COLORS.info,
  },
  startRideButton: {
    backgroundColor: COLORS.primary,
  },
  rejectButton: {
    backgroundColor: COLORS.danger,
  },
  actionButtonText: {
    fontSize: FONTS.small.fontSize,
    color: COLORS.white,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: FONTS.sectionTitle.fontSize,
    fontWeight: '600',
    color: COLORS.darkText,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: FONTS.body.fontSize,
    color: COLORS.gray,
    marginTop: 4,
  },
});
