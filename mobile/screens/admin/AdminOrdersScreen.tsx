import React, { useState, useEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalization } from '../../context/LocalizationContext';
import OrderCard from '../../components/ChefDashboard/OrderCard';
import { getCashierOrders, populateOrdersWithProductDetails } from '../../services/orderService';

import { useUserData } from '../../hooks/useUserData';

// Components
import ResponsiveHeader from '../../components/layout/ResponsiveHeader';
import ProfileMenu from '../../components/common/ProfileMenu';
import AdminBottomNavigation from '../../components/navigation/AdminBottomNavigation';

// Utils & Constants
import { getSpacing } from '../../utils/responsive';
import { COLORS } from '../../constants/colors';

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
  table?: {
    tableNumber?: string;
  };
  specialInstructions?: string;
}

export default function AdminOrdersScreen() {
  const navigation = useNavigation() as any;
  const insets = useSafeAreaInsets();
  const { t } = useLocalization();
  const { userRole, profileImage } = useUserData();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<OrderStatus>('all');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const menuItems = [
    { name: t('nav.notifications'), icon: 'notifications-outline', screen: 'AdminNotifications' },
    { name: 'Table Assignment', icon: 'grid-outline', screen: 'TableAssignment' },
    // Only show Branches for SUPER_ADMIN
    ...(userRole === 'SUPER_ADMIN' ? [{ name: t('nav.branches'), icon: 'business-outline', screen: 'AdminBranches' }] : []),
    { name: t('nav.deals'), icon: 'pricetag-outline', screen: 'AdminDeals' },
    { name: t('nav.coupons'), icon: 'ticket-outline', screen: 'AdminCoupons' },
    { name: t('nav.productSizes'), icon: 'resize-outline', screen: 'AdminProductSizes' },
    { name: t('nav.categories'), icon: 'grid-outline', screen: 'AdminCategories' },
    { name: t('nav.reports'), icon: 'bar-chart-outline', screen: 'AdminReports' },
    { name: t('nav.settings'), icon: 'settings-outline', screen: 'AdminSettings' },
  ];

  useEffect(() => {
    loadOrders();
    
    // Poll for real-time updates every 5 seconds
    const interval = setInterval(() => {
      loadOrdersSilent();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const loadOrdersSilent = async () => {
    try {
      // Use order service for silent updates too (to get populated product data)
      const result = await getCashierOrders();
      if (result.success) {
        setOrders(result.orders);
      }
    } catch (error) {
      console.error('Error loading orders silently:', error);
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      
      // Use order service to get orders with populated product details
      const result = await getCashierOrders();
      
      if (result.success) {
        console.log('[ADMIN] Orders loaded with populated products:', result.orders.length);
        setOrders(result.orders);
      } else {
        console.error('[ADMIN] Failed to load orders');
        Alert.alert('Error', 'Failed to load orders');
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
    }
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
    return orders.filter(o => o.status?.toLowerCase() === activeTab);
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

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.tabsScroll}
        >
          {renderTab('all', 'All Orders')}
          {renderTab('pending', 'Pending', pendingCount)}
          {renderTab('cancelled', 'Cancelled', cancelledCount)}
        </ScrollView>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="cart-outline" size={20} color={COLORS.lightText} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: getSpacing(25) + insets.bottom }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadOrders} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.ordersContainer}>
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order, index) => (
              <OrderCard
                key={`order-${order._id || (order as any).id || index}`}
                order={{
                  id: (order as any).id || order._id,
                  orderNumber:
                    order.orderNumber || (order as any).order_number ||
                    `ORD-${String((order as any).id || order._id || '').slice(-6)}`,
                  status: String(order.status || 'pending').toLowerCase() as any,
                  orderType: order.orderType || 'DINE_IN',
                  tableNumber: order.tableNumber || order.table?.tableNumber,
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
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color={COLORS.border} />
              <Text style={styles.emptyText}>No orders found</Text>
              <Text style={styles.emptySubtext}>Orders will appear here when customers place them</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* More Menu Modal */}
      <Modal
        visible={showMoreMenu}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMoreMenu(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>More Options</Text>
              <TouchableOpacity onPress={() => setShowMoreMenu(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.screen}
                style={styles.menuItem}
                onPress={() => {
                  setShowMoreMenu(false);
                  (navigation as any).navigate(item.screen);
                }}
              >
                <Ionicons name={item.icon as any} size={24} color={COLORS.orange} />
                <Text style={styles.menuItemText}>{item.name}</Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.border} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Profile Menu Modal */}
      <ProfileMenu
        visible={showProfileMenu}
        onClose={() => setShowProfileMenu(false)}
        onLogout={() => navigation.navigate('Welcome')}
        onChangePassword={() => navigation.navigate('ChangePassword')}
      />

      {/* Bottom Navigation */}
      <AdminBottomNavigation currentRoute="AdminOrders" onMorePress={() => setShowMoreMenu(true)} />
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
