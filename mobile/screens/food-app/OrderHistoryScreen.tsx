import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { formatDate } from '../../utils/formatHelpers';
import { useSettings } from '../../context/SettingsContext';
import api from '../../services/api';

// Get API base URL for images
const API_BASE_URL = __DEV__
  ? 'http://192.168.0.140:3000'
  : 'https://your-production-api.com';

interface Order {
  _id: string;
  orderNumber: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  totalAmount: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
  createdAt: string;
  branchName?: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'delivered': return colors.success;
    case 'cancelled': return colors.danger;
    case 'out_for_delivery': return colors.info;
    case 'ready': return colors.warning;
    default: return colors.primary;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending': return 'Pending';
    case 'confirmed': return 'Confirmed';
    case 'preparing': return 'Preparing';
    case 'ready': return 'Ready';
    case 'out_for_delivery': return 'Out for Delivery';
    case 'delivered': return 'Delivered';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
};

// Helper to get full image URL
const getImageUrl = (imagePath?: string): string | undefined => {
  if (!imagePath) return undefined;
  
  // If it's already a full URL, return it
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // If it's a relative path, prepend the API base URL
  if (imagePath.startsWith('/')) {
    return `${API_BASE_URL}${imagePath}`;
  }
  
  return imagePath;
};

