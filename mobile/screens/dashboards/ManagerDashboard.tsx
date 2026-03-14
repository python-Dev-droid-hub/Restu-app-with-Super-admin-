import React, { useState, useEffect, useCallback } from 'react';
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
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useSettings } from '../../context/SettingsContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSpacing } from '../../utils/responsive';
import ResponsiveHeader from '../../components/layout/ResponsiveHeader';
import ProfileMenu from '../../components/common/ProfileMenu';
import AdminBottomNavigation from '../../components/navigation/AdminBottomNavigation';
import { useLocalization } from '../../context/LocalizationContext';
import { getNotifications } from '../../services/notificationService';
import { useUserData } from '../../hooks/useUserData';

const { width } = Dimensions.get('window');
const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

const DESIGN = {
  colors: {
    orange: '#FF7A59',
    green: '#2BC48A',
    blue: '#6C63FF',
    red: '#FF4D4D',
    darkText: '#1A1A2E',
    lightBg: '#F8F9FA',
    white: '#FFFFFF',
    muted: '#8E8E93',
    border: '#E5E5EA',
    cardBg: '#FFFFFF',
  },
  radius: {
    card: 16,
    pill: 20,
  },
  spacing: {
    pagePad: 16,
    cardGap: 12,
  },
} as const;

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
  total?: number;
  totalAmount?: number;
  finalAmount?: number;
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
  const { currencySymbol, formatPrice, refreshSettings } = useSettings();
  const { t } = useLocalization();
  const insets = useSafeAreaInsets();
  const { profileImage: userProfileImage, assignedBranch: userBranch } = useUserData();
  console.log(' [DASHBOARD] Component mounting...');
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [activePeriod, setActivePeriod] = useState('day');
  const [assignedBranch, setAssignedBranch] = useState<{_id?: string; name?: string; code?: string}>({});
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
  
  // Notification panel state
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [notificationList, setNotificationList] = useState<any[]>([]);

  // Logout handler with better error handling
  const handleLogout = useCallback(async () => {
    console.log('[MANAGER] Logout initiated...');
    try {
      await AsyncStorage.multiRemove(['authToken', 'userRole', 'userData', 'userId']);
      console.log('[MANAGER] AsyncStorage cleared');
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        })
      );
      console.log('[MANAGER] Navigation reset to Login');
    } catch (error) {
      console.error('[MANAGER] Logout error:', error);
    }
  }, [navigation]);

  useEffect(() => {
    loadDashboardData();
    loadUnreadCount();
    loadNotifications();
    
    // Poll for real-time updates every 5 seconds
    const interval = setInterval(() => {
      loadOrdersSilent();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const loadOrdersSilent = async () => {
    try {
      const branchId = await AsyncStorage.getItem('selectedBranchId');
      const params = new URLSearchParams();
      if (branchId) {
        params.append('branchId', branchId);
      }
      
      const ordersResponse = await api.get(`/orders?limit=10&${params.toString()}`);
      if (ordersResponse.success && ordersResponse.data) {
        const rawOrders = ordersResponse.data.orders || [];
        // Normalize order data to ensure fields are correctly mapped
        const normalizedOrders = rawOrders.map((order: any) => ({
          _id: order.id || order._id,
          orderNumber: order.orderNumber || order.order_number,
          status: order.status,
          totalAmount: order.totalAmount || order.total_amount || order.total || order.finalAmount || 0,
          finalAmount: order.finalAmount || order.final_amount,
          total: order.total,
          createdAt: order.createdAt || order.created_at,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          items: order.items || [],
        }));
        setRecentOrders(normalizedOrders);
      }
    } catch (error) {
      console.error('Error loading orders silently:', error);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const stored = await AsyncStorage.getItem('userData');
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('[ManagerDashboard] Loaded userData:', parsed);
        setUserData({
          name: parsed.name || parsed.displayName || 'Manager User',
          image: parsed.profileImage || parsed.image || parsed.avatar || parsed.avatarUrl || null,
          email: parsed.email || 'manager@restaurant.com',
        });
        // Get manager's assigned branch - check both assignedBranch and branch
        const branchData = parsed.assignedBranch || parsed.branch;
        if (branchData) {
          const branchId = branchData._id || branchData.branchId || parsed.branchId;
          setAssignedBranch({
            _id: branchId,
            name: branchData.name || branchData.branchName || 'My Branch',
            code: branchData.code || branchData.branchCode || ''
          });
          // Save to AsyncStorage so SettingsContext picks it up
          await AsyncStorage.setItem('selectedBranchId', branchId);
          // Refresh settings to load branch currency
          refreshSettings();
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

      // For manager, use the manager-specific endpoint
      const statsResponse = await api.get(`/dashboard/manager/stats?${params.toString()}`);
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

      const ordersResponse = await api.get(`/orders?limit=10&${params.toString()}`);
      if (ordersResponse.success && ordersResponse.data) {
        const rawOrders = ordersResponse.data.orders || [];
        // Normalize order data to ensure fields are correctly mapped
        const normalizedOrders = rawOrders.map((order: any) => ({
          _id: order.id || order._id,
          orderNumber: order.orderNumber || order.order_number,
          status: order.status,
          totalAmount: order.totalAmount || order.total_amount || order.total || order.finalAmount || 0,
          finalAmount: order.finalAmount || order.final_amount,
          total: order.total,
          createdAt: order.createdAt || order.created_at,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
        }));
        setRecentOrders(normalizedOrders);
        console.log('[MANAGER] Orders loaded:', normalizedOrders.length);
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
    loadNotifications();
  };

  const loadNotifications = useCallback(async () => {
    try {
      const res = await getNotifications(20, 0);
      console.log('[ManagerDashboard] Notifications response:', JSON.stringify(res, null, 2));
      if (res.success) {
        const mapped = (res.notifications || []).map((n: any) => ({
          id: n?._id || n?.id,
          title: n?.title || 'Notification',
          body: n?.body || n?.message || '',
          type: n?.type || 'INFO',
          is_read: !!n?.isRead,
          created_at: n?.createdAt ? new Date(n.createdAt).toLocaleString() : 'Just now',
          raw: n,
        }));
        console.log('[ManagerDashboard] Mapped notifications:', mapped.length);
        setNotificationList(mapped);
      }
    } catch (e) {
      console.error('[ManagerDashboard] Notification load error:', e);
    }
  }, []);

  const loadUnreadCount = async () => {
    try {
      const response: any = await api.get('/notifications/unread-count');
      if (response.success) {
        setUnreadCount(response.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Just now';
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
    { name: t('notifications.title'), icon: 'notifications-outline', screen: 'AdminNotifications' },
    { name: 'Table Assignment', icon: 'grid-outline', screen: 'TableAssignment' },
    { name: t('nav.categories'), icon: 'grid-outline', screen: 'AdminCategories' },
    { name: t('products.title'), icon: 'restaurant-outline', screen: 'AdminProducts' },
    { name: 'Banner Management', icon: 'image-outline', screen: 'BannerManagement' },
    { name: t('nav.coupons'), icon: 'ticket-outline', screen: 'AdminCoupons' },
    { name: 'Deals', icon: 'pricetag-outline', screen: 'AdminDealCampaigns' },
    { name: 'Product Size', icon: 'resize-outline', screen: 'AdminProductSizes' },
    { name: t('nav.reports'), icon: 'bar-chart-outline', screen: 'AdminReports' },
    { name: t('nav.settings'), icon: 'settings-outline', screen: 'AdminSettings' },
  ];
  
  // Debug: Log all menu items to verify Banner Management is included
  console.log('[MANAGER MENU] All menu items:', menuItems.map(i => i.name));
  console.log('[MANAGER MENU] menuItems count:', menuItems.length);
  console.log('[MANAGER MENU] Banner Management present:', menuItems.some(i => i.screen === 'BannerManagement'));

  return (
    <View style={[styles.rootContainer, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor={DESIGN.colors.white} />
      
      {/* Responsive Header */}
      <ResponsiveHeader
        title="Manager Dashboard"
        notificationCount={unreadCount}
        profileImage={userProfileImage}
        onNotificationPress={() => {
          setShowNotificationPanel(true);
          loadNotifications();
        }}
        onProfilePress={() => setShowProfileMenu(true)}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: getSpacing(30) + insets.bottom }
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
            <Text style={styles.statValue}>{formatPrice(stats.totalRevenue || 0)}</Text>
            <Text style={styles.statLabel}>{t('dashboard.totalRevenue')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.statCard, styles.ordersCard]} onPress={() => {
            // @ts-ignore
            navigation.navigate('AdminOrders')
          }}>
            <View style={styles.statIconContainer}>
              <Ionicons name="receipt-outline" size={24} color="#fff" />
            </View>
            <Text style={styles.statValue}>{(stats.totalOrders || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>{t('dashboard.totalOrders')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.statCard, styles.menuCard]} onPress={() => {
            // @ts-ignore
            navigation.navigate('AdminProducts')
          }}>
            <View style={styles.statIconContainer}>
              <Ionicons name="restaurant-outline" size={24} color="#fff" />
            </View>
            <Text style={styles.statValue}>{(stats.totalProducts || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>{t('dashboard.menuItems')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.statCard, styles.branchUsersCard]} 
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => {
              // @ts-ignore
              navigation.navigate('AdminUsers')
            }}>
            <View style={styles.statIconContainer}>
              <Ionicons name="people-outline" size={24} color="#fff" />
            </View>
            <Text style={styles.statValue}>{(stats.totalUsers || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>{t('dashboard.branchUsers')}</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Orders */}
        <View style={styles.ordersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('dashboard.recentOrders')}</Text>
            <TouchableOpacity
              onPress={() => {
                // @ts-ignore
                navigation.navigate('AdminOrders');
              }}
            >
              <Text style={styles.viewAllText}>{t('dashboard.viewAll')}</Text>
            </TouchableOpacity>
          </View>

          {recentOrders.length > 0 ? (
            recentOrders.map((order, index) => (
              <TouchableOpacity 
                key={`recent-${order._id || index}`} 
                style={styles.orderItem}
                onPress={() => {
                  // @ts-ignore
                  navigation.navigate('AdminOrders', { 
                    orderId: order._id,
                    highlightOrder: true 
                  });
                }}
                activeOpacity={0.8}
              >
                <View style={styles.orderIconContainer}>
                  <Ionicons name="receipt-outline" size={20} color="#E87E35" />
                </View>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderNumber}>
                    Order #{order.orderNumber || String(order._id || '').slice(-6)}
                  </Text>
                  <Text style={styles.orderTime}>{formatTimeAgo(order.createdAt || new Date().toISOString())}</Text>
                </View>
                <Text style={styles.orderAmount}>{formatPrice(order.totalAmount || order.finalAmount || order.total || 0)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                    {String(order.status || 'PENDING')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={48} color="#ddd" />
              <Text style={styles.emptyText}>{t('dashboard.noRecentOrders')}</Text>
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Profile Menu Modal */}
      <ProfileMenu
        visible={showProfileMenu}
        onClose={() => setShowProfileMenu(false)}
        onLogout={handleLogout}
        onChangePassword={() => {
          setShowProfileMenu(false);
          // @ts-ignore
          navigation.navigate('AdminSettings');
        }}
      />

      {/* Notification Panel Modal */}
      <Modal
        visible={showNotificationPanel}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNotificationPanel(false)}
        statusBarTranslucent
      >
        <TouchableOpacity 
          style={notificationStyles.overlay}
          activeOpacity={1}
          onPress={() => setShowNotificationPanel(false)}
        >
          <TouchableOpacity 
            style={notificationStyles.panel}
            activeOpacity={1}
            onPress={() => {}} // Prevent tap-through
          >
            {/* Header */}
            <View style={notificationStyles.header}>
              <View>
                <Text style={notificationStyles.title}>Notifications</Text>
                <Text style={notificationStyles.subtitle}>({unreadCount} unread)</Text>
              </View>
              <View style={notificationStyles.headerActions}>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={async () => {
                    setNotificationList(prev => prev.map(n => ({ ...n, is_read: true })));
                    setUnreadCount(0);
                    try {
                      await api.put('/notifications/mark-all-read');
                    } catch (error) {
                      console.log('Error marking all notifications as read:', error);
                    }
                  }}>
                    <Text style={notificationStyles.markAll}>Mark all read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowNotificationPanel(false)}>
                  <Ionicons name="close" size={24} color={DESIGN.colors.darkText} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Notification List */}
            {notificationList.length === 0 ? (
              <View style={notificationStyles.emptyState}>
                <Ionicons name="notifications-off-outline" size={48} color="#ccc" />
                <Text style={notificationStyles.emptyText}>No notifications</Text>
              </View>
            ) : (
              <FlatList
                data={notificationList}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[notificationStyles.item, !item.is_read && notificationStyles.unreadItem]}
                    onPress={() => {
                      // Mark as read logic here
                    }}
                  >
                    <View style={[notificationStyles.iconContainer, { backgroundColor: DESIGN.colors.orange + '20' }]}>
                      <Ionicons name="notifications" size={20} color={DESIGN.colors.orange} />
                    </View>
                    <View style={notificationStyles.content}>
                      <Text style={notificationStyles.itemTitle}>{item.title}</Text>
                      <Text style={notificationStyles.itemBody}>{item.body}</Text>
                      <Text style={notificationStyles.time}>{item.created_at}</Text>
                    </View>
                    {!item.is_read && <View style={notificationStyles.unreadDot} />}
                  </TouchableOpacity>
                )}
              />
            )}

            {/* View All Link */}
            <TouchableOpacity 
              style={notificationStyles.viewAll}
              onPress={() => {
                setShowNotificationPanel(false);
                navigation.navigate('AdminNotifications' as never);
              }}
            >
              <Text style={notificationStyles.viewAllText}>View All Notifications</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Bottom Navigation */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 999 }}>
        <AdminBottomNavigation 
          currentRoute="ManagerDashboard"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: DESIGN.colors.lightBg,
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
    paddingHorizontal: DESIGN.spacing.pagePad,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: DESIGN.colors.white,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: DESIGN.colors.darkText,
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
    backgroundColor: DESIGN.colors.red,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    borderWidth: 2,
    borderColor: DESIGN.colors.white,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: DESIGN.colors.white,
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
    backgroundColor: DESIGN.colors.orange + '20',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 8,
  },
  branchInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN.colors.orange,
  },
  branchCodeBadge: {
    backgroundColor: DESIGN.colors.orange,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  branchCodeText: {
    fontSize: 12,
    color: DESIGN.colors.white,
    fontWeight: '700',
  },
  branchSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DESIGN.colors.lightBg,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  branchText: {
    fontSize: 13,
    color: DESIGN.colors.darkText,
    fontWeight: '500',
  },
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: DESIGN.colors.lightBg,
    borderRadius: 20,
    padding: 2,
  },
  periodTab: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  periodTabActive: {
    backgroundColor: DESIGN.colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  periodTabText: {
    fontSize: 13,
    color: DESIGN.colors.muted,
    fontWeight: '500',
  },
  periodTabTextActive: {
    color: DESIGN.colors.darkText,
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
    color: DESIGN.colors.muted,
  },
  dropdownContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 100,
    backgroundColor: DESIGN.colors.white,
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
    backgroundColor: DESIGN.colors.orange + '20',
  },
  dropdownText: {
    fontSize: 14,
    color: DESIGN.colors.darkText,
  },
  dropdownTextActive: {
    color: DESIGN.colors.orange,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: DESIGN.spacing.pagePad,
    gap: DESIGN.spacing.cardGap,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: DESIGN.radius.card,
    minHeight: 120,
    justifyContent: 'center',
    marginBottom: DESIGN.spacing.cardGap,
  },
  revenueCard: {
    backgroundColor: DESIGN.colors.green,
  },
  ordersCard: {
    backgroundColor: DESIGN.colors.orange,
  },
  menuCard: {
    backgroundColor: DESIGN.colors.blue,
  },
  customersCard: {
    backgroundColor: DESIGN.colors.blue,
  },
  branchUsersCard: {
    backgroundColor: DESIGN.colors.blue,
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
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: DESIGN.colors.white,
    marginBottom: 4,
  },
  ordersSection: {
    paddingHorizontal: DESIGN.spacing.pagePad,
    marginBottom: 24,
  },
  productsSection: {
    paddingHorizontal: DESIGN.spacing.pagePad,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: DESIGN.colors.darkText,
  },
  viewAllText: {
    fontSize: 14,
    color: DESIGN.colors.muted,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: DESIGN.colors.white,
    borderRadius: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    color: DESIGN.colors.darkText,
  },
  orderTime: {
    fontSize: 12,
    color: DESIGN.colors.muted,
    marginTop: 2,
  },
  orderAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: DESIGN.colors.darkText,
    marginRight: 12,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: DESIGN.colors.white,
    borderRadius: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  productIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DESIGN.colors.orange + '20',
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
    color: DESIGN.colors.darkText,
  },
  productDetails: {
    fontSize: 12,
    color: DESIGN.colors.muted,
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
    color: DESIGN.colors.muted,
    marginTop: 8,
  },
  bottomSpacer: {
    height: 20,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: DESIGN.colors.white,
    paddingTop: getSpacing(2),
    borderTopWidth: 1,
    borderTopColor: DESIGN.colors.border,
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
    color: DESIGN.colors.muted,
    marginTop: getSpacing(1),
  },
  navTextActive: {
    color: DESIGN.colors.orange,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000, // Higher than bottom navigator's zIndex: 999
  },
  modalContent: {
    backgroundColor: DESIGN.colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'android' ? 100 : 80, // Extra padding for bottom navigator
    maxHeight: '90%',
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
    color: DESIGN.colors.darkText,
  },
  modalSubtitle: {
    fontSize: 12,
    color: DESIGN.colors.muted,
    marginTop: 4,
  },
  menuScrollView: {
    flex: 1,
  },
  menuScrollContent: {
    paddingBottom: 100, // Extra padding to account for bottom navigator
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN.colors.border,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: DESIGN.colors.darkText,
    marginLeft: 16,
  },
  bannerMenuItem: {
    backgroundColor: '#FFF5F0',
    borderRadius: 8,
    marginVertical: 2,
  },
  bannerMenuItemText: {
    color: '#FF6B35',
    fontWeight: 'bold',
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
    backgroundColor: DESIGN.colors.white,
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
    borderBottomColor: DESIGN.colors.border,
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
    color: DESIGN.colors.darkText,
  },
  profileMenuEmail: {
    fontSize: 12,
    color: DESIGN.colors.muted,
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
    color: DESIGN.colors.darkText,
    marginLeft: 12,
  },
  profileMenuDivider: {
    height: 1,
    backgroundColor: DESIGN.colors.border,
    marginHorizontal: 16,
  },
});

// Notification panel styles
const notificationStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: DESIGN.colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'android' ? 40 : 30,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: DESIGN.colors.darkText,
  },
  subtitle: {
    fontSize: 14,
    color: DESIGN.colors.muted,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  markAll: {
    fontSize: 14,
    color: DESIGN.colors.orange,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: DESIGN.colors.muted,
    marginTop: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN.colors.border,
  },
  unreadItem: {
    backgroundColor: DESIGN.colors.orange + '08',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: DESIGN.colors.darkText,
  },
  itemBody: {
    fontSize: 13,
    color: DESIGN.colors.muted,
    marginTop: 2,
  },
  time: {
    fontSize: 12,
    color: DESIGN.colors.muted,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DESIGN.colors.orange,
    marginLeft: 8,
  },
  viewAll: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: DESIGN.colors.border,
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 14,
    color: DESIGN.colors.orange,
    fontWeight: '600',
  },
});
