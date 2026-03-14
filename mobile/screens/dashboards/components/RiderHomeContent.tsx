import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DeliveryCard from './DeliveryCard';
import LiveMap from './LiveMap';
import { extractDeliveryCoordinates, hasValidCoordinates } from '../../../utils/riderCoordinateExtractor';

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

interface Delivery {
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
  // Map coordinates
  pickupCoords?: { latitude: number; longitude: number };
  deliveryCoords?: { latitude: number; longitude: number };
}

interface RiderHomeContentProps {
  deliveries: Delivery[];
  hasActiveDeliveries: boolean;
  onAcceptOrders: () => void;
  onAcceptDelivery?: (deliveryId: string) => void;
  onViewDeliveryDetails?: (delivery: Delivery) => void;
  onMarkDelivered?: (deliveryId: string) => void;
  onStartRide?: (deliveryId: string) => void;
  onNavigateToPickup?: (deliveryId: string) => void;
  onNavigateToDelivery?: (deliveryId: string) => void;
  onCallCustomer?: (phone: string) => void;
  isLoading?: boolean;
}

const BENEFITS = [
  { icon: 'flash', text: 'Quick acceptance, instant earning', color: COLORS.warning },
  { icon: 'time', text: 'Flexible delivery schedule', color: COLORS.info },
  { icon: 'star', text: 'Build your rating & reputation', color: COLORS.success },
];

const RiderHomeContent: React.FC<RiderHomeContentProps> = ({
  deliveries,
  hasActiveDeliveries,
  onAcceptOrders,
  onAcceptDelivery,
  onViewDeliveryDetails,
  onMarkDelivered,
  onStartRide,
  onNavigateToPickup,
  onNavigateToDelivery,
  onCallCustomer,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="sync" size={40} color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading deliveries...</Text>
      </View>
    );
  }

  if (!hasActiveDeliveries || deliveries.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.emptyStateContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Empty State Container */}
        <View style={styles.emptyStateCard}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="location" size={50} color={COLORS.primary} />
          </View>

          {/* Title */}
          <Text style={styles.emptyTitle}>No Active Deliveries</Text>

          {/* Subtitle */}
          <Text style={styles.emptySubtitle}>
            You're ready to accept orders and start earning!
          </Text>

          {/* Benefits List */}
          <View style={styles.benefitsContainer}>
            {BENEFITS.map((benefit, index) => (
              <View key={index} style={styles.benefitItem}>
                <Ionicons name={benefit.icon as any} size={20} color={benefit.color} />
                <Text style={styles.benefitText}>{benefit.text}</Text>
              </View>
            ))}
          </View>

          {/* Accept Orders Button */}
          <TouchableOpacity
            onPress={onAcceptOrders}
            style={styles.acceptButton}
            activeOpacity={0.8}
          >
            <Text style={styles.acceptButtonText}>Accept Orders</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Get active delivery for map (first assigned / picked_up / in_delivery with valid coordinates)
  const activeDeliveryForMap = deliveries.find((d) => {
    const isActiveStatus = d.status === 'assigned' || d.status === 'picked_up' || d.status === 'in_delivery';
    const hasCoords = hasValidCoordinates(d);
    
    if (isActiveStatus) {
      console.log(`[Map Decision] Order ${d.orderNumber}:`, {
        status: d.status,
        hasCoords: hasCoords ? '✅ Yes' : '❌ No',
        willShowMap: hasCoords ? '✅ Yes' : '❌ No - coords missing'
      });
    }
    
    return isActiveStatus && hasCoords;
  });

  // Show active deliveries
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.deliveriesContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Live Map for Active Delivery */}
      {activeDeliveryForMap && (
        <View style={styles.mapContainer}>
          <Text style={styles.mapTitle}>Live Tracking</Text>
          <LiveMap
            pickupLocation={extractDeliveryCoordinates(activeDeliveryForMap).pickup || undefined}
            deliveryLocation={extractDeliveryCoordinates(activeDeliveryForMap).delivery || undefined}
            onLocationUpdate={(location) => {
              console.log('Location updated:', location);
            }}
            style={styles.map}
          />
          <View style={styles.mapInfo}>
            <View style={styles.mapInfoItem}>
              <Ionicons name="location" size={16} color={COLORS.primary} />
              <Text style={styles.mapInfoText} numberOfLines={1}>
                {activeDeliveryForMap.pickupLocation}
              </Text>
            </View>
            <View style={styles.mapInfoItem}>
              <Ionicons name="flag" size={16} color={COLORS.success} />
              <Text style={styles.mapInfoText} numberOfLines={1}>
                {activeDeliveryForMap.deliveryLocation}
              </Text>
            </View>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>Active Deliveries</Text>
      {deliveries.map((delivery) => (
        <DeliveryCard
          key={delivery._id}
          delivery={delivery}
          onAccept={() => onAcceptDelivery?.(delivery._id)}
          onViewDetails={() => onViewDeliveryDetails?.(delivery)}
          onMarkDelivered={() => onMarkDelivered?.(delivery._id)}
          onStartRide={() => onStartRide?.(delivery._id)}
          onNavigateToPickup={() => onNavigateToPickup?.(delivery._id)}
          onNavigateToDelivery={() => onNavigateToDelivery?.(delivery._id)}
          onCallCustomer={() => onCallCustomer?.(delivery.customerPhone || '')}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.gray,
  },
  emptyStateContent: {
    paddingHorizontal: isSmallScreen ? 12 : 16,
    paddingVertical: 24,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '80%',
  },
  emptyStateCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    width: '100%',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: 24,
    gap: 10,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.lightBg,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  benefitText: {
    fontSize: 14,
    color: COLORS.darkText,
    marginLeft: 12,
    flex: 1,
  },
  acceptButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  deliveriesContent: {
    paddingHorizontal: isSmallScreen ? 12 : 16,
    paddingVertical: 16,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginBottom: 16,
  },
  mapContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.darkText,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  map: {
    height: 200,
  },
  mapInfo: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  mapInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  mapInfoText: {
    fontSize: 13,
    color: COLORS.darkText,
    marginLeft: 8,
    flex: 1,
  },
});

export default RiderHomeContent;
