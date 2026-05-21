import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Modal,
  StatusBar,
  Image,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect, CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalization } from '../../context/LocalizationContext';
import OrderCard from '../../components/orders/OrderCard';
import { getCashierOrders } from '../../services/orderService';
import { useAdminOrdersRealtime } from '../../hooks/useAdminOrdersRealtime';

import { useUserData } from '../../hooks/useUserData';
import { useBranch } from '../../context/BranchContext';
import GlobalBranchBar from '../../components/admin/GlobalBranchBar';

// Components
import ResponsiveHeader from '../../components/layout/ResponsiveHeader';
import ProfileMenu from '../../components/common/ProfileMenu';
import AdminBottomNavigation from '../../components/navigation/AdminBottomNavigation';

// Utils & Constants
import { getSpacing } from '../../utils/responsive';
import { COLORS } from '../../constants/colors';
import { getOrderId, getOrderNumber, ordersMatchTarget } from '../../utils/navigateToOrder';
import { enrichOrderParty } from '../../utils/orderParty';

type OrderStatus = 'all' | 'pending' | 'cancelled' | 'preparing' | 'completed';

interface OrderItem {
  name?: string;
  productName?: string;
  product?: {
    name?: string;
    imageUrl?: string;
    image?: string;
  };
  quantity: number;
  price?: number;
  image?: string;
  unitPrice?: number;
}

interface Order {
  _id: string;
  orderNumber?: string;
  status: string;
  customerName?: string;
  customerEmail?: string;
  total?: number;
  totalAmount?: number;
  createdAt: string;
  items?: OrderItem[];
  orderType?: string;
  tableNumber?: string;
  waiterName?: string;
  partyName?: string;
  table?: {
    tableNumber?: string;
  };
  specialInstructions?: string;
}

function mapAdminOrder(raw: any): Order {
  const e = enrichOrderParty(raw || {});
  return {
    ...(raw || {}),
    _id: String(raw?._id || raw?.id || e.id || ''),
    orderNumber: e.orderNumber || raw?.orderNumber,
    status: String(e.status || raw?.status || ''),
    orderType: e.orderType,
    tableNumber: e.tableNumber || undefined,
    waiterName: e.waiterName || undefined,
    partyName: e.partyName,
    customerName: e.customerName,
    total: Number(e.totalAmount ?? raw?.total ?? raw?.totalAmount ?? 0),
    totalAmount: Number(e.totalAmount ?? raw?.totalAmount ?? raw?.total ?? 0),
    createdAt: String(e.createdAt || raw?.createdAt || ''),
    items: raw?.items,
    specialInstructions: raw?.specialInstructions,
  };
}

type AdminOrdersRouteParams = {
  orderId?: string;
  orderNumber?: string;
  highlightOrder?: boolean;
  openDetails?: boolean;
};

