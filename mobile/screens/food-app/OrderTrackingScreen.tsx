import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { formatPriceDecimal, formatTime } from '../../utils/formatHelpers';

const ORDER_STATUS = [
  { id: 'confirmed', label: 'Order Confirmed', time: '2:30 PM', completed: true },
  { id: 'preparing', label: 'Being Prepared', time: '2:35 PM', completed: true },
  { id: 'ready', label: 'Ready for Pickup', time: '2:45 PM', completed: true, active: true },
  { id: 'delivery', label: 'Out for Delivery', time: '', completed: false },
  { id: 'delivered', label: 'Delivered', time: '', completed: false },
];

export default function OrderTrackingScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text_dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Order</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Order Info */}
        <View style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <Text style={styles.orderId}>Order #12345</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Order Confirmed</Text>
            </View>
          </View>
          <Text style={styles.orderDate}>Oct 5, 2:30 PM</Text>
        </View>

        {/* Restaurant Info */}
        <View style={styles.restaurantCard}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=100&h=100&fit=crop' }}
            style={styles.restaurantImage}
          />
          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName}>Kabab Jees</Text>
            <View style={styles.restaurantMeta}>
              <Ionicons name="location" size={14} color={colors.gray_500} />
              <Text style={styles.restaurantText}>2.5 km away</Text>
            </View>
            <View style={styles.restaurantMeta}>
              <Ionicons name="time" size={14} color={colors.gray_500} />
              <Text style={styles.restaurantText}>25 mins delivery</Text>
            </View>
          </View>
        </View>

        {/* Status Timeline */}
        <View style={styles.timelineCard}>
          <Text style={styles.sectionTitle}>Order Status</Text>
          {ORDER_STATUS.map((status, index) => (
            <View key={status.id} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={[
                  styles.timelineDot,
                  status.completed && styles.timelineDotCompleted,
                  status.active && styles.timelineDotActive,
                ]}>
                  {status.completed && <Ionicons name="checkmark" size={12} color={colors.white} />}
                  {status.active && <Text style={styles.activeArrow}>→</Text>}
                </View>
                {index < ORDER_STATUS.length - 1 && (
                  <View style={[
                    styles.timelineLine,
                    status.completed && styles.timelineLineCompleted,
                  ]} />
                )}
              </View>
              <View style={styles.timelineContent}>
                <Text style={[
                  styles.timelineLabel,
                  status.completed && styles.timelineLabelCompleted,
                  status.active && styles.timelineLabelActive,
                ]}>
                  {status.label}
                </Text>
                {status.time ? (
                  <Text style={styles.timelineTime}>{status.time}</Text>
                ) : (
                  <Text style={styles.timelinePending}>Pending</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Delivery Partner */}
        <View style={styles.deliveryCard}>
          <Text style={styles.sectionTitle}>Delivery Partner</Text>
          <View style={styles.partnerRow}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop' }}
              style={styles.partnerAvatar}
            />
            <View style={styles.partnerInfo}>
              <Text style={styles.partnerName}>Ahmed (Driver)</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color={colors.warning} />
                <Text style={styles.partnerRating}>4.9</Text>
              </View>
              <Text style={styles.partnerStatus}>Currently 2.3 km away</Text>
            </View>
          </View>
          <View style={styles.partnerActions}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="map" size={20} color={colors.info} />
              <Text style={styles.actionText}>Live Map</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="call" size={20} color={colors.success} />
              <Text style={styles.actionText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="chatbubble" size={20} color={colors.gray_500} />
              <Text style={styles.actionText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryText}>• Chicken Biryani (Regular) ×2</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryText}>• Tandoori Chicken (Half) ×1</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryText}>• Coke (Large) ×2</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPriceDecimal(705.5)}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.reorderButton}>
            <Text style={styles.reorderText}>REORDER</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.supportButton}>
            <Text style={styles.supportText}>CONTACT SUPPORT</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
  headerTitle: { fontSize: typography.sizes.h3, fontWeight: typography.weights.bold, color: colors.text_dark },
  orderCard: { backgroundColor: colors.white, marginHorizontal: spacing.lg, padding: spacing.lg, borderRadius: borderRadius.lg, ...shadows.light },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontSize: typography.sizes.h4, fontWeight: typography.weights.bold, color: colors.text_dark },
  statusBadge: { backgroundColor: colors.info + '20', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  statusText: { fontSize: typography.sizes.xs, color: colors.info, fontWeight: typography.weights.bold },
  orderDate: { fontSize: typography.sizes.small, color: colors.text_medium, marginTop: spacing.xs },
  restaurantCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.lg, borderRadius: borderRadius.lg, ...shadows.light },
  restaurantImage: { width: 60, height: 60, borderRadius: borderRadius.md },
  restaurantInfo: { marginLeft: spacing.md, flex: 1 },
  restaurantName: { fontSize: typography.sizes.h4, fontWeight: typography.weights.bold, color: colors.text_dark },
  restaurantMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  restaurantText: { fontSize: typography.sizes.small, color: colors.text_medium, marginLeft: 4 },
  timelineCard: { backgroundColor: colors.white, marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.lg, borderRadius: borderRadius.lg, ...shadows.light },
  sectionTitle: { fontSize: typography.sizes.h4, fontWeight: typography.weights.bold, color: colors.text_dark, marginBottom: spacing.md },
  timelineItem: { flexDirection: 'row' },
  timelineLeft: { alignItems: 'center', width: 40 },
  timelineDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.gray_300, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white },
  timelineDotCompleted: { backgroundColor: colors.success, borderColor: colors.success },
  timelineDotActive: { backgroundColor: colors.warning, borderColor: colors.warning },
  activeArrow: { color: colors.white, fontSize: 12, fontWeight: 'bold' },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.gray_200, marginVertical: 4 },
  timelineLineCompleted: { backgroundColor: colors.success },
  timelineContent: { flex: 1, paddingBottom: spacing.lg },
  timelineLabel: { fontSize: typography.sizes.body, color: colors.gray_500 },
  timelineLabelCompleted: { color: colors.text_dark, fontWeight: typography.weights.medium },
  timelineLabelActive: { color: colors.warning, fontWeight: typography.weights.bold },
  timelineTime: { fontSize: typography.sizes.small, color: colors.text_medium, marginTop: 2 },
  timelinePending: { fontSize: typography.sizes.small, color: colors.gray_400, marginTop: 2 },
  deliveryCard: { backgroundColor: colors.white, marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.lg, borderRadius: borderRadius.lg, ...shadows.light },
  partnerRow: { flexDirection: 'row', alignItems: 'center' },
  partnerAvatar: { width: 50, height: 50, borderRadius: 25 },
  partnerInfo: { marginLeft: spacing.md, flex: 1 },
  partnerName: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text_dark },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  partnerRating: { fontSize: typography.sizes.small, color: colors.text_dark, marginLeft: 4 },
  partnerStatus: { fontSize: typography.sizes.small, color: colors.text_medium, marginTop: 2 },
  partnerActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.md },
  actionButton: { alignItems: 'center', padding: spacing.sm },
  actionText: { fontSize: typography.sizes.small, color: colors.text_medium, marginTop: 4 },
  summaryCard: { backgroundColor: colors.white, marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.lg, borderRadius: borderRadius.lg, ...shadows.light },
  summaryItem: { marginBottom: spacing.xs },
  summaryText: { fontSize: typography.sizes.body, color: colors.text_dark },
  divider: { height: 1, backgroundColor: colors.gray_200, marginVertical: spacing.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: typography.sizes.h4, fontWeight: typography.weights.bold, color: colors.text_dark },
  totalValue: { fontSize: typography.sizes.h4, fontWeight: typography.weights.bold, color: colors.primary },
  actionsContainer: { flexDirection: 'row', paddingHorizontal: spacing.lg, marginTop: spacing.md, gap: spacing.sm },
  reorderButton: { flex: 1, backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },
  reorderText: { color: colors.white, fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
  supportButton: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray_300, paddingVertical: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },
  supportText: { color: colors.text_dark, fontSize: typography.sizes.body, fontWeight: typography.weights.medium },
});
