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
  Dimensions,
  Modal,
  Platform,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';
import { Ionicons } from '@expo/vector-icons';
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
    purple: '#9C27B0',
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
  name?: string;
  branchName?: string;
  location?: string;
  isActive?: boolean;
  revenue?: number;
  orders?: number;
}

interface UserData {
  displayName?: string;
  role?: string;
  email?: string;
}

interface DashboardStats {
  totalBranches: number;
  activeBranches: number;
  todayRevenue: number;
  todayOrders: number;
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
}

interface Order {
  _id: string;
  orderNumber?: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  customerName?: string;
  branchName?: string;
}

// Access Denied Component
const AccessDenied = () => (
  <View style={styles.accessDeniedContainer}>
    <Ionicons name="lock-closed" size={64} color={DESIGN.colors.red} />
    <Text style={styles.accessDeniedTitle}>Access Denied</Text>
    <Text style={styles.accessDeniedText}>
      You don't have permission to access this dashboard. Super Admin access only.
    </Text>
  </View>
);

export default function SuperAdminDashboard() {
  const navigation = useNavigation();
  const { currencySymbol, formatPrice, refreshSettings } = useSettings();
  const { t } = useLocalization();
  const insets = useSafeAreaInsets();
  const { profileImage: userProfileImage } = useUserData();
  
  const [loading, setLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userRole, setUserRole] = useState<string>('');
  const [userData, setUserData] = useState<UserData>({});
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [notificationList, setNotificationList] = useState<any[]>([]);
  
  const [stats, setStats] = useState<DashboardStats>({
    totalBranches: 0,
    activeBranches: 0,
    todayRevenue: 0,
    todayOrders: 0,
    totalRevenue: 0,
    totalOrders: 0,
    totalUsers: 0,
  });
  
  const [branches, setBranches] = useState<Branch[]>([]);
  const [recentBranches, setRecentBranches] = useState<Branch[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);

  // Logout handler
  const handleLogout = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove(['authToken', 'userRole', 'userData', 'userId']);
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        })
      );
    } catch (error) {
      console.error('[SUPER_ADMIN] Logout error:', error);
    }
  }, [navigation]);

  useEffect(() => {
    loadUserData();
    loadUnreadCount();
    loadNotifications();
  }, []);

  useEffect(() => {
    if (userRole === 'SUPER_ADMIN') {
      (async () => {
        const savedBranchId = await AsyncStorage.getItem('selectedBranchId');
        const branchId = savedBranchId || null;
        setSelectedBranchId(branchId);
        refreshSettings();
        loadDashboardData(branchId);
        loadOrdersData(branchId);
      })();
      
      // Poll every 60 seconds (1 minute) - reduced from 10s to prevent server overload
      const interval = setInterval(() => {
        loadDashboardData();
        loadOrdersData();
        loadUnreadCount();
      }, 60000);
      
      return () => clearInterval(interval);
    }
  }, [userRole, refreshSettings]);

  const loadUserData = async () => {
    try {
      const stored = await AsyncStorage.getItem('userData');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUserRole(parsed.role || '');
        setUserData({
          displayName: parsed.displayName || parsed.name || 'Super Admin',
          email: parsed.email || 'superadmin@restaurant.com',
          role: parsed.role,
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadDashboardData = async (branchId?: string | null) => {
    try {
      setLoading(true);
      
      // Load branches
      const branchesResponse = await api.get('/branches');
      if (branchesResponse.success && branchesResponse.data) {
        const branchData = branchesResponse.data.branches || [];
        setBranches(branchData);
      }

      // Use provided branchId or fall back to state
      const activeBranchId = branchId !== undefined ? branchId : selectedBranchId;
      const queryParams = activeBranchId ? `?branchId=${activeBranchId}` : '';

      // Load summary stats
      const statsResponse = await api.get(`/dashboard/superadmin/stats${queryParams}`);
      console.log('[SuperAdmin] Stats response:', statsResponse.data);
      
      if (statsResponse.success && statsResponse.data) {
        const data = statsResponse.data as any;
        
        setStats({
          totalBranches: data.totalBranches || 0,
          activeBranches: data.activeBranches || 0,
          todayRevenue: data.todayRevenue || 0,
          todayOrders: data.ordersToday || 0,
          totalRevenue: data.totalRevenue || 0,
          totalOrders: data.totalOrders || 0,
          totalUsers: data.totalUsers || 0,
        });
      }
    } catch (error) {
      console.error('[SuperAdmin] Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrdersData = async (branchId?: string | null) => {
    try {
      // Use provided branchId or fall back to state
      const activeBranchId = branchId !== undefined ? branchId : selectedBranchId;
      const queryParams = activeBranchId ? `?branchId=${activeBranchId}&limit=5` : '?limit=5';
      const ordersResponse = await api.get(`/orders${queryParams}`);
      if (ordersResponse.success && ordersResponse.data) {
        const orders = ordersResponse.data.orders || ordersResponse.data || [];
        setRecentOrders(orders.slice(0, 5));
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const onRefresh = () => {
    loadDashboardData();
    loadOrdersData();
    loadUnreadCount();
    loadNotifications();
  };

  const loadNotifications = useCallback(async () => {
    try {
      const res = await getNotifications(20, 0);
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
        setNotificationList(mapped);
      }
    } catch (e) {
      console.error('[SuperAdminDashboard] Notification load error:', e);
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

  const handleBranchSelect = async (branchId: string | null) => {
    setSelectedBranchId(branchId);
    setShowBranchDropdown(false);
    if (branchId) {
      await AsyncStorage.setItem('selectedBranchId', branchId);
    } else {
      await AsyncStorage.removeItem('selectedBranchId');
    }
    refreshSettings();
    // Pass branchId directly since state update is async
    loadDashboardData(branchId);
    loadOrdersData(branchId);
  };

  const getSelectedBranchName = () => {
    if (!selectedBranchId) return 'All Branches';
    const branch = branches.find(b => b._id === selectedBranchId);
    return branch?.name || branch?.branchName || 'Unknown Branch';
  };

  const getOrderStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return '#4CAF50';
      case 'pending':
      case 'preparing':
        return '#FF9800';
      case 'cancelled':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusColor = (isActive?: boolean) => {
    return isActive ? '#4CAF50' : '#F44336';
  };

  // Safe location formatter - handles GeoJSON or string
  const getLocationText = (location: any): string => {
    if (!location) return 'No location';
    if (typeof location === 'string') return location;
    if (location.type === 'Point' && Array.isArray(location.coordinates)) {
      const [lng, lat] = location.coordinates;
      return `${lat?.toFixed?.(4) || lat}, ${lng?.toFixed?.(4) || lng}`;
    }
    if (location.name || location.address) return location.name || location.address;
    return 'No location';
  };

  // ROLE CHECK - Only SUPER_ADMIN can access
  if (userRole && userRole !== 'SUPER_ADMIN') {
    return <AccessDenied />;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={DESIGN.colors.orange} />
        <Text style={styles.loadingText}>Loading Super Admin Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.rootContainer, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor={DESIGN.colors.white} />
      
      {/* Responsive Header */}
      <ResponsiveHeader
        title="Super Admin"
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
        {/* Branch Selector Dropdown */}
        <View style={styles.branchSelectorSection}>
          <TouchableOpacity 
            style={styles.branchSelectorButton}
            onPress={() => setShowBranchDropdown(!showBranchDropdown)}
            activeOpacity={0.8}
          >
            <View style={styles.branchSelectorLeft}>
              <Ionicons name="business-outline" size={22} color={DESIGN.colors.orange} />
              <View style={styles.branchSelectorTextContainer}>
                <Text style={styles.branchSelectorLabel}>Selected Branch</Text>
                <Text style={styles.branchSelectorValue} numberOfLines={1}>
                  {getSelectedBranchName()}{selectedBranchId ? ` (${currencySymbol})` : ''}
                </Text>
              </View>
            </View>
            <Ionicons 
              name={showBranchDropdown ? "chevron-up" : "chevron-down"} 
              size={24} 
              color={DESIGN.colors.muted} 
            />
          </TouchableOpacity>

          {/* Inline Branch Dropdown List */}
          {showBranchDropdown && (
            <View style={styles.inlineDropdownContainer}>
              {/* All Branches Option */}
              <TouchableOpacity 
                style={[
                  styles.inlineBranchOption,
                  !selectedBranchId && styles.inlineSelectedOption
                ]}
                onPress={() => handleBranchSelect(null)}
                activeOpacity={0.7}
              >
                <View style={styles.inlineBranchIcon}>
                  <Ionicons name="grid-outline" size={18} color={!selectedBranchId ? DESIGN.colors.orange : DESIGN.colors.muted} />
                </View>
                <View style={styles.inlineBranchInfo}>
                  <Text style={[
                    styles.inlineBranchName,
                    !selectedBranchId && styles.inlineSelectedText
                  ]}>
                    All Branches
                  </Text>
                  <Text style={styles.inlineBranchId}>ID: ALL</Text>
                </View>
                {!selectedBranchId && (
                  <Ionicons name="checkmark-circle" size={22} color={DESIGN.colors.orange} />
                )}
              </TouchableOpacity>

              {/* Branch List */}
              {branches.map((branch) => (
                <TouchableOpacity 
                  key={branch._id}
                  style={[
                    styles.inlineBranchOption,
                    selectedBranchId === branch._id && styles.inlineSelectedOption
                  ]}
                  onPress={() => handleBranchSelect(branch._id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.inlineBranchIcon}>
                    <Ionicons 
                      name="business" 
                      size={18} 
                      color={selectedBranchId === branch._id ? DESIGN.colors.orange : DESIGN.colors.muted} 
                    />
                  </View>
                  <View style={styles.inlineBranchInfo}>
                    <Text style={[
                      styles.inlineBranchName,
                      selectedBranchId === branch._id && styles.inlineSelectedText
                    ]}>
                      {branch.name || branch.branchName || 'Unnamed Branch'}
                    </Text>
                    <Text style={styles.inlineBranchId}>ID: {branch._id?.slice(-6).toUpperCase() || 'N/A'}</Text>
                  </View>
                  {selectedBranchId === branch._id && (
                    <Ionicons name="checkmark-circle" size={22} color={DESIGN.colors.orange} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Total Stats Cards */}
        <View style={styles.statsSectionHeader}>
          <Text style={styles.statsSectionTitle}>Total Overview</Text>
        </View>
        <View style={styles.statsGrid}>
          <TouchableOpacity style={[styles.statCard, styles.totalRevenueCard]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="wallet-outline" size={24} color="#fff" />
            </View>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{formatPrice(stats.totalRevenue || 0)}</Text>
            <Text style={styles.statLabel}>Total Revenue</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.statCard, styles.totalOrdersCard]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="documents-outline" size={24} color="#fff" />
            </View>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{(stats.totalOrders || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.statCard, styles.menuCard]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="business-outline" size={24} color="#fff" />
            </View>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{(stats.totalBranches || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Branches</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.statCard, styles.branchUsersCard]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="people-outline" size={24} color="#fff" />
            </View>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{(stats.totalUsers || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Orders Section */}
        <View style={styles.section}>
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
              <TouchableOpacity 
                key={`order-${order._id || index}`} 
                style={styles.orderItem}
                activeOpacity={0.8}
              >
                <View style={styles.orderIconContainer}>
                  <Ionicons name="receipt-outline" size={20} color="#E87E35" />
                </View>
                <View style={styles.orderInfoBox}>
                  <Text style={styles.orderNumber}>#{order.orderNumber || order._id?.slice(-6) || 'N/A'}</Text>
                  <Text style={styles.orderCustomer}>{order.customerName || 'Guest'}</Text>
                  <Text style={styles.orderBranch}>{order.branchName || 'Unknown Branch'}</Text>
                </View>
                <View style={styles.orderRight}>
                  <Text style={styles.orderAmount}>{formatPrice(order.totalAmount || 0)}</Text>
                  <View style={[styles.orderStatusBadge, { backgroundColor: getOrderStatusColor(order.status) + '20' }]}>
                    <Text style={[styles.orderStatusText, { color: getOrderStatusColor(order.status) }]}>
                      {order.status || 'Pending'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
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
            onPress={() => {}}
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
                    onPress={() => {}}
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
          currentRoute="Home"
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: DESIGN.colors.lightBg,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: DESIGN.colors.muted,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: DESIGN.colors.lightBg,
    padding: 20,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: DESIGN.colors.red,
    marginTop: 16,
    marginBottom: 8,
  },
  accessDeniedText: {
    fontSize: 16,
    color: DESIGN.colors.muted,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'android' ? 120 : 100,
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
  branchUsersCard: {
    backgroundColor: DESIGN.colors.purple,
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
    flexShrink: 1,
    width: '100%',
  },
  section: {
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
  branchItem: {
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
  branchIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DESIGN.colors.orange + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  branchInfoBox: {
    flex: 1,
  },
  branchName: {
    fontSize: 15,
    fontWeight: '600',
    color: DESIGN.colors.darkText,
  },
  branchLocation: {
    fontSize: 12,
    color: DESIGN.colors.muted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
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
  statsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
    paddingHorizontal: DESIGN.spacing.pagePad,
  },
  statsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
  },
  branchSelectorSection: {
    paddingHorizontal: DESIGN.spacing.pagePad,
    marginBottom: 12,
  },
  branchSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: DESIGN.colors.white,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DESIGN.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  branchSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  branchSelectorTextContainer: {
    flexDirection: 'column',
  },
  branchSelectorLabel: {
    fontSize: 12,
    color: DESIGN.colors.muted,
    fontWeight: '500',
    marginBottom: 2,
  },
  branchSelectorValue: {
    fontSize: 15,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
  },
  inlineDropdownContainer: {
    backgroundColor: DESIGN.colors.white,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DESIGN.colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inlineBranchOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  inlineSelectedOption: {
    backgroundColor: '#FFF8F0',
  },
  inlineBranchIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  inlineBranchInfo: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    paddingRight: 8,
  },
  inlineBranchName: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '600',
    lineHeight: 20,
  },
  inlineSelectedText: {
    color: DESIGN.colors.orange,
    fontWeight: '700',
  },
  inlineBranchId: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
  },
  totalRevenueCard: {
    backgroundColor: '#1A73E8',
  },
  totalOrdersCard: {
    backgroundColor: '#EA4335',
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
    backgroundColor: DESIGN.colors.green + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  orderInfoBox: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
  },
  orderCustomer: {
    fontSize: 13,
    color: DESIGN.colors.muted,
    marginTop: 2,
  },
  orderBranch: {
    fontSize: 12,
    color: DESIGN.colors.muted,
    marginTop: 1,
  },
  orderRight: {
    alignItems: 'flex-end',
  },
  orderAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
    marginBottom: 4,
  },
  orderStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  orderStatusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  bottomSpacer: {
    height: 20,
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
    fontWeight: '500',
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
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  unreadItem: {
    backgroundColor: '#FFF8F0',
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
    marginBottom: 4,
  },
  itemBody: {
    fontSize: 13,
    color: DESIGN.colors.muted,
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: DESIGN.colors.muted,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DESIGN.colors.orange,
    marginLeft: 8,
    marginTop: 8,
  },
  viewAll: {
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 14,
    color: DESIGN.colors.orange,
    fontWeight: '600',
  },
});
