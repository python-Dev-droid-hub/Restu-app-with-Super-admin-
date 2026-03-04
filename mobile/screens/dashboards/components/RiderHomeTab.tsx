import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
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
  button: { fontSize: 14, fontWeight: '700' as const },
};

const SPACING = {
  horizontal: 16,
  verticalGap: 12,
};

interface RiderHomeTabProps {
  newOrderAlert: any;
  activeOrder: any;
  onAcceptOrder: (orderId: string) => void;
  onDeclineOrder: () => void;
  onMarkDelivered: (orderId: string) => void;
  onCallCustomer: (phone: string) => void;
}

export default function RiderHomeTab({
  newOrderAlert,
  activeOrder,
  onAcceptOrder,
  onDeclineOrder,
  onMarkDelivered,
  onCallCustomer,
}: RiderHomeTabProps) {
  return (
    <View style={styles.container}>
      {/* New Order Alert */}
      {newOrderAlert && (
        <View style={[styles.card, styles.urgentCard]}>
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentBadgeText}>🔴 URGENT</Text>
          </View>
          <Text style={styles.cardTitle}>New Order Assigned</Text>
          <Text style={styles.orderId}>{newOrderAlert.orderNumber || 'ORD-1024'}</Text>
          <Text style={styles.restaurantName}>
            {newOrderAlert.branch?.branchName || 'Tacos Hub Restaurant'}
          </Text>
          <Text style={styles.orderDetails}>
            {newOrderAlert.distance || '4.8 km'} | ${newOrderAlert.earning || '6.50'}
          </Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={() => onAcceptOrder(newOrderAlert._id || newOrderAlert.id)}
            >
              <Text style={styles.buttonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.declineButton]}
              onPress={onDeclineOrder}
            >
              <Text style={[styles.buttonText, styles.declineText]}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Active Delivery */}
      {activeOrder ? (
        <View style={styles.card}>
          <View style={styles.liveHeader}>
            <View style={styles.liveIndicator} />
            <Text style={styles.liveText}>LIVE DELIVERY</Text>
          </View>
          <Text style={styles.cardTitle}>Order #{activeOrder.orderNumber || '1020'}</Text>
          <Text style={styles.customerName}>
            👤 {activeOrder.customer?.displayName || 'Michael Anderson'}
          </Text>
          <Text style={styles.address}>
            📍 {activeOrder.deliveryAddress?.street || '221B Baker Street'}
          </Text>
          
          {/* Map Placeholder */}
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map" size={48} color={COLORS.gray} />
            <Text style={styles.mapText}>Map View</Text>
          </View>

          <View style={styles.timeRemaining}>
            <Text style={styles.timeText}>Remaining: ~7 mins</Text>
          </View>

          <View style={styles.deliveryActions}>
            <TouchableOpacity
              style={[styles.fullButton, styles.deliveredButton]}
              onPress={() => onMarkDelivered(activeOrder._id || activeOrder.id)}
            >
              <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
              <Text style={styles.fullButtonText}>Delivered</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fullButton, styles.callButton]}
              onPress={() => onCallCustomer(activeOrder.customer?.phoneNumber || '')}
            >
              <Ionicons name="call" size={20} color={COLORS.white} />
              <Text style={styles.fullButtonText}>Call Customer</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Empty State */
        <View style={[styles.card, styles.emptyCard]}>
          <Ionicons name="cube-outline" size={60} color={COLORS.gray} />
          <Text style={styles.emptyTitle}>No Active Delivery</Text>
          <Text style={styles.emptySubtitle}>Ready to accept orders</Text>
          <TouchableOpacity style={styles.acceptOrdersButton}>
            <Text style={styles.acceptOrdersText}>Accept Orders</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: SPACING.verticalGap,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.horizontal,
    marginHorizontal: SPACING.horizontal,
    marginBottom: SPACING.verticalGap,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  urgentCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
  },
  urgentBadge: {
    backgroundColor: COLORS.danger,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  urgentBadgeText: {
    color: COLORS.white,
    fontSize: FONTS.small.fontSize,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: FONTS.body.fontSize,
    fontWeight: '600',
    color: COLORS.darkText,
    marginBottom: 4,
  },
  orderId: {
    fontSize: FONTS.sectionTitle.fontSize,
    fontWeight: '700',
    color: COLORS.darkText,
    marginBottom: 4,
  },
  restaurantName: {
    fontSize: FONTS.body.fontSize,
    color: COLORS.gray,
    marginBottom: 8,
  },
  orderDetails: {
    fontSize: FONTS.small.fontSize,
    color: COLORS.darkText,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: COLORS.success,
  },
  declineButton: {
    backgroundColor: COLORS.lightBg,
  },
  buttonText: {
    fontSize: FONTS.button.fontSize,
    fontWeight: FONTS.button.fontWeight,
    color: COLORS.white,
  },
  declineText: {
    color: COLORS.darkText,
  },
  liveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
    marginRight: 8,
  },
  liveText: {
    fontSize: FONTS.small.fontSize,
    fontWeight: '700',
    color: COLORS.danger,
  },
  customerName: {
    fontSize: FONTS.body.fontSize,
    color: COLORS.darkText,
    marginBottom: 4,
  },
  address: {
    fontSize: FONTS.small.fontSize,
    color: COLORS.gray,
    marginBottom: 12,
  },
  mapPlaceholder: {
    height: 200,
    backgroundColor: COLORS.lightBg,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  mapText: {
    fontSize: FONTS.body.fontSize,
    color: COLORS.gray,
    marginTop: 8,
  },
  timeRemaining: {
    marginBottom: 12,
  },
  timeText: {
    fontSize: FONTS.body.fontSize,
    fontWeight: '600',
    color: COLORS.warning,
  },
  deliveryActions: {
    gap: 8,
  },
  fullButton: {
    height: 48,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  deliveredButton: {
    backgroundColor: COLORS.success,
  },
  callButton: {
    backgroundColor: COLORS.info,
  },
  fullButtonText: {
    fontSize: FONTS.button.fontSize,
    fontWeight: FONTS.button.fontWeight,
    color: COLORS.white,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: FONTS.sectionTitle.fontSize,
    fontWeight: '600',
    color: COLORS.darkText,
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: FONTS.body.fontSize,
    color: COLORS.gray,
    marginBottom: 20,
  },
  acceptOrdersButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  acceptOrdersText: {
    fontSize: FONTS.button.fontSize,
    fontWeight: FONTS.button.fontWeight,
    color: COLORS.white,
  },
});
