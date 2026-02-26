import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Image,
  Switch,
  Dimensions,
  Modal,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useSettings } from '../../context/SettingsContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { getSpacing } from '../../utils/responsive';
import ResponsiveHeader from '../../components/layout/ResponsiveHeader';
import ProfileMenu from '../../components/common/ProfileMenu';
import { useLocalization } from '../../context/LocalizationContext';

const { width } = Dimensions.get('window');
const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

interface Branch {
  _id: string;
  name: string;
}

interface Order {
  _id: string;
  orderNumber?: string;
  status: string;
  customerName?: string;
  customerEmail?: string;
  total: number;
  createdAt: string;
}

interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  category?: {
    name: string;
  };
}

interface UserData {
  displayName?: string;
  role?: string;
  email?: string;
}

interface CustomerStats {
  totalOrders: number;
  favoriteItems: number;
  totalSpent: number;
  activeOrders: number;
  totalRevenue: number;
  totalUsers: number;
  totalProducts: number;
}

export default function ManagerDashboard() {
  const navigation = useNavigation();
  const { currencySymbol, formatPrice } = useSettings();
  const { t } = useLocalization();
  const insets = useSafeAreaInsets();
  console.log(' [DASHBOARD] Component mounting...');
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [activePeriod, setActivePeriod] = useState('day');
  const [assignedBranch, setAssignedBranch] = useState<{_id?: string; name?: string; code?: string}>({});
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState<CustomerStats>({
    totalOrders: 0,
    favoriteItems: 0,
    totalSpent: 0,
    activeOrders: 0,
    totalRevenue: 0,
    totalUsers: 0,
    totalProducts: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [userData, setUserData] = useState<{name?: string; image?: string; email?: string}>({});

  useEffect(() => {
    loadUserData();
  }, []);

  // Load dashboard data AFTER assignedBranch is set
  useEffect(() => {
    if (assignedBranch._id) {
      loadDashboardData();
      loadUnreadCount();
    }
  }, [assignedBranch._id]);

  const loadUserData = async () => {
    try {
      const stored = await AsyncStorage.getItem('userData');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUserData({
          name: parsed.name || parsed.displayName || 'Manager User',
          image: parsed.image || parsed.avatar || parsed.profileImage,
          email: parsed.email || 'manager@restaurant.com',
        });
        // Get manager's assigned branch - check both assignedBranch and branch
        const branchData = parsed.assignedBranch || parsed.branch;
        if (branchData) {
          setAssignedBranch({
            _id: branchData._id || branchData.branchId || parsed.branchId,
            name: branchData.name || branchData.branchName || 'My Branch',
            code: branchData.code || branchData.branchCode || ''
          });
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      // For manager, always use their assigned branch
      if (assignedBranch._id) {
        params.append('branchId', assignedBranch._id);
      }
      params.append('period', activePeriod);

      const statsResponse = await api.get(`/dashboard/admin/stats?${params.toString()}`);
      if (statsResponse.success && statsResponse.data) {
        setStats({
          totalOrders: statsResponse.data.totalOrders ?? 0,
          totalRevenue: statsResponse.data.totalRevenue ?? 0,
          totalUsers: statsResponse.data.totalUsers ?? 0,
          totalProducts: statsResponse.data.totalProducts ?? 0,
          favoriteItems: statsResponse.data.favoriteItems ?? 0,
          totalSpent: statsResponse.data.totalSpent ?? 0,
          activeOrders: statsResponse.data.activeOrders ?? 0,
        });
      }

      const ordersResponse = await api.get(`/orders?limit=5&${params.toString()}`);
      if (ordersResponse.success && ordersResponse.data) {
        setRecentOrders(ordersResponse.data.orders || []);
      }

      // Load recent products and count for stats
      const productsResponse = await api.get('/menu/admin/products?limit=5');
      console.log(' [DASHBOARD] Products API Response:', productsResponse);
      console.log(' [DASHBOARD] Products success:', productsResponse.success);
      console.log(' [DASHBOARD] Products data:', productsResponse.data);
      if (productsResponse.success && productsResponse.data) {
        const products = productsResponse.data.products || [];
        console.log(' [DASHBOARD] Products array:', products);
        console.log(' [DASHBOARD] Products length:', products.length);
        console.log(' [DASHBOARD] Setting recent products:', products.length);
        setRecentProducts(products);
        // Update totalProducts stat from actual product count
        setStats(prev => ({ ...prev, totalProducts: productsResponse.data.pagination?.total || products.length }));
      } else {
        console.log(' [DASHBOARD] Products API call failed');
        setRecentProducts([]);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    loadDashboardData();
    loadUnreadCount();
  };

  const loadUnreadCount = async () => {
    try {
      const response = await api.get('/notifications/admin/unread-count');
      if (response.success) {
        setUnreadCount(response.data.count || 0);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'preparing':
        return '#2196F3';
      case 'cancelled':
        return '#F44336';
      default:
        return '#666';
    }
  };

  const menuItems = [
    { name: 'Notifications', icon: 'notifications-outline', screen: 'AdminNotifications' },
    { name: 'Table Assignment', icon: 'grid-outline', screen: 'TableAssignment' },
    { name: 'Categories', icon: 'grid-outline', screen: 'AdminCategories' },
    { name: 'Products', icon: 'restaurant-outline', screen: 'AdminProducts' },
    { name: 'Coupons', icon: 'ticket-outline', screen: 'AdminCoupons' },
    { name: 'Product Size', icon: 'resize-outline', screen: 'AdminProductSizes' },
    { name: 'Reports', icon: 'bar-chart-outline', screen: 'AdminReports' },
    { name: 'Settings', icon: 'settings-outline', screen: 'AdminSettings' },
  ];

  return (
    <View style={[styles.rootContainer, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      {/* Responsive Header */}
      <ResponsiveHeader
        title="Manager Dashboard"
        notificationCount={unreadCount}
        profileImage={userData.image}
        onNotificationPress={() => {
          // @ts-ignore
          navigation.navigate('AdminNotifications');
        }}
        onProfilePress={() => setShowProfileMenu(true)}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: getSpacing(25) + insets.bottom }
        ]}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Assigned Branch Info */}
        <View style={styles.branchInfoContainer}>
          <View style={styles.branchInfo}>
            <Ionicons name="business-outline" size={18} color="#E87E35" />
            <Text style={styles.branchInfoText}>
              {assignedBranch.name || 'Loading Branch...'}
            </Text>
            {assignedBranch.code && (
              <View style={styles.branchCodeBadge}>
                <Text style={styles.branchCodeText}>{assignedBranch.code}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <TouchableOpacity style={[styles.statCard, styles.revenueCard]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="cash-outline" size={24} color="#fff" />
            </View>
            <Text style={styles.statValue}>{currencySymbol}{((stats.totalRevenue || 0)).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Revenue</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.statCard, styles.ordersCard]} onPress={() => {
            // @ts-ignore
            navigation.navigate('AdminOrders')
          }}>
            <View style={styles.statIconContainer}>
              <Ionicons name="receipt-outline" size={24} color="#fff" />
            </View>
            <Text style={styles.statValue}>{(stats.totalOrders || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.statCard, styles.menuCard]} onPress={() => {
            // @ts-ignore
            navigation.navigate('AdminProducts')
          }}>
            <View style={styles.statIconContainer}>
              <Ionicons name="restaurant-outline" size={24} color="#fff" />
            </View>
            <Text style={styles.statValue}>{(stats.totalProducts || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Menu Items</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.statCard, styles.customersCard]} onPress={() => {
            // @ts-ignore
            navigation.navigate('AdminUsers')
          }}>
            <View style={styles.statIconContainer}>
              <Ionicons name="people-outline" size={24} color="#fff" />
            </View>
            <Text style={styles.statValue}>{(stats.totalUsers || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Customers</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Orders */}
        <View style={styles.ordersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <TouchableOpacity
              onPress={() => {
                // @ts-ignore
                navigation.navigate('AdminOrders');
              }}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentOrders.length > 0 ? (
            recentOrders.map((order, index) => (
              <View key={order._id || index} style={styles.orderItem}>
                <View style={styles.orderIconContainer}>
                  <Ionicons name="receipt-outline" size={20} color="#E87E35" />
                </View>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderNumber}>
                    Order #{order.orderNumber || order._id?.slice(-6)}
                  </Text>
                  <Text style={styles.orderTime}>{formatTimeAgo(order.createdAt || new Date().toISOString())}</Text>
                </View>
                <Text style={styles.orderAmount}>${(order.total || 0).toFixed(2)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                    {order.status}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={48} color="#ddd" />
              <Text style={styles.emptyText}>No recent orders</Text>
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
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
              <Text style={styles.modalTitle}>{t('nav.more')}</Text>
              <TouchableOpacity onPress={() => setShowMoreMenu(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={() => {
                  setShowMoreMenu(false);
                  // @ts-ignore
                  navigation.navigate(item.screen);
                }}
              >
                {/* @ts-ignore */}
                <Ionicons name={item.icon as any} size={24} color="#E87E35" />
                <Text style={styles.menuItemText}>{item.name}</Text>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Profile Menu Modal */}
      <ProfileMenu
        visible={showProfileMenu}
        onClose={() => setShowProfileMenu(false)}
        onLogout={async () => {
          setShowProfileMenu(false);
          await AsyncStorage.multiRemove(['authToken', 'userRole', 'userData']);
          // @ts-ignore
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            })
          );
        }}
        onChangePassword={() => {
          setShowProfileMenu(false);
          // @ts-ignore
          navigation.navigate('AdminSettings');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: STATUSBAR_HEIGHT,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'android' ? 120 : 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  notificationButton: {
    position: 'relative',
    padding: 4,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    gap: 10,
  },
  branchInfoContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  branchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 8,
  },
  branchInfoText: {
    fontSize: 14,
    color: '#E87E35',
    fontWeight: '600',
  },
  branchCodeBadge: {
    backgroundColor: '#E87E35',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  branchCodeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },
  branchSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  branchText: {
    fontSize: 13,
    color: '#1a1a2e',
    fontWeight: '500',
  },
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    padding: 2,
  },
  periodTab: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  periodTabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  periodTabText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  periodTabTextActive: {
    color: '#1a1a2e',
    fontWeight: '600',
  },
  liveStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 'auto',
  },
  liveStatusText: {
    fontSize: 12,
    color: '#666',
  },
  dropdownContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 100,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
    paddingVertical: 8,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownItemActive: {
    backgroundColor: '#FFF3E0',
  },
  dropdownText: {
    fontSize: 14,
    color: '#1a1a2e',
  },
  dropdownTextActive: {
    color: '#E87E35',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: (width - 52) / 2,
    padding: 16,
    borderRadius: 16,
    minHeight: 100,
  },
  revenueCard: {
    backgroundColor: '#2E7D52',
  },
  ordersCard: {
    backgroundColor: '#E87E35',
  },
  menuCard: {
    backgroundColor: '#7B5CB8',
  },
  customersCard: {
    backgroundColor: '#1E5AA8',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  ordersSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  productsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  viewAllText: {
    fontSize: 14,
    color: '#666',
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  orderTime: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  orderAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
    marginRight: 12,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  productDetails: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
  },
  bottomSpacer: {
    height: 20,
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
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'android' ? 40 : 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a2e',
    marginLeft: 16,
  },
  profileModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: STATUSBAR_HEIGHT + 50,
    paddingRight: 20,
  },
  profileMenu: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  profileMenuHeader: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileMenuImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 10,
  },
  profileMenuName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  profileMenuEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  profileMenuItemText: {
    fontSize: 14,
    color: '#1a1a2e',
    marginLeft: 12,
  },
  profileMenuDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
  },
});
