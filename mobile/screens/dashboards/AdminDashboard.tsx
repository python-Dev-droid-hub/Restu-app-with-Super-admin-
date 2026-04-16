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
import { COLORS } from '../../constants/colors';
import { getSpacing } from '../../utils/responsive';
import ResponsiveHeader from '../../components/layout/ResponsiveHeader';
import ProfileMenu from '../../components/common/ProfileMenu';
import { useLocalization } from '../../context/LocalizationContext';
import { getNotifications } from '../../services/notificationService';
import { useUserData } from '../../hooks/useUserData';
import { initializeSocket } from '../../services/realtimeService';

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

export default function AdminDashboard() {
  const navigation = useNavigation();
  const { currencySymbol, formatPrice, refreshSettings } = useSettings();
  const { t } = useLocalization();
  const insets = useSafeAreaInsets();
  const { profileImage: userProfileImage } = useUserData();
  console.log(' [DASHBOARD] Component mounting...');
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [activePeriod, setActivePeriod] = useState('day');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [notificationList, setNotificationList] = useState<any[]>([]);
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
  const [userRole, setUserRole] = useState<string>('');

  // Load user role on mount
  useEffect(() => {
    loadUserRole();
    loadSavedBranch();
  }, []);

  const loadSavedBranch = async () => {
    try {
      const savedBranchId = await AsyncStorage.getItem('selectedBranchId');
      if (savedBranchId) {
        setSelectedBranch(savedBranchId);
      }
    } catch (error) {
      console.error('Error loading saved branch:', error);
    }
  };

  const loadUserRole = async () => {
    try {
      const stored = await AsyncStorage.getItem('userData');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUserRole(parsed.role || '');
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    }
  };

  useEffect(() => {
    console.log(' [DASHBOARD] useEffect triggered');
    loadDashboardData();
    loadBranches();
    loadUnreadCount();
    loadUserData();
  }, [selectedBranch, activePeriod]);

  const loadUserData = async () => {
    try {
      const stored = await AsyncStorage.getItem('userData');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUserData({
          name: parsed.name || 'Admin User',
          image: parsed.image || parsed.avatar,
          email: parsed.email || 'admin@restaurant.com',
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadBranches = async () => {
    try {
      const response: any = await api.get('/branches');
      if (response?.success) {
        const rawList = response?.data?.branches || response?.data?.data?.branches || response?.data?.data?.restaurants || response?.data || [];
        const normalized = (Array.isArray(rawList) ? rawList : []).map((b: any) => ({
          _id: b?._id || b?.id,
          name: b?.name || b?.branchName || b?.restaurantName,
        })).filter((b: any) => !!b._id && !!b.name);
        setBranches(normalized);
      } else {
        setBranches([]);
      }
    } catch (error) {
      console.error('Error loading branches:', error);
      setBranches([]);
    }
  };

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedBranch !== 'all') {
        params.append('branchId', selectedBranch);
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

      const ordersResponse = await api.get(`/orders?limit=10&${params.toString()}`);
      if (ordersResponse.success && ordersResponse.data) {
        setRecentOrders(ordersResponse.data.orders || []);
      }

      // Load recent products
      const productsParams = new URLSearchParams();
      productsParams.append('limit', '5');
      if (selectedBranch !== 'all') {
        productsParams.append('branchId', selectedBranch);
      }
      const productsResponse = await api.get(`/menu/admin/products?${productsParams.toString()}`);
      console.log(' [DASHBOARD] Products API Response:', productsResponse);
      console.log(' [DASHBOARD] Products success:', productsResponse.success);
      console.log(' [DASHBOARD] Products data:', productsResponse.data);
      if (productsResponse.success && productsResponse.data) {
        const products = productsResponse.data.products || [];
        console.log(' [DASHBOARD] Products array:', products);
        console.log(' [DASHBOARD] Products length:', products.length);
        console.log(' [DASHBOARD] Setting recent products:', products.length);
        setRecentProducts(products);
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
  }, [activePeriod, selectedBranch]);

  const onRefresh = () => {
    loadDashboardData();
    loadBranches();
    loadUnreadCount();
  };

  const loadUnreadCount = useCallback(async () => {
    try {
      const response: any = await api.get('/notifications/unread-count');
      if (response.success) {
        setUnreadCount(response.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let socketCleanup: (() => void) | undefined;

    const setupRealtime = async () => {
      try {
        const stored = await AsyncStorage.getItem('userData');
        const token = await AsyncStorage.getItem('authToken');
        if (!mounted || !stored) return;

        const user = JSON.parse(stored);
        const userId = user?._id || user?.id;
        const userRole = user?.role;
        if (!userId || !userRole) return;

        const socket = initializeSocket(String(userId), String(userRole), token || undefined);

        const onNotification = (notification: any) => {
          const type = String(notification?.type || '').toUpperCase();
          if (type.includes('ORDER') || type.includes('PAYMENT') || type.includes('DEAL')) {
            loadDashboardData();
            loadUnreadCount();
          }
        };

        socket.on('notification', onNotification);
        socketCleanup = () => socket.off('notification', onNotification);
      } catch (e) {
        // ignore
      }
    };

    setupRealtime();

    return () => {
      mounted = false;
      socketCleanup?.();
    };
  }, [loadDashboardData, loadUnreadCount]);

  const loadNotifications = async () => {
    try {
      // Pass branchId for filtering if a specific branch is selected
      const branchId = selectedBranch !== 'all' ? selectedBranch : undefined;
      const res = await getNotifications(20, 0, undefined, branchId);
      if (res.success) {
        const mapped = (res.notifications || []).map((n: any) => ({
          id: n._id || n.id,
          title: n.title || 'Notification',
          body: n.body || n.message || '',
          type: n.type || 'SYSTEM',
          is_read: !!n.isRead,
          created_at: n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Just now',
          raw: n,
        }));
        setNotificationList(mapped);
      }
    } catch (e) {
      console.error('Error loading notifications:', e);
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

  const getSelectedBranchName = () => {
    if (selectedBranch === 'all') return 'All Branches';
    const branch = branches.find(b => b._id === selectedBranch);
    return branch?.name || 'Select Branch';
  };

  return (
    <View style={[styles.rootContainer, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      {/* Responsive Header */}
      <ResponsiveHeader
        title="Admin Dashboard"
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
          { paddingBottom: getSpacing(25) + insets.bottom }
        ]}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Branch Selector */}
        <View style={styles.branchSelectorContainer}>
          <TouchableOpacity 
            style={styles.branchSelector}
            onPress={() => setShowBranchDropdown(!showBranchDropdown)}
          >
            <Text style={styles.branchText}>{getSelectedBranchName()}</Text>
            <Ionicons name={showBranchDropdown ? "chevron-up" : "chevron-down"} size={16} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Branch Dropdown */}
        {showBranchDropdown && (
          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={[styles.dropdownItem, selectedBranch === 'all' && styles.dropdownItemActive]}
              onPress={async () => {
                setSelectedBranch('all');
                setShowBranchDropdown(false);
                await AsyncStorage.removeItem('selectedBranchId');
                refreshSettings();
              }}
            >
              <Text style={[styles.dropdownText, selectedBranch === 'all' && styles.dropdownTextActive]}>
                All Branches
              </Text>
            </TouchableOpacity>
            {branches.map((branch) => (
              <TouchableOpacity
                key={branch._id}
                style={[styles.dropdownItem, selectedBranch === branch._id && styles.dropdownItemActive]}
                onPress={async () => {
                  setSelectedBranch(branch._id);
                  setShowBranchDropdown(false);
                  await AsyncStorage.setItem('selectedBranchId', branch._id);
                  refreshSettings();
                }}
              >
                <Text style={[styles.dropdownText, selectedBranch === branch._id && styles.dropdownTextActive]}>
                  {branch.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <TouchableOpacity style={[styles.statCard, styles.revenueCard]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="cash-outline" size={24} color="#fff" />
            </View>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{formatPrice(stats.totalRevenue || 0)}</Text>
            <Text style={styles.statLabel}>Total Revenue</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.statCard, styles.ordersCard]} onPress={() => {
            // @ts-ignore
            navigation.navigate('AdminOrders')
          }}>
            <View style={styles.statIconContainer}>
              <Ionicons name="receipt-outline" size={24} color="#fff" />
            </View>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{(stats.totalOrders || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.statCard, styles.menuCard]} onPress={() => {
            // @ts-ignore
            navigation.navigate('AdminProducts')
          }}>
            <View style={styles.statIconContainer}>
              <Ionicons name="restaurant-outline" size={24} color="#fff" />
            </View>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{(stats.totalProducts || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Menu Items</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.statCard, styles.branchesCard]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="people-outline" size={24} color="#fff" />
            </View>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{(stats.totalUsers || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
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

      {/* Notification Panel Modal */}
      <Modal
        visible={showNotificationPanel}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNotificationPanel(false)}
      >
        <View style={notificationStyles.overlay}>
          <View style={notificationStyles.panel}>
            <View style={notificationStyles.header}>
              <View>
                <Text style={notificationStyles.title}>Notifications</Text>
                <Text style={notificationStyles.subtitle}>{unreadCount} unread</Text>
              </View>
              <View style={notificationStyles.headerActions}>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={async () => {
                    setNotificationList(prev => prev.map(n => ({ ...n, is_read: true })));
                    setUnreadCount(0);
                    try {
                      await api.put('/notifications/mark-all-read');
                    } catch (e) {
                      console.error('Error marking all read:', e);
                    }
                  }}>
                    <Text style={notificationStyles.markAll}>Mark all read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowNotificationPanel(false)}>
                  <Ionicons name="close" size={24} color="#1a1a2e" />
                </TouchableOpacity>
              </View>
            </View>

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
                      setNotificationList(prev => prev.map(n => 
                        n.id === item.id ? { ...n, is_read: true } : n
                      ));
                      setUnreadCount(prev => Math.max(0, prev - 1));
                    }}
                  >
                    <View style={[notificationStyles.iconContainer, { backgroundColor: '#FF7A59' }]}>
                      <Ionicons name="notifications" size={20} color="#fff" />
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
          </View>
        </View>
      </Modal>
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
  branchSelectorContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
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
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E87E35',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 8,
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemActive: {
    backgroundColor: '#FFF3E0',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  dropdownTextActive: {
    color: '#E87E35',
    fontWeight: '700',
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
  branchesCard: {
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
    flexShrink: 1,
    width: '100%',
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

// Notification panel styles
const notificationStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: '#fff',
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
    color: '#1a1a2e',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  markAll: {
    fontSize: 14,
    color: '#E87E35',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  unreadItem: {
    backgroundColor: '#FFF3E0',
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
    color: '#1a1a2e',
  },
  itemBody: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  time: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E87E35',
  },
});