export default function AdminOrdersScreen() {
  const navigation = useNavigation() as any;
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { t } = useLocalization();
  const { userRole, profileImage } = useUserData();
  const { getApiBranchParam, branchRevision, isReady } = useBranch();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<OrderStatus>('all');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const orderOffsetsRef = useRef<Record<string, number>>({});
  const pendingScrollOrderId = useRef<string | null>(null);
  const pendingHighlightRef = useRef<{ orderId?: string; orderNumber?: string; openDetails?: boolean } | null>(
    null
  );

  const scrollToHighlightedOrder = useCallback((orderId: string) => {
    const y = orderOffsetsRef.current[orderId];
    if (y == null || !scrollRef.current) return false;
    scrollRef.current.scrollTo({ y: Math.max(0, y - 16), animated: true });
    return true;
  }, []);

  const openMoreMenu = () => {
    navigation.getParent()?.setParams({ showMoreMenu: true });
  };

  // Get parent tab navigation for bottom nav
  const tabNavigation = navigation.getParent();

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['authToken', 'userRole', 'userData', 'userId']);
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        })
      );
    } catch (e) {
      console.error('[AdminOrdersScreen] Logout error:', e);
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        })
      );
    }
  };

  const applyOrdersFromSocket = useCallback((incoming: unknown[]) => {
    if (!Array.isArray(incoming)) return;
    setOrders(incoming.map((o) => mapAdminOrder(o)));
    setLoading(false);
  }, []);

  const { refresh: refreshOrdersRealtime } = useAdminOrdersRealtime({
    branchId: getApiBranchParam(),
    enabled: isReady,
    onData: applyOrdersFromSocket,
  });

  const fetchOrdersHttp = useCallback(async () => {
    if (!isReady) return;
    setLoading(true);
    try {
      const branchId = getApiBranchParam();
      const result = await getCashierOrders(branchId ? { branchId } : undefined);
      if (result.success && Array.isArray(result.orders)) {
        setOrders(result.orders.map((o) => mapAdminOrder(o)));
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  }, [getApiBranchParam, isReady]);

  useFocusEffect(
    useCallback(() => {
      if (!isReady) return;
      void fetchOrdersHttp();
      refreshOrdersRealtime();
    }, [isReady, branchRevision, fetchOrdersHttp, refreshOrdersRealtime])
  );

  const applyPendingHighlight = useCallback(() => {
    const pending = pendingHighlightRef.current;
    if (!pending || orders.length === 0) return;

    const matched = orders.find((order) => ordersMatchTarget(order, pending));
    if (!matched) return;

    const key = getOrderId(matched) || getOrderNumber(matched);
    if (!key) return;

    pendingScrollOrderId.current = key;
    setHighlightedOrderId(key);
    setActiveTab('all');

    if (pending.openDetails) {
      setDetailOrder(matched);
      setShowOrderDetailModal(true);
    }

    pendingHighlightRef.current = null;
  }, [orders]);

  useFocusEffect(
    useCallback(() => {
      const params = (route.params || {}) as AdminOrdersRouteParams;
      if (params.highlightOrder && (params.orderId || params.orderNumber)) {
        setActiveTab('all');
        pendingHighlightRef.current = {
          orderId: params.orderId,
          orderNumber: params.orderNumber,
          openDetails: params.openDetails ?? true,
        };
        navigation.setParams({
          orderId: undefined,
          orderNumber: undefined,
          highlightOrder: undefined,
          openDetails: undefined,
        });
        applyPendingHighlight();
      }
    }, [navigation, route.params, applyPendingHighlight])
  );

  useEffect(() => {
    applyPendingHighlight();
  }, [orders, applyPendingHighlight]);

  useEffect(() => {
    const targetId = pendingScrollOrderId.current;
    if (!targetId || orders.length === 0) return;

    const tryScroll = () => scrollToHighlightedOrder(targetId);
    const t1 = setTimeout(tryScroll, 80);
    const t2 = setTimeout(() => {
      if (tryScroll()) pendingScrollOrderId.current = null;
    }, 350);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [orders, highlightedOrderId, scrollToHighlightedOrder]);

  useEffect(() => {
    if (!highlightedOrderId) return;
    const timer = setTimeout(() => setHighlightedOrderId(null), 5000);
    return () => clearTimeout(timer);
  }, [highlightedOrderId]);

  const loadOrders = async () => {
    await fetchOrdersHttp();
    refreshOrdersRealtime();
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      if (response.success) {
        Alert.alert('Success', 'Order status updated');
        loadOrders();
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return COLORS.green;
      case 'pending':
        return COLORS.warning;
      case 'preparing':
      case 'confirmed':
        return COLORS.blue;
      case 'cancelled':
        return COLORS.error;
      case 'ready':
        return COLORS.purple;
      default:
        return COLORS.lightText;
    }
  };

  const getFilteredOrders = () => {
    if (activeTab === 'all') return orders;
    if (activeTab === 'completed') {
      return orders.filter((o) => {
        const status = o.status?.toLowerCase();
        return (
          status === 'completed' ||
          status === 'delivered' ||
          status === 'served' ||
          status === 'ready' ||
          status === 'picked_up' ||
          status === 'out_for_delivery'
        );
      });
    }
    if (activeTab === 'preparing') {
      return orders.filter((o) => {
        const status = o.status?.toLowerCase();
        return (
          status === 'preparing' ||
          status === 'confirmed' ||
          status === 'kitchen_accepted' ||
          status === 'kitchen accepted'
        );
      });
    }
    return orders.filter((o) => o.status?.toLowerCase() === activeTab);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `Placed ${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `Placed ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `Placed ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const renderOrderItems = (items?: OrderItem[]) => {
    if (!items || items.length === 0) return null;
    return (
      <View style={styles.itemsContainer}>
        {items.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <View style={styles.itemIconContainer}>
              <Ionicons name="fast-food-outline" size={14} color={COLORS.orange} />
            </View>
            <Text style={styles.itemText}>x{item.quantity} {item.name}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderTab = (tab: OrderStatus, label: string, count?: number) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity
        style={[
          styles.tab, 
          isActive ? styles.tabActive : styles.tabInactive
        ]}
        onPress={() => setActiveTab(tab)}
      >
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
          {label}
        </Text>
        {count !== undefined && (
          <Text style={[styles.tabCount, isActive && styles.tabCountActive]}>
            ({count})
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const filteredOrders = getFilteredOrders();
  const pendingCount = orders.filter(o => o.status?.toLowerCase() === 'pending').length;
  const cancelledCount = orders.filter(o => o.status?.toLowerCase() === 'cancelled').length;
  const completedCount = orders.filter(o => o.status?.toLowerCase() === 'completed' || o.status?.toLowerCase() === 'delivered').length;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      {/* Responsive Header */}
      <ResponsiveHeader
        title={t('orders.title')}
        notificationCount={0}
        profileImage={profileImage}
        onNotificationPress={() => {
          // @ts-ignore
          navigation.navigate('AdminNotifications');
        }}
        onProfilePress={() => setShowProfileMenu(true)}
      />

      <GlobalBranchBar />

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.tabsScroll}
        >
          {renderTab('all', 'All Orders')}
          {renderTab('pending', 'Pending', pendingCount)}
          {renderTab(
            'preparing',
            'Preparing',
            orders.filter((o) => {
              const s = o.status?.toLowerCase();
              return s === 'preparing' || s === 'confirmed' || s === 'kitchen_accepted';
            }).length
          )}
          {renderTab('completed', 'Completed', completedCount)}
          {renderTab('cancelled', 'Cancelled', cancelledCount)}
        </ScrollView>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="cart-outline" size={20} color={COLORS.lightText} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: getSpacing(25) + insets.bottom }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadOrders} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.ordersContainer}>
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order, index) => {
              const orderKey = getOrderId(order) || getOrderNumber(order) || `idx-${index}`;
              const isHighlighted =
                !!highlightedOrderId &&
                (highlightedOrderId === getOrderId(order) || highlightedOrderId === getOrderNumber(order));
              return (
              <View
                key={`order-${orderKey}`}
                collapsable={false}
                onLayout={(e) => {
                  if (!orderKey) return;
                  orderOffsetsRef.current[orderKey] = e.nativeEvent.layout.y;
                  if (pendingScrollOrderId.current === orderKey) {
                    setTimeout(() => {
                      if (scrollToHighlightedOrder(orderKey)) {
                        pendingScrollOrderId.current = null;
                      }
                    }, 50);
                  }
                }}
                style={[styles.orderCardWrap, isHighlighted && styles.orderCardHighlighted]}
              >
              <OrderCard
                order={{
                  id: (order as any).id || order._id,
                  orderNumber:
                    order.orderNumber || (order as any).order_number ||
                    `ORD-${String((order as any).id || order._id || '').slice(-6)}`,
                  status: String(order.status || 'pending').toLowerCase() as any,
                  orderType: order.orderType || 'DINE_IN',
                  tableNumber: order.tableNumber || order.table?.tableNumber,
                  waiterName: order.waiterName,
                  items: (order.items || []).map((item: any, itemIdx: number) => ({
                    id: `${(order as any).id || order._id || 'order'}-${itemIdx}`,
                    quantity: Number(item.quantity) || 1,
                    product: {
                      name: item.productName || item.name || (item.product?.name) || 'Unknown Product',
                      image: item.product?.imageUrl || item.product?.image || item.image,
                    }
                  })) as any,
                  createdAt: order.createdAt,
                  totalAmount: (order.totalAmount ?? order.total) as any,
                  specialInstructions: order.specialInstructions || (order as any).special_instructions || '',
                }}
                onStatusChange={async (orderId, status) => {
                  try {
                    await updateOrderStatus(orderId, status.toUpperCase());
                  } catch (error) {
                    console.error('Error updating order:', error);
                  }
                }}
                role={userRole || 'MANAGER'}
                showPayment={true}
                showActions={order.status?.toLowerCase() !== 'completed' && order.status?.toLowerCase() !== 'cancelled'}
              />
              </View>
            );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={48} color="#ddd" />
              <Text style={styles.emptyText}>{t('orders.noOrders') || 'No orders found'}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showOrderDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOrderDetailModal(false)}
      >
        <View style={styles.detailOverlay}>
          <View style={[styles.detailCard, { paddingBottom: insets.bottom + getSpacing(4) }]}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>Order Details</Text>
              <TouchableOpacity onPress={() => setShowOrderDetailModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.darkText} />
              </TouchableOpacity>
            </View>
            {detailOrder ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.detailOrderNumber}>
                  #{detailOrder.orderNumber || (detailOrder as any).order_number || getOrderId(detailOrder).slice(-6)}
                </Text>
                <Text style={styles.detailMeta}>
                  Status: <Text style={styles.detailMetaValue}>{detailOrder.status}</Text>
                </Text>
                {String(detailOrder.orderType || '').toUpperCase() === 'DINE_IN' && detailOrder.waiterName ? (
                  <Text style={styles.detailMeta}>
                    Waiter: <Text style={styles.detailMetaValue}>{detailOrder.waiterName}</Text>
                  </Text>
                ) : detailOrder.customerName ? (
                  <Text style={styles.detailMeta}>
                    Customer: <Text style={styles.detailMetaValue}>{detailOrder.customerName}</Text>
                  </Text>
                ) : null}
                {(detailOrder.tableNumber || detailOrder.table?.tableNumber) ? (
                  <Text style={styles.detailMeta}>
                    Table:{' '}
                    <Text style={styles.detailMetaValue}>
                      {detailOrder.tableNumber || detailOrder.table?.tableNumber}
                    </Text>
                  </Text>
                ) : null}
                <Text style={styles.detailMeta}>
                  Total:{' '}
                  <Text style={styles.detailMetaValue}>
                    {(detailOrder.totalAmount ?? detailOrder.total ?? 0).toFixed(2)}
                  </Text>
                </Text>
                <Text style={styles.detailSectionTitle}>Items</Text>
                {(detailOrder.items || []).map((item, itemIndex) => (
                  <View key={`detail-item-${itemIndex}`} style={styles.detailItemRow}>
                    <Text style={styles.detailItemText}>
                      x{item.quantity}{' '}
                      {item.productName || item.name || item.product?.name || 'Item'}
                    </Text>
                  </View>
                ))}
                {detailOrder.specialInstructions ? (
                  <>
                    <Text style={styles.detailSectionTitle}>Special instructions</Text>
                    <Text style={styles.detailInstructions}>{detailOrder.specialInstructions}</Text>
                  </>
                ) : null}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Profile Menu Modal */}
      <ProfileMenu
        visible={showProfileMenu}
        onClose={() => setShowProfileMenu(false)}
        navigation={navigation}
        onLogout={handleLogout}
      />

      {/* Bottom Navigation */}
      <AdminBottomNavigation currentRoute="AdminOrders" tabNavigation={tabNavigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getSpacing(4),
    paddingVertical: getSpacing(3),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabsScroll: {
    gap: getSpacing(2),
    paddingRight: getSpacing(2.5),
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: getSpacing(2),
    paddingHorizontal: getSpacing(3),
    borderRadius: 20,
  },
  tabInactive: {
    backgroundColor: COLORS.lightGray,
  },
  tabActive: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.orange,
  },
  tabText: {
    fontSize: 14,
    color: COLORS.lightText,
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.orange,
    fontWeight: '600',
  },
  tabCount: {
    fontSize: 14,
    color: COLORS.lightText,
    marginLeft: getSpacing(1),
  },
  tabCountActive: {
    color: COLORS.orange,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: getSpacing(2),
  },
  ordersContainer: {
    paddingHorizontal: getSpacing(4),
    paddingTop: getSpacing(3),
  },
  orderCardWrap: {
    marginBottom: getSpacing(3),
    borderRadius: 14,
  },
  orderCardHighlighted: {
    borderWidth: 2,
    borderColor: COLORS.orange,
    backgroundColor: '#FFF8F3',
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  detailCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: getSpacing(4),
    maxHeight: '85%',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getSpacing(3),
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.darkText,
  },
  detailOrderNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.orange,
    marginBottom: getSpacing(2),
  },
  detailMeta: {
    fontSize: 14,
    color: COLORS.lightText,
    marginBottom: getSpacing(1),
  },
  detailMetaValue: {
    color: COLORS.darkText,
    fontWeight: '600',
  },
  detailSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.darkText,
    marginTop: getSpacing(3),
    marginBottom: getSpacing(2),
  },
  detailItemRow: {
    paddingVertical: getSpacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailItemText: {
    fontSize: 14,
    color: COLORS.darkText,
  },
  detailInstructions: {
    fontSize: 14,
    color: COLORS.darkText,
    lineHeight: 20,
  },
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: getSpacing(3),
    marginBottom: getSpacing(3),
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.darkText,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: getSpacing(3),
  },
  orderId: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.darkText,
  },
  orderTime: {
    fontSize: 12,
    color: COLORS.lightText,
    marginTop: getSpacing(0.5),
  },
  statusBadge: {
    paddingHorizontal: getSpacing(3),
    paddingVertical: getSpacing(1.5),
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getSpacing(3),
  },
  customerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getSpacing(3),
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.darkText,
  },
  customerTime: {
    fontSize: 12,
    color: COLORS.lightText,
    marginTop: getSpacing(0.25),
  },
  statusBadgeSmall: {
    paddingHorizontal: getSpacing(2.5),
    paddingVertical: getSpacing(1),
    borderRadius: 10,
  },
  statusTextSmall: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  itemsContainer: {
    marginLeft: 48,
    marginBottom: getSpacing(3),
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getSpacing(1.5),
  },
  itemIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getSpacing(2),
  },
  itemText: {
    fontSize: 13,
    color: COLORS.lightText,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: getSpacing(3),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.darkText,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: getSpacing(2.5),
  },
  actionBtn: {
    paddingHorizontal: getSpacing(4),
    paddingVertical: getSpacing(2),
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  prepareBtn: {
    backgroundColor: COLORS.green,
  },
  prepareBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  cancelBtn: {
    backgroundColor: COLORS.lightGray,
  },
  cancelBtnText: {
    color: COLORS.lightText,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: getSpacing(15),
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.darkText,
    marginTop: getSpacing(4),
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.lightText,
    marginTop: getSpacing(2),
    textAlign: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingTop: getSpacing(2),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: getSpacing(1),
    minWidth: 48,
  },
  navText: {
    fontSize: 12,
    color: COLORS.tabInactive,
    marginTop: getSpacing(1),
  },
  navTextActive: {
    color: COLORS.tabActive,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: getSpacing(5),
    paddingBottom: getSpacing(10),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getSpacing(5),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.darkText,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: getSpacing(4),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.darkText,
    marginLeft: getSpacing(4),
  },
  profileModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: getSpacing(20),
    paddingRight: getSpacing(5),
  },
  profileMenu: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    width: 220,
    shadowColor: COLORS.darkText,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  profileMenuHeader: {
    alignItems: 'center',
    padding: getSpacing(5),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  profileMenuImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: getSpacing(2.5),
  },
  profileMenuName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.darkText,
  },
  profileMenuEmail: {
    fontSize: 12,
    color: COLORS.lightText,
    marginTop: getSpacing(0.5),
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: getSpacing(3.5),
    paddingHorizontal: getSpacing(4),
  },
  profileMenuItemText: {
    fontSize: 14,
    color: COLORS.darkText,
    marginLeft: getSpacing(3),
  },
  profileMenuDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: getSpacing(4),
  },
});