// Order Item Image Component with fallback
const OrderItemImage = ({ imageUrl }: { imageUrl?: string }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const fullUrl = getImageUrl(imageUrl);
  
  if (!fullUrl || error) {
    return (
      <View style={styles.itemImagePlaceholder}>
        <Ionicons name="restaurant-outline" size={20} color={colors.gray_400} />
      </View>
    );
  }
  
  return (
    <View style={styles.imageContainer}>
      <Image 
        source={{ uri: fullUrl }} 
        style={styles.itemImage}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
      />
      {loading && (
        <View style={styles.imageLoadingOverlay}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
    </View>
  );
};

export default function OrderHistoryScreen() {
  const navigation = useNavigation() as any;
  const insets = useSafeAreaInsets();
  const { formatPrice } = useSettings();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'completed'>('all');

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders/my-orders');
      const maybeOrders = response?.data?.data?.orders ?? response?.data?.orders ?? response?.data?.data;
      const rawOrders = Array.isArray(maybeOrders) ? maybeOrders : [];

      const mapped: Order[] = rawOrders.map((o: any) => {
        const rawItems = Array.isArray(o?.items) ? o.items : [];
        const mappedItems = rawItems.map((it: any) => {
          const product = it?.product;
          const name = it?.productName || product?.name || it?.name || 'Item';
          const quantity = Number(it?.quantity) || 1;
          const unitPrice = Number(it?.unitPrice ?? it?.price ?? 0);
          const image = product?.imageUrl || product?.image || it?.image;
          return { name, quantity, price: unitPrice, image };
        });

        const statusRaw = String(o?.status || '').toLowerCase();
        const status = (statusRaw as any) || 'pending';

        return {
          _id: o?._id,
          orderNumber: o?.orderNumber || `ORD-${String(o?._id || '').slice(-6).toUpperCase()}`,
          status,
          totalAmount: Number(o?.totalAmount ?? o?.finalAmount ?? o?.total ?? 0),
          items: mappedItems,
          createdAt: o?.createdAt || o?.created_at || new Date().toISOString(),
          branchName: o?.branch?.branchName || o?.branch?.name || o?.branchName,
        };
      });

      setOrders(mapped);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      // Use mock data if API fails
      setOrders([
        {
          _id: '1',
          orderNumber: 'ORD-001',
          status: 'delivered',
          totalAmount: 850,
          items: [
            { name: 'Chicken Biryani', quantity: 2, price: 250, image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=100&h=100&fit=crop' },
            { name: 'Coca Cola', quantity: 2, price: 60 },
          ],
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          branchName: 'Kabab Jees - North Nazimabad',
        },
        {
          _id: '2',
          orderNumber: 'ORD-002',
          status: 'out_for_delivery',
          totalAmount: 450,
          items: [
            { name: 'Zinger Burger', quantity: 1, price: 150, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=100&h=100&fit=crop' },
            { name: 'Fries', quantity: 1, price: 100 },
          ],
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          branchName: 'KFC - Clifton',
        },
        {
          _id: '3',
          orderNumber: 'ORD-003',
          status: 'preparing',
          totalAmount: 1200,
          items: [
            { name: 'Tandoori Platter', quantity: 1, price: 450, image: 'https://images.unsplash.com/photo-1601058268499-e526861c0f8f?w=100&h=100&fit=crop' },
            { name: 'Naan', quantity: 4, price: 40 },
          ],
          createdAt: new Date().toISOString(),
          branchName: 'BBQ Tonight',
        },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const filteredOrders = orders.filter(order => {
    if (activeFilter === 'active') {
      return ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(order.status);
    }
    if (activeFilter === 'completed') {
      return ['delivered', 'cancelled'].includes(order.status);
    }
    return true;
  });

  const renderOrder = ({ item }: { item: Order }) => (
    <TouchableOpacity 
      style={styles.orderCard}
      onPress={() => navigation.navigate('OrderTracking' as never, { orderId: item._id })}
    >
      {/* Order Header */}
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
          <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      {/* Branch Name */}
      {item.branchName && (
        <Text style={styles.branchName}>{item.branchName}</Text>
      )}

      {/* Items Preview */}
      <View style={styles.itemsContainer}>
        {item.items.slice(0, 3).map((orderItem, index) => (
          <View key={index} style={styles.itemRow}>
            <OrderItemImage imageUrl={orderItem.image} />
            <Text style={styles.itemName} numberOfLines={1}>
              {orderItem.quantity}× {orderItem.name}
            </Text>
            <Text style={styles.itemPrice}>{formatPrice(orderItem.price * orderItem.quantity)}</Text>
          </View>
        ))}
        {item.items.length > 3 && (
          <Text style={styles.moreItems}>+{item.items.length - 3} more items</Text>
        )}
      </View>

      {/* Order Footer */}
      <View style={styles.orderFooter}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalAmount}>{formatPrice(item.totalAmount)}</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {item.status === 'delivered' && (
          <TouchableOpacity style={styles.reorderButton}>
            <Text style={styles.reorderText}>REORDER</Text>
          </TouchableOpacity>
        )}
        {['pending', 'confirmed', 'preparing'].includes(item.status) && (
          <TouchableOpacity style={styles.cancelButton}>
            <Text style={styles.cancelText}>CANCEL</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.trackButton}
          onPress={() => navigation.navigate('OrderTracking' as never, { orderId: item._id })}
        >
          <Text style={styles.trackText}>TRACK ORDER</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: spacing.lg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text_dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['all', 'active', 'completed'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterTab, activeFilter === filter && styles.filterTabActive]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text style={[styles.filterTabText, activeFilter === filter && styles.filterTabTextActive]}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        renderItem={renderOrder}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.ordersList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={80} color={colors.gray_300} />
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter === 'active' 
                ? 'No active orders at the moment' 
                : activeFilter === 'completed' 
                ? 'No completed orders yet'
                : 'Place your first order to see it here'}
            </Text>
            <TouchableOpacity 
              style={styles.browseButton}
              onPress={() => navigation.navigate('Home' as never)}
            >
              <Text style={styles.browseButtonText}>BROWSE MENU</Text>
            </TouchableOpacity>
          </View>
        }
      />
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray_200,
    gap: spacing.sm,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray_100,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    color: colors.text_dark,
  },
  filterTabTextActive: {
    color: colors.white,
  },
  ordersList: { padding: spacing.horizontal, paddingBottom: 100 },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    ...shadows.medium,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  orderNumber: {
    fontSize: typography.sizes.h4,
    fontWeight: typography.weights.bold,
    color: colors.text_dark,
  },
  orderDate: {
    fontSize: typography.sizes.small,
    color: colors.text_medium,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  branchName: {
    fontSize: typography.sizes.small,
    color: colors.text_medium,
    marginBottom: spacing.md,
  },
  itemsContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.gray_100,
    paddingTop: spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
  },
  itemImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray_100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  imageContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
    position: 'relative',
    overflow: 'hidden',
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.gray_100,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  itemName: {
    flex: 1,
    fontSize: typography.sizes.body,
    color: colors.text_dark,
  },
  itemPrice: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    color: colors.text_dark,
  },
  moreItems: {
    fontSize: typography.sizes.small,
    color: colors.text_medium,
    marginTop: spacing.xs,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.gray_100,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  totalLabel: {
    fontSize: typography.sizes.body,
    color: colors.text_medium,
  },
  totalAmount: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  reorderButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  reorderText: {
    color: colors.white,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.gray_100,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.danger,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
  },
  trackButton: {
    flex: 1,
    backgroundColor: colors.info + '15',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  trackText: {
    color: colors.info,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.bold,
    color: colors.text_dark,
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    fontSize: typography.sizes.body,
    color: colors.text_medium,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  browseButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  browseButtonText: {
    color: colors.white,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
});
