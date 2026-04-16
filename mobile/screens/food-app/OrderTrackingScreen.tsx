import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import api from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { getSocket } from '../../services/realtimeService';

const STATUS_STEPS = [
  { id: 'PENDING', label: 'Order Placed' },
  { id: 'KITCHEN_ACCEPTED', label: 'Kitchen Accepted' },
  { id: 'PREPARING', label: 'Being Prepared' },
  { id: 'READY', label: 'Ready' },
  { id: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { id: 'DELIVERED', label: 'Delivered' },
  { id: 'SERVED', label: 'Served' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

type OrderItem = {
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  hasDeal?: boolean;
  product?: { name?: string; imageUrl?: string };
};

type Order = {
  _id: string;
  orderNumber?: string;
  status?: string;
  createdAt?: string;
  branch?: { branchName?: string };
  orderType?: string;
  items?: OrderItem[];
  totalAmount?: number;
  finalAmount?: number;
};

const normalizeStatus = (s: any) => String(s || '').toUpperCase();

const getStepIndex = (status: string) => {
  const idx = STATUS_STEPS.findIndex((x) => x.id === status);
  return idx >= 0 ? idx : 0;
};

export default function OrderTrackingScreen() {
  const navigation = useNavigation() as any;
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { formatPrice } = useSettings();

  const orderId = (route.params as any)?.orderId as string | undefined;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      const res = await api.get(`/orders/${orderId}`);
      const data = res?.data?.data ?? res?.data;
      setOrder(data || null);
    } catch (e) {
      console.error('[OrderTracking] Failed to load order:', e);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Refresh tracking screen when a notification arrives for this order.
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !orderId) return;

    const onNotification = (notif: any) => {
      const relatedOrderId = notif?.data?.orderId || notif?.data?.order?._id || notif?.data?.orderId?.toString();
      if (String(relatedOrderId || '') === String(orderId)) {
        fetchOrder();
      }
    };

    socket.on('notification', onNotification);
    return () => {
      socket.off('notification', onNotification);
    };
  }, [fetchOrder, orderId]);

  const status = normalizeStatus(order?.status);
  const currentIndex = getStepIndex(status);

  const visibleSteps = useMemo(() => {
    // If cancelled, show only a simple timeline ending in cancelled.
    if (status === 'CANCELLED') {
      return [
        { id: 'PENDING', label: 'Order Placed' },
        { id: 'CANCELLED', label: 'Cancelled' },
      ];
    }

    // For dine-in, we typically don't show delivery steps.
    const isDelivery = normalizeStatus(order?.orderType) === 'DELIVERY';
    return STATUS_STEPS.filter((s) => {
      if (!isDelivery && (s.id === 'OUT_FOR_DELIVERY' || s.id === 'DELIVERED')) return false;
      if (s.id === 'SERVED' || s.id === 'COMPLETED') return !isDelivery; // dine-in completion path
      return ['PENDING', 'KITCHEN_ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'SERVED', 'COMPLETED', 'CANCELLED'].includes(s.id);
    });
  }, [order?.orderType, status]);

  const items = Array.isArray(order?.items) ? order!.items! : [];

  const mappedItems = useMemo(() => {
    const dealItems = items.filter((it) => Boolean((it as any)?.hasDeal));
    const normalItems = items.filter((it) => !Boolean((it as any)?.hasDeal));

    const normalMapped = normalItems.map((it) => {
      const product = it?.product;
      const name = it?.productName || product?.name || 'Item';
      const quantity = Number(it?.quantity) || 1;
      const unitPrice = Number((it as any)?.unitPrice ?? 0);
      const totalPrice = Number((it as any)?.totalPrice ?? unitPrice * quantity);
      const imageUrl = product?.imageUrl;
      return { name, quantity, unitPrice, totalPrice, imageUrl, isDeal: false };
    });

    if (dealItems.length === 0) return normalMapped;

    const dealTotal = dealItems.reduce((sum, it) => {
      const qty = Number((it as any)?.quantity) || 1;
      const unit = Number((it as any)?.unitPrice ?? 0);
      const line = Number((it as any)?.totalPrice ?? unit * qty);
      return sum + (Number.isFinite(line) ? line : 0);
    }, 0);

    return [
      ...normalMapped,
      {
        name: 'Deal',
        quantity: 1,
        unitPrice: dealTotal,
        totalPrice: dealTotal,
        imageUrl: undefined,
        isDeal: true,
      },
    ];
  }, [items]);

  const total = Number(order?.totalAmount ?? order?.finalAmount ?? 0);

  const getFullImageUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = api.getBaseURL().replace(/\/?api\/?$/, '');
    if (!base) return url;
    if (url.startsWith('/')) return `${base}${url}`;
    return `${base}/${url.replace(/^\/+/, '')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: spacing.lg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text_dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Order</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !order ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyText}>Order not found</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Order Info */}
          <View style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderId}>#{order.orderNumber || String(order._id).slice(-6).toUpperCase()}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{status || 'PENDING'}</Text>
              </View>
            </View>
          </View>

          {/* Status Timeline */}
          <View style={styles.timelineCard}>
            <Text style={styles.sectionTitle}>Order Status</Text>
            {visibleSteps.map((step, index) => {
              const stepIdx = getStepIndex(step.id);
              const completed = status !== 'CANCELLED' && stepIdx <= currentIndex;
              const active = status === step.id;
              return (
                <View key={step.id} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View
                      style={[
                        styles.timelineDot,
                        completed && styles.timelineDotCompleted,
                        active && styles.timelineDotActive,
                      ]}
                    >
                      {completed && <Ionicons name="checkmark" size={12} color={colors.white} />}
                      {active && !completed && <Text style={styles.activeArrow}>→</Text>}
                    </View>
                    {index < visibleSteps.length - 1 && (
                      <View style={[styles.timelineLine, completed && styles.timelineLineCompleted]} />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text
                      style={[
                        styles.timelineLabel,
                        completed && styles.timelineLabelCompleted,
                        active && styles.timelineLabelActive,
                      ]}
                    >
                      {step.label}
                    </Text>
                    {active ? (
                      <Text style={styles.timelineTime}>In progress</Text>
                    ) : completed ? (
                      <Text style={styles.timelineTime}>Done</Text>
                    ) : (
                      <Text style={styles.timelinePending}>Pending</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Order Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            {mappedItems.map((it, idx) => (
              <View key={`${it.name}-${idx}`} style={styles.summaryRow}>
                <View style={styles.summaryLeft}>
                  {it.imageUrl ? (
                    <Image source={{ uri: getFullImageUrl(it.imageUrl) }} style={styles.summaryImage} />
                  ) : (
                    <View style={styles.summaryImagePlaceholder}>
                      <Ionicons name="restaurant-outline" size={18} color={colors.gray_400} />
                    </View>
                  )}
                  <Text style={styles.summaryText} numberOfLines={1}>
                    {it.quantity}× {it.name}
                  </Text>
                </View>
                <Text style={styles.summaryPrice}>{formatPrice((it as any).totalPrice ?? ((it as any).unitPrice ?? 0) * (it as any).quantity)}</Text>
              </View>
            ))}

            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatPrice(total)}</Text>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
  },
  headerTitle: { fontSize: typography.sizes.h3, fontWeight: typography.weights.bold, color: colors.text_dark },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: typography.sizes.body, color: colors.text_medium },
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
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  summaryLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: spacing.sm },
  summaryImage: { width: 34, height: 34, borderRadius: borderRadius.sm, marginRight: spacing.sm },
  summaryImagePlaceholder: { width: 34, height: 34, borderRadius: borderRadius.sm, backgroundColor: colors.gray_100, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  summaryPrice: { fontSize: typography.sizes.body, fontWeight: typography.weights.medium, color: colors.text_dark },
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
