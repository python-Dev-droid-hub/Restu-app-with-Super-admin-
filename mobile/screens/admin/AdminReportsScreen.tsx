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
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalization } from '../../context/LocalizationContext';
import { COLORS } from '../../constants/colors';
import { getSpacing } from '../../utils/responsive';
import ResponsiveHeader from '../../components/layout/ResponsiveHeader';
import ProfileMenu from '../../components/common/ProfileMenu';
import AdminBottomNavigation from '../../components/navigation/AdminBottomNavigation';

const { width } = Dimensions.get('window');

type PeriodTab = 'today' | 'month';

interface ReportData {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  topRestaurants: Array<{
    name: string;
    revenue: number;
    orders: number;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    orders: number;
  }>;
  userGrowth: Array<{
    month: string;
    users: number;
  }>;
  orderStatusDistribution: {
    PENDING: number;
    CONFIRMED: number;
    PREPARING: number;
    READY: number;
    OUT_FOR_DELIVERY: number;
    DELIVERED: number;
    CANCELLED: number;
  };
}

export default function AdminReportsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useLocalization();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [activeTab, setActiveTab] = useState<PeriodTab>('month');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [assignedBranch, setAssignedBranch] = useState<{_id?: string; name?: string; code?: string}>({});
  const [profileImage, setProfileImage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Get parent tab navigation for bottom nav (undefined for stack screens)
  const tabNavigation = navigation.getParent();

  // Load user role on mount
  useEffect(() => {
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    try {
      const stored = await AsyncStorage.getItem('userData');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUserRole(parsed.role || '');
        setProfileImage(parsed.image || parsed.profileImage || parsed.avatar || '');
        // Get manager's assigned branch
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
      console.error('Error loading user role:', error);
    }
  };

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
    loadReports();
  }, [activeTab]);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      // Get user data for branch manager filtering
      const stored = await AsyncStorage.getItem('userData');
      let branchId = '';
      if (stored) {
        const parsed = JSON.parse(stored);
        const branchData = parsed.assignedBranch || parsed.branch;
        branchId = branchData?._id || branchData?.branchId || parsed.branchId || '';
      }
      
      // Use manager-specific endpoint for BRANCH_MANAGER role
      const userRoleRaw = await AsyncStorage.getItem('userRole');
      const userRole = (userRoleRaw || '').toUpperCase();
      const endpoint = userRole === 'BRANCH_MANAGER'
        ? `/dashboard/manager/analytics?range=${activeTab === 'today' ? '1d' : '30d'}`
        : `/dashboard/admin/analytics?range=${activeTab === 'today' ? '1d' : '30d'}`;
      
      let url = endpoint;
      if (branchId && userRole !== 'BRANCH_MANAGER') {
        url += `&branchId=${branchId}`;
      }
      
      console.log('[Reports] Fetching:', url);
      const response = await api.get(url);
      console.log('[Reports] Response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        setReportData(response.data);
      } else {
        setError('Failed to load reports');
        setReportData(null);
      }
    } catch (error: any) {
      console.error('Error loading reports:', error);
      setError(error.message || 'Failed to load reports');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const renderTab = (tab: PeriodTab, label: string) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity
        style={[styles.tab, isActive && styles.tabActive]}
        onPress={() => setActiveTab(tab)}
      >
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  // Helper function to get color for order status
  const getStatusColor = (status: string): string => {
    const colors: { [key: string]: string } = {
      PENDING: '#FFC107',
      CONFIRMED: '#2196F3',
      PREPARING: '#FF9800',
      READY: '#9C27B0',
      OUT_FOR_DELIVERY: '#00BCD4',
      DELIVERED: '#4CAF50',
      CANCELLED: '#F44336',
    };
    return colors[status] || '#999';
  };

  // Revenue chart using monthly data from backend
  const RevenueChart = () => {
    const data = reportData?.revenueByMonth || [];
    if (data.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Revenue Trends</Text>
          <View style={[styles.chartWrapper, { justifyContent: 'center', alignItems: 'center', height: 200 }]}>
            <Text style={{ color: '#999' }}>No revenue data available</Text>
          </View>
        </View>
      );
    }
    
    const revenues = data.map(d => d.revenue);
    const maxValue = Math.max(...revenues, 1);
    const minValue = Math.min(...revenues);
    const range = maxValue - minValue || 1;

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Revenue Trends</Text>
        <View style={styles.chartWrapper}>
          {/* Y-axis labels */}
          <View style={styles.yAxis}>
            {[100, 80, 60, 40, 20, 0].map((pct, i) => (
              <Text key={i} style={styles.yAxisLabel}>
                {Math.round(maxValue * pct / 100).toLocaleString()}
              </Text>
            ))}
          </View>
          {/* Chart area */}
          <View style={styles.chartArea}>
            {/* Grid lines */}
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={styles.gridLine} />
            ))}
            {/* Data bars */}
            <View style={styles.barContainer}>
              {data.map((point, index) => {
                const height = ((point.revenue - minValue) / range) * 80 + 10;
                return (
                  <View key={index} style={styles.barWrapper}>
                    <View
                      style={[
                        styles.chartBar,
                        { height: `${height}%` }
                      ]}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        </View>
        {/* X-axis labels */}
        <View style={styles.xAxis}>
          {data.map((point, i) => (
            <Text key={i} style={styles.xAxisLabel}>{point.month}</Text>
          ))}
        </View>
      </View>
    );
  };

  if (!reportData && loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E87E35" />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </View>
    );
  }

  if (!reportData && !loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        
        {/* Responsive Header */}
        <ResponsiveHeader
          title={t('nav.reports')}
          notificationCount={3}
          profileImage={profileImage}
          onNotificationPress={() => {
            // @ts-ignore
            navigation.navigate('AdminNotifications');
          }}
          onProfilePress={() => setShowProfileMenu(true)}
        />

        <View style={styles.loadingContainer}>
          <Ionicons name="bar-chart-outline" size={64} color="#ccc" />
          <Text style={styles.loadingText}>Failed to load reports</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadReports}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      {/* Responsive Header */}
      <ResponsiveHeader
        title={t('nav.reports')}
        notificationCount={3}
        profileImage={profileImage}
        onNotificationPress={() => {
          // @ts-ignore
          navigation.navigate('AdminNotifications');
        }}
        onProfilePress={() => setShowProfileMenu(true)}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Branch Info */}
        <View style={styles.branchInfoContainer}>
          <View style={styles.branchInfo}>
            <Ionicons name="business-outline" size={18} color="#E87E35" />
            <Text style={styles.branchInfoText}>
              {userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'
                ? 'All Branches'
                : (assignedBranch.name || 'Loading Branch...')}
            </Text>
            {userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN' && assignedBranch.code && (
              <View style={styles.branchCodeBadge}>
                <Text style={styles.branchCodeText}>{assignedBranch.code}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Tabs and Download */}
        <View style={styles.tabsContainer}>
          {renderTab('today', 'Today')}
          {renderTab('month', 'Month')}
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="cloud-download-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Revenue Chart */}
        <RevenueChart />

        {/* Stats Cards Row */}
        <View style={styles.statsRow}>
          {/* Total Revenue Card */}
          <View style={[styles.statCard, { backgroundColor: '#2E7D52' }]}>
            <Text style={styles.statLabel}>Total Revenue</Text>
            <Text style={styles.statValue}>${(reportData?.totalRevenue || 0).toLocaleString()}</Text>
            <View style={styles.changeRow}>
              <Ionicons name="cash-outline" size={12} color="#4CAF50" />
              <Text style={styles.changeText}>Avg: ${(reportData?.averageOrderValue || 0).toLocaleString()}</Text>
            </View>
          </View>

          {/* Total Orders Card */}
          <View style={[styles.statCard, { backgroundColor: '#E87E35' }]}>
            <Text style={styles.statLabel}>Total Orders</Text>
            <Text style={styles.statValue}>{(reportData?.totalOrders || 0).toLocaleString()}</Text>
            <View style={styles.changeRow}>
              <Ionicons name="receipt-outline" size={12} color="#FFD54F" />
              <Text style={[styles.changeText, { color: '#FFD54F' }]}>In selected period</Text>
            </View>
          </View>

          {/* User Growth Card */}
          <View style={[styles.statCard, { backgroundColor: '#2196F3' }]}>
            <Text style={styles.statLabel}>User Growth</Text>
            <Text style={styles.statValue}>{(reportData?.userGrowth || []).length}</Text>
            <View style={styles.changeRow}>
              <Ionicons name="people-outline" size={12} color="#81D4FA" />
              <Text style={[styles.changeText, { color: '#81D4FA' }]}>New users</Text>
            </View>
          </View>
        </View>

        {/* Top Restaurants Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Restaurants</Text>
          {(reportData?.topRestaurants || []).length === 0 ? (
            <Text style={{ color: '#999', padding: 20, textAlign: 'center' }}>No restaurant data available</Text>
          ) : (
            (reportData?.topRestaurants || []).map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <View style={[styles.itemIcon, { backgroundColor: '#E87E35' }]}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>{index + 1}</Text>
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>{item.orders} orders</Text>
                </View>
                <Text style={styles.itemRevenue}>${item.revenue.toLocaleString()}</Text>
              </View>
            ))
          )}
        </View>

        {/* Order Status Distribution */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Status</Text>
          {reportData?.orderStatusDistribution && Object.entries(reportData.orderStatusDistribution).map(([status, count]) => (
            <View key={status} style={styles.statusRow}>
              <Text style={styles.statusLabel}>{status.replace(/_/g, ' ')}</Text>
              <View style={styles.statusBar}>
                <View style={[styles.statusBarFill, { 
                  width: `${Math.min(100, (count as number) / (reportData?.totalOrders || 1) * 100)}%`,
                  backgroundColor: getStatusColor(status)
                }]} />
              </View>
              <Text style={styles.statusCount}>{count as number}</Text>
            </View>
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom Navigation */}
      <AdminBottomNavigation onMorePress={() => setShowMoreMenu(true)} tabNavigation={tabNavigation} />

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
                key={index}
                style={styles.menuItem}
                onPress={() => {
                  setShowMoreMenu(false);
                  // @ts-ignore
                  navigation.navigate(item.screen);
                }}
              >
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
        onLogout={() => {
          // @ts-ignore
          navigation.navigate('Welcome');
        }}
        onChangePassword={() => {
          // @ts-ignore
          navigation.navigate('ChangePassword');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    paddingTop: 6,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: 'bold',
    color: '#1a1a2e',
    flexShrink: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexShrink: 0,
    justifyContent: 'flex-end',
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 15,
    alignItems: 'center',
    gap: 10,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  tabActive: {
    backgroundColor: '#E87E35',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  chartContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 15,
  },
  chartWrapper: {
    flexDirection: 'row',
    height: 180,
  },
  yAxis: {
    width: 30,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 5,
  },
  yAxisLabel: {
    fontSize: 10,
    color: '#999',
  },
  chartArea: {
    flex: 1,
    position: 'relative',
    justifyContent: 'space-between',
  },
  gridLine: {
    height: 1,
    backgroundColor: '#f0f0f0',
    width: '100%',
  },
  lineContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  chartPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2E7D52',
    marginLeft: -4,
    marginBottom: -4,
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 35,
    marginTop: 8,
  },
  xAxisLabel: {
    fontSize: 10,
    color: '#999',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 25,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 15,
    minHeight: 100,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeText: {
    fontSize: 11,
    color: '#4CAF50',
  },
  section: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 15,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 12,
    color: '#999',
  },
  itemRevenue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
  },
  bottomSpacer: {
    height: 100,
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
    paddingBottom: 40,
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
    paddingTop: 70,
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
  // Chart bar styles
  barContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 150,
    paddingHorizontal: 10,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  chartBar: {
    width: 20,
    backgroundColor: '#E87E35',
    borderRadius: 4,
  },
  // Item icon for top restaurants
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Status distribution styles
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusLabel: {
    width: 100,
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  statusBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginHorizontal: 10,
  },
  statusBarFill: {
    height: 8,
    borderRadius: 4,
  },
  statusCount: {
    width: 40,
    fontSize: 12,
    color: '#1a1a2e',
    fontWeight: '600',
    textAlign: 'right',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#E87E35',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Branch Info Styles - Match Homepage
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
});
