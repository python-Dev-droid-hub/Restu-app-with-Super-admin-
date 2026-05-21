import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isSmallScreen = SCREEN_WIDTH < 375;

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

interface DeliveryCardProps {
  delivery: {
    _id: string;
    orderNumber: string;
    customerName: string;
    pickupLocation: string;
    deliveryLocation: string;
    distance: number;
    estimatedTime: number;
    estimatedEarning: number;
    status: 'pending' | 'assigned' | 'picked_up' | 'in_delivery' | 'delivered' | 'cancelled' | 'completed';
    customerPhone?: string;
  };
  onAccept?: () => void;
  onViewDetails?: () => void;
  onMarkDelivered?: () => void;
  onStartRide?: () => void;
  onNavigateToPickup?: () => void;
  onNavigateToDelivery?: () => void;
  onCallCustomer?: () => void;
  onReject?: () => void;
  onPickUp?: () => void;
  formatPrice?: (price: number) => string;
  proximity?: {
    branchDistanceMeters?: number | null;
    deliveryDistanceMeters?: number | null;
    canPickUp?: boolean;
    canDeliver?: boolean;
    pickupRangeMeters?: number;
    deliveryRangeMeters?: number;
  };
}

const DeliveryCard: React.FC<DeliveryCardProps> = ({
  delivery,
  onAccept,
  onViewDetails,
  onMarkDelivered,
  onStartRide,
  onNavigateToPickup,
  onNavigateToDelivery,
  onCallCustomer,
  onReject,
  onPickUp,
  formatPrice = (p) => `$${p.toFixed(2)}`,
  proximity,
}) => {
  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return COLORS.warning;
      case 'assigned':
        return COLORS.info;
      case 'picked_up':
      case 'in_delivery':
        return COLORS.primary;
      case 'delivered':
      case 'completed':
        return COLORS.success;
      case 'cancelled':
        return COLORS.danger;
      default:
        return COLORS.gray;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending Pickup';
      case 'assigned':
        return 'Assigned';
      case 'picked_up':
        return 'Picked Up';
      case 'in_delivery':
        return 'In Delivery';
      case 'delivered':
        return 'Delivered';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const isActive = delivery.status === 'assigned' || delivery.status === 'picked_up' || delivery.status === 'in_delivery';
  const isPending = delivery.status === 'pending';
  const canStartRide = delivery.status === 'picked_up';
  const branchDist = proximity?.branchDistanceMeters;
  const deliveryDist = proximity?.deliveryDistanceMeters;
  const canPickUp = proximity?.canPickUp ?? false;
  const canDeliver = proximity?.canDeliver ?? false;

  return (
    <TouchableOpacity
      onPress={onViewDetails}
      style={[
        styles.card,
        { borderLeftColor: getStatusColor(delivery.status) },
      ]}
      activeOpacity={0.9}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.orderNumber}>{delivery.orderNumber}</Text>
          <Text style={styles.customerName}>{delivery.customerName}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(delivery.status) + '20', borderColor: getStatusColor(delivery.status) },
          ]}
        >
          <Text style={[styles.statusText, { color: getStatusColor(delivery.status) }]}>
            {getStatusLabel(delivery.status)}
          </Text>
        </View>
      </View>

      {/* Locations */}
      <View style={styles.locationsContainer}>
        {/* Pickup */}
        <View style={styles.locationRow}>
          <Ionicons name="location" size={16} color={COLORS.primary} style={styles.locationIcon} />
          <View style={styles.locationTextContainer}>
            <Text style={styles.locationLabel}>Pickup</Text>
            <Text style={styles.locationText}>{delivery.pickupLocation}</Text>
          </View>
        </View>

        {/* Distance line */}
        <View style={styles.distanceLine} />

        {/* Delivery */}
        <View style={styles.locationRow}>
          <Ionicons name="location" size={16} color={COLORS.success} style={styles.locationIcon} />
          <View style={styles.locationTextContainer}>
            <Text style={styles.locationLabel}>Delivery</Text>
            <Text style={styles.locationText}>{delivery.deliveryLocation}</Text>
          </View>
        </View>
      </View>

      {/* Details */}
      <View style={styles.detailsContainer}>
        <View style={styles.detailItem}>
          <Ionicons name="navigate" size={16} color={COLORS.primary} />
          <Text style={styles.detailValue}>{delivery.distance} km</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="time" size={16} color={COLORS.warning} />
          <Text style={styles.detailValue}>{delivery.estimatedTime} min</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="cash" size={16} color={COLORS.success} />
          <Text style={[styles.detailValue, { color: COLORS.success }]}>
            {formatPrice(delivery.estimatedEarning || 0)}
          </Text>
        </View>
      </View>

      {delivery.status === 'assigned' && branchDist != null && (
        <View style={styles.proximityBanner}>
          <Text style={styles.proximityText}>
            {canPickUp
              ? 'At branch ✓ — ready to pick up'
              : `Reach branch to pick up (${Math.round(branchDist)}m away)`}
          </Text>
        </View>
      )}

      {delivery.status === 'in_delivery' && deliveryDist != null && (
        <View style={styles.proximityBanner}>
          <Text style={styles.proximityText}>
            {canDeliver
              ? 'Near customer ✓ — ready to deliver'
              : `Reach customer to deliver (${Math.round(deliveryDist)}m away)`}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      {isPending && (
        <TouchableOpacity onPress={onAccept} style={styles.acceptButton} activeOpacity={0.8}>
          <Text style={styles.acceptButtonText}>Accept Delivery</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.white} />
        </TouchableOpacity>
      )}

      {isActive && (
        <View style={styles.activeActions}>
          {delivery.status === 'assigned' && onPickUp && (
            <TouchableOpacity
              onPress={onPickUp}
              style={[styles.startRideButton, !canPickUp && styles.disabledBtn]}
              activeOpacity={canPickUp ? 0.8 : 1}
              disabled={!canPickUp}
            >
              <Ionicons name="bag-check" size={20} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Mark Picked Up</Text>
            </TouchableOpacity>
          )}
          {canStartRide && (
            <TouchableOpacity onPress={onStartRide} style={styles.startRideButton} activeOpacity={0.8}>
              <Ionicons name="bicycle" size={20} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Start Ride</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onNavigateToPickup} style={styles.navigateButton} activeOpacity={0.8}>
            <Ionicons name="restaurant" size={20} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Pickup</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onNavigateToDelivery} style={styles.navigateButton} activeOpacity={0.8}>
            <Ionicons name="navigate" size={20} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Delivery</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onMarkDelivered}
            style={[styles.deliveredButton, delivery.status === 'in_delivery' && !canDeliver && styles.disabledBtn]}
            activeOpacity={delivery.status === 'in_delivery' && !canDeliver ? 1 : 0.8}
            disabled={delivery.status === 'in_delivery' && !canDeliver}
          >
            <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Mark Delivered</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onCallCustomer} style={styles.callButton} activeOpacity={0.8}>
            <Ionicons name="call" size={20} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Call</Text>
          </TouchableOpacity>
          {delivery.status === 'assigned' && onReject && (
            <TouchableOpacity onPress={onReject} style={styles.rejectButton} activeOpacity={0.8}>
              <Ionicons name="close-circle" size={20} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    marginHorizontal: isSmallScreen ? 12 : 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.darkText,
  },
  customerName: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderLeftWidth: 2,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  locationsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 10,
    color: COLORS.gray,
  },
  locationText: {
    fontSize: 13,
    color: COLORS.darkText,
    fontWeight: '500',
  },
  distanceLine: {
    height: 24,
    width: 2,
    backgroundColor: COLORS.lightGray,
    marginLeft: 7,
    marginVertical: 4,
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginTop: 4,
  },
  acceptButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.white,
    marginRight: 8,
  },
  activeActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  startRideButton: {
    flexGrow: 1,
    flexBasis: '48%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  navigateButton: {
    flexGrow: 1,
    flexBasis: '48%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.info,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  proximityBanner: {
    backgroundColor: '#FFF8E6',
    padding: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  proximityText: {
    fontSize: 12,
    color: COLORS.darkText,
    fontWeight: '600',
  },
  disabledBtn: {
    opacity: 0.45,
  },
  deliveredButton: {
    flexGrow: 1,
    flexBasis: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  callButton: {
    flexGrow: 1,
    flexBasis: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.warning,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  rejectButton: {
    flexGrow: 1,
    flexBasis: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});

export default DeliveryCard;
