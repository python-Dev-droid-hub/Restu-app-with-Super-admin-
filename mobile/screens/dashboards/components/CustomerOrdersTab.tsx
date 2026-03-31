import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Modal,
  Image,
  ScrollView,
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

interface OrderItem {
  _id: string;
  name: string;
  quantity: number;
  price?: number;
  imageUrl?: string;
  image?: string;
  product?: {
    imageUrl?: string;
    image?: string;
    images?: string[];
  };
}

interface Order {
  _id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  branch?: { name: string };
  items?: OrderItem[];
  foodRating?: number;
  deliveryRating?: number;
}

interface CustomerOrdersTabProps {
  formatPrice: (amount: number) => string;
}

export default function CustomerOrdersTab({ formatPrice }: CustomerOrdersTabProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingOrderId, setRatingOrderId] = useState<string | null>(null);
  const [foodRating, setFoodRating] = useState<number>(0);
  const [deliveryRating, setDeliveryRating] = useState<number>(0);
  const [submittingRating, setSubmittingRating] = useState(false);

  // Get full image URL with normalization
  const getFullImageUrl = useCallback((url?: string): string => {
    if (!url) return '';
    const normalized = String(url).replace(/\\/g, '/');
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
    const normalizedPath =
      normalized.startsWith('uploads/') || normalized.startsWith('src/uploads/')
        ? `/${normalized.replace(/^src\//, '')}`
        : normalized;
    const baseUrl = api.getBaseURL().replace(/\/?api\/?$/, '');
    if (normalizedPath.startsWith('/')) return `${baseUrl}${normalizedPath}`;
    return `${baseUrl}/${normalizedPath}`;
  }, []);

  const getItemImage = (item: OrderItem): string => {
    const productImage = item.product?.imageUrl || item.product?.image;
    const itemImage = item.imageUrl || item.image;
    const images = item.product?.images;
    
    if (Array.isArray(images) && images.length > 0) {
      return getFullImageUrl(images[0]);
    }
    return getFullImageUrl(productImage || itemImage);
  };

  const fetchOrders = useCallback(async () => {
    try {
      const response = await api.get('/customer/orders');
      if (response.success && response.data) {
        setOrders(response.data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }, [fetchOrders]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return COLORS.success;
      case 'pending':
        return COLORS.warning;
      case 'preparing':
      case 'kitchen_accepted':
        return COLORS.info;
      case 'ready':
      case 'rider_assigned':
      case 'picked_up':
      case 'out_for_delivery':
        return COLORS.primary;
      case 'cancelled':
        return COLORS.danger;
      default:
        return COLORS.gray;
    }
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

  const filteredOrders = orders.filter((order) => {
    // Filter by status
    if (activeFilter === 'active') {
      const activeStatuses = ['pending', 'preparing', 'ready', 'rider_assigned', 'picked_up', 'out_for_delivery'];
      if (!activeStatuses.includes(order.status?.toLowerCase())) return false;
    }
    if (activeFilter === 'completed') {
      const completedStatuses = ['delivered', 'completed', 'cancelled'];
      if (!completedStatuses.includes(order.status?.toLowerCase())) return false;
    }
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        order.orderNumber?.toLowerCase().includes(query) ||
        order.branch?.name?.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  const isOrderRatable = (order: Order) => {
    return (
      order.status?.toUpperCase() === 'DELIVERED' &&
      !(order.foodRating || order.deliveryRating)
    );
  };

  const openRatingModal = (order: Order) => {
    setRatingOrderId(order._id);
    setFoodRating(0);
    setDeliveryRating(0);
    setRatingModalVisible(true);
  };

  const closeRatingModal = () => {
    setRatingModalVisible(false);
    setRatingOrderId(null);
    setFoodRating(0);
    setDeliveryRating(0);
  };

  const submitRating = async () => {
    if (!ratingOrderId) return;
    if (foodRating < 1 || deliveryRating < 1) return;

    try {
      setSubmittingRating(true);
      const response = await api.put(`/orders/${ratingOrderId}/review`, {
        foodRating,
        deliveryRating,
      });
      if (response.success) {
        closeRatingModal();
        await fetchOrders();
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
    } finally {
      setSubmittingRating(false);
    }
  };

  const renderStars = (value: number, onChange: (v: number) => void) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((v) => (
          <TouchableOpacity
            key={v}
            onPress={() => onChange(v)}
            style={styles.starBtn}
            activeOpacity={0.8}
          >
            <Ionicons
              name={v <= value ? 'star' : 'star-outline'}
              size={22}
              color={v <= value ? COLORS.warning : COLORS.gray}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderOrderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>Order #{item.orderNumber || item._id?.slice(-6)}</Text>
          <Text style={styles.branchName}>{item.branch?.name || 'Restaurant'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status?.replace(/_/g, ' ')}
          </Text>
        </View>
      </View>
      
      {/* Order Items with Images */}
      {item.items && item.items.length > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.itemsScroll}
          contentContainerStyle={styles.itemsScrollContent}
        >
          {item.items.slice(0, 5).map((orderItem, index) => {
            const imageUrl = getItemImage(orderItem);
            return (
              <View key={orderItem._id || index} style={styles.orderItemContainer}>
                {imageUrl ? (
                  <Image 
                    source={{ uri: imageUrl }} 
                    style={styles.orderItemImage}
                    resizeMode="cover"
                    onError={(e) => {
                      console.log('[CustomerOrdersTab] image failed:', imageUrl, e?.nativeEvent?.error);
                    }}
                  />
                ) : (
                  <View style={[styles.orderItemImage, styles.imagePlaceholder]}>
                    <Ionicons name="restaurant" size={20} color={COLORS.gray} />
                  </View>
                )}
                <Text style={styles.orderItemName} numberOfLines={1}>
                  {orderItem.quantity}x {orderItem.name}
                </Text>
              </View>
            );
          })}
          {item.items.length > 5 && (
            <View style={styles.moreItemsContainer}>
              <Text style={styles.moreItemsText}>+{item.items.length - 5}</Text>
            </View>
          )}
        </ScrollView>
      )}
      
      <View style={styles.orderDetails}>
        <Text style={styles.itemCount}>
          {item.items?.length || 0} items
        </Text>
        <Text style={styles.orderAmount}>{formatPrice(item.total)}</Text>
      </View>
      
      <View style={styles.orderFooter}>
        <Ionicons name="time-outline" size={14} color={COLORS.gray} />
        <Text style={styles.orderTime}>{formatTime(item.createdAt)}</Text>
      </View>

      {isOrderRatable(item) ? (
        <TouchableOpacity
          style={styles.rateButton}
          onPress={() => openRatingModal(item)}
          activeOpacity={0.85}
        >
          <Text style={styles.rateButtonText}>Rate Order</Text>
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.gray} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search orders..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.gray}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.gray} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {['all', 'active', 'completed'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterTab, activeFilter === filter && styles.activeFilterTab]}
            onPress={() => setActiveFilter(filter as any)}
          >
            <Text style={[styles.filterText, activeFilter === filter && styles.activeFilterText]}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={60} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>No orders found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try a different search term' : 'Your orders will appear here'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      <Modal
        visible={ratingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeRatingModal}
      >
        <View style={styles.ratingOverlay}>
          <View style={styles.ratingCard}>
            <Text style={styles.ratingTitle}>Rate your order</Text>

            <Text style={styles.ratingLabel}>Food Rating</Text>
            {renderStars(foodRating, setFoodRating)}

            <Text style={styles.ratingLabel}>Delivery Rating</Text>
            {renderStars(deliveryRating, setDeliveryRating)}

            <View style={styles.ratingActions}>
              <TouchableOpacity
                style={[styles.ratingActionBtn, styles.ratingCancelBtn]}
                onPress={closeRatingModal}
                disabled={submittingRating}
              >
                <Text style={styles.ratingCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.ratingActionBtn,
                  styles.ratingSubmitBtn,
                  (foodRating < 1 || deliveryRating < 1 || submittingRating) && styles.ratingSubmitBtnDisabled,
                ]}
                onPress={submitRating}
                disabled={foodRating < 1 || deliveryRating < 1 || submittingRating}
              >
                <Text style={styles.ratingSubmitText}>
                  {submittingRating ? 'Submitting...' : 'Submit'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.darkText,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
  },
  activeFilterTab: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '500',
  },
  activeFilterText: {
    color: COLORS.white,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
    paddingTop: 0,
  },
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginBottom: 4,
  },
  branchName: {
    fontSize: 14,
    color: COLORS.gray,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    marginTop: 12,
  },
  itemsScroll: {
    marginTop: 12,
  },
  itemsScrollContent: {
    gap: 12,
    paddingRight: 16,
  },
  orderItemContainer: {
    alignItems: 'center',
    width: 70,
  },
  orderItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderItemName: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 4,
    textAlign: 'center',
    width: 70,
  },
  moreItemsContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreItemsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.darkText,
  },
  itemCount: {
    fontSize: 14,
    color: COLORS.gray,
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkText,
  },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
  },
  orderTime: {
    fontSize: 12,
    color: COLORS.gray,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 8,
    textAlign: 'center',
  },
  rateButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  rateButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 13,
  },
  ratingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  ratingCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
  },
  ratingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.darkText,
    marginBottom: 12,
  },
  ratingLabel: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 8,
    marginBottom: 6,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starBtn: {
    paddingRight: 6,
    paddingVertical: 4,
  },
  ratingActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  ratingActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  ratingCancelBtn: {
    backgroundColor: COLORS.lightGray,
  },
  ratingCancelText: {
    color: COLORS.darkText,
    fontWeight: '600',
  },
  ratingSubmitBtn: {
    backgroundColor: COLORS.primary,
  },
  ratingSubmitBtnDisabled: {
    opacity: 0.6,
  },
  ratingSubmitText: {
    color: COLORS.white,
    fontWeight: '700',
  },
});
