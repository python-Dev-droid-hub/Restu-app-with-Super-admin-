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
import { isAdminRole } from '../../utils/permissionHelpers';
import { useBranch } from '../../context/BranchContext';
import { useSettings } from '../../context/SettingsContext';
import GlobalBranchBar from '../../components/admin/GlobalBranchBar';
import { shareCsvReport } from '../../utils/reportExport';
import { navigateToTabScreen } from '../../utils/navigateToOrder';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';

const { width } = Dimensions.get('window');

type PeriodFilter = 'today' | '7d' | '30d' | 'custom';

const toDateString = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

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
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('30d');
  const [customStartDate, setCustomStartDate] = useState(() =>
    toDateString(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
  );
  const [customEndDate, setCustomEndDate] = useState(() => toDateString(new Date()));
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const { getApiBranchParam, branchRevision, isReady, selectedBranchName } = useBranch();
  const { formatPrice } = useSettings();
  const [profileImage, setProfileImage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

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
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    }
  };

  const menuItems = [
    { name: t('nav.notifications'), icon: 'notifications-outline', screen: 'AdminNotifications' },
    { name: 'Table Assignment', icon: 'grid-outline', screen: 'TableAssignment' },
    // Only show Branches for SUPER_ADMIN
    ...(isAdminRole(userRole) ? [{ name: t('nav.branches'), icon: 'business-outline', screen: 'AdminBranches' }] : []),
    { name: t('nav.deals'), icon: 'pricetag-outline', screen: 'AdminDeals' },
    { name: t('nav.coupons'), icon: 'ticket-outline', screen: 'AdminCoupons' },
    { name: t('nav.productSizes'), icon: 'resize-outline', screen: 'AdminProductSizes' },
    { name: t('nav.categories'), icon: 'grid-outline', screen: 'AdminCategories' },
    { name: t('nav.reports'), icon: 'bar-chart-outline', screen: 'AdminReports' },
    ...(isAdminRole(userRole)
      ? [{ name: t('nav.settings'), icon: 'settings-outline', screen: 'AdminSettings' }]
      : []),
  ];

  useEffect(() => {
    if (!isReady) return;
    if (periodFilter === 'custom') return;
    loadReports();
  }, [periodFilter, isReady, branchRevision]);

  useRealtimeRefresh(
    () => {
      if (isReady) loadReports();
    },
    { enabled: isReady, matchTypes: ['ORDER', 'PAYMENT'] }
  );

  const getRangeParam = () => {
    if (periodFilter === 'today') return '1d';
    if (periodFilter === '7d') return '7d';
    return '30d';
  };

  const parseAnalyticsPayload = (payload: unknown): ReportData | null => {
    if (!payload || typeof payload !== 'object') return null;
    const data = payload as Record<string, unknown>;
    const nested = data.data;
    const source =
      nested && typeof nested === 'object' && 'totalOrders' in (nested as object)
        ? (nested as ReportData)
        : (data as unknown as ReportData);
    if (typeof source.totalOrders !== 'number' && typeof source.totalRevenue !== 'number') {
      return null;
    }
    return {
      totalOrders: Number(source.totalOrders || 0),
      totalRevenue: Number(source.totalRevenue || 0),
      averageOrderValue: Number(source.averageOrderValue || 0),
      topRestaurants: Array.isArray(source.topRestaurants) ? source.topRestaurants : [],
      revenueByMonth: Array.isArray(source.revenueByMonth) ? source.revenueByMonth : [],
      userGrowth: Array.isArray(source.userGrowth) ? source.userGrowth : [],
      orderStatusDistribution: source.orderStatusDistribution || {
        PENDING: 0,
        CONFIRMED: 0,
        PREPARING: 0,
        READY: 0,
        OUT_FOR_DELIVERY: 0,
        DELIVERED: 0,
        CANCELLED: 0,
      },
    };
  };

  const buildReportsUrl = (role: string, exportMode = false) => {
    const base =
      role === 'BRANCH_MANAGER'
        ? exportMode
          ? '/dashboard/manager/analytics/export'
          : '/dashboard/manager/analytics'
        : exportMode
          ? '/dashboard/admin/analytics/export'
          : '/dashboard/admin/analytics';

    let url: string;
    if (periodFilter === 'custom') {
      url = `${base}?range=custom&startDate=${encodeURIComponent(customStartDate)}&endDate=${encodeURIComponent(customEndDate)}`;
    } else {
      url = `${base}?range=${getRangeParam()}`;
    }
    const branchId = getApiBranchParam();
    if (branchId && role !== 'BRANCH_MANAGER') {
      url += `&branchId=${encodeURIComponent(branchId)}`;
    }
    return url;
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const userRoleRaw = await AsyncStorage.getItem('userRole');
      const role = (userRoleRaw || '').toUpperCase();
      const url = buildReportsUrl(role);

      console.log('[Reports] Fetching:', url);
      const response = await api.get(url);

      if (response.success) {
        const parsed = parseAnalyticsPayload(response.data ?? response);
        if (parsed) {
          setReportData(parsed);
        } else {
          setError('Invalid report data from server');
          setReportData(null);
        }
      } else {
        setError(response.message || 'Failed to load reports');
        setReportData(null);
      }
    } catch (err: any) {
      console.error('Error loading reports:', err);
      setError(err.message || 'Failed to load reports');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async () => {
    try {
      setDownloading(true);
      const userRoleRaw = await AsyncStorage.getItem('userRole');
      const role = (userRoleRaw || '').toUpperCase();
      const url = buildReportsUrl(role, true);
      const response = await api.get<{ csv?: string; fileName?: string }>(url);

      if (!response.success) {
        throw new Error(response.message || 'Export failed');
      }

      const payload = (response.data || {}) as { csv?: string; fileName?: string };
      const csv = payload.csv;
      if (!csv) {
        throw new Error('No export data returned');
      }

      const fileName =
        payload.fileName ||
        `report-${periodFilter}-${selectedBranchName || 'branch'}.csv`.replace(/\s+/g, '-');

      await shareCsvReport(csv, fileName);
    } catch (err: any) {
      console.error('[Reports] Download error:', err);
      Alert.alert('Download failed', err?.message || 'Could not export report');
    } finally {
      setDownloading(false);
    }
  };

  const renderPeriodTab = (tab: PeriodFilter, label: string) => {
    const isActive = periodFilter === tab;
    return (
      <TouchableOpacity
        style={[styles.tab, isActive && styles.tabActive]}
        onPress={() => setPeriodFilter(tab)}
      >
        <Text style={[styles.tabText, isActive && styles.tabTextActive]} numberOfLines={1}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const applyCustomRange = () => {
    if (customStartDate > customEndDate) {
      Alert.alert('Invalid range', 'Start date must be on or before end date.');
      return;
    }
    loadReports();
  };

  const newUsersInPeriod = (reportData?.userGrowth || []).reduce((sum, row) => sum + (row.users || 0), 0);

  const statusEntries = Object.entries(reportData?.orderStatusDistribution || {}).filter(
    ([, count]) => (count as number) > 0
  );

  // Helper function to get color for order status
  const getStatusColor = (status: string): string => {
    const colors: { [key: string]: string } = {
      PENDING: '#FFC107',
      KITCHEN_ACCEPTED: '#2196F3',
      PREPARING: '#FF9800',
      READY: '#9C27B0',
      RIDER_ASSIGNED: '#7E57C2',
      PICKED_UP: '#5C6BC0',
      OUT_FOR_DELIVERY: '#00BCD4',
      DELIVERED: '#4CAF50',
      SERVED: '#66BB6A',
      COMPLETED: '#2E7D32',
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
          <Text style={styles.loadingText}>{error || 'Failed to load reports'}</Text>
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
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadReports} tintColor="#E87E35" />
        }
      >
        <GlobalBranchBar />

        {/* Period filters and download */}
        <View style={styles.tabsContainer}>
          {renderPeriodTab('today', 'Today')}
          {renderPeriodTab('7d', '7D')}
          {renderPeriodTab('30d', '30D')}
          {renderPeriodTab('custom', 'Custom')}
          <TouchableOpacity
            style={styles.filterButton}
            onPress={downloadReport}
            disabled={downloading || !reportData}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#E87E35" />
            ) : (
              <Ionicons name="cloud-download-outline" size={20} color="#666" />
            )}
          </TouchableOpacity>
        </View>

        {periodFilter === 'custom' && (
          <View style={styles.dateFilterCard}>
            <View style={styles.dateFilterRow}>
              <Text style={styles.dateFilterLabel}>From</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => {
                  setTempStartDate(new Date(`${customStartDate}T12:00:00`));
                  setShowStartDatePicker(true);
                }}
              >
                <Text style={styles.dateInputText}>{customStartDate}</Text>
                <Ionicons name="calendar-outline" size={18} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.dateFilterRow}>
              <Text style={styles.dateFilterLabel}>To</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => {
                  setTempEndDate(new Date(`${customEndDate}T12:00:00`));
                  setShowEndDatePicker(true);
                }}
              >
                <Text style={styles.dateInputText}>{customEndDate}</Text>
                <Ionicons name="calendar-outline" size={18} color="#666" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.applyRangeButton} onPress={applyCustomRange}>
              <Text style={styles.applyRangeButtonText}>Apply range</Text>
            </TouchableOpacity>
          </View>
        )}

        {Platform.OS !== 'ios' && showStartDatePicker && (
          <DateTimePicker
            value={tempStartDate}
            mode="date"
            display="default"
            maximumDate={new Date(`${customEndDate}T23:59:59`)}
            onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
              setShowStartDatePicker(false);
              if (event.type === 'set' && selectedDate) {
                setCustomStartDate(toDateString(selectedDate));
              }
            }}
          />
        )}

        {Platform.OS !== 'ios' && showEndDatePicker && (
          <DateTimePicker
            value={tempEndDate}
            mode="date"
            display="default"
            minimumDate={new Date(`${customStartDate}T00:00:00`)}
            maximumDate={new Date()}
            onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
              setShowEndDatePicker(false);
              if (event.type === 'set' && selectedDate) {
                setCustomEndDate(toDateString(selectedDate));
              }
            }}
          />
        )}

        {Platform.OS === 'ios' && (
          <Modal visible={showStartDatePicker} transparent animationType="fade" onRequestClose={() => setShowStartDatePicker(false)}>
            <View style={styles.iosPickerOverlay}>
              <View style={styles.iosPickerContainer}>
                <View style={styles.iosPickerHeader}>
                  <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                    <Text style={styles.iosPickerAction}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setCustomStartDate(toDateString(tempStartDate));
                      setShowStartDatePicker(false);
                    }}
                  >
                    <Text style={[styles.iosPickerAction, styles.iosPickerActionPrimary]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempStartDate}
                  mode="date"
                  display="spinner"
                  maximumDate={new Date(`${customEndDate}T23:59:59`)}
                  onChange={(_, selectedDate) => {
                    if (selectedDate) setTempStartDate(selectedDate);
                  }}
                />
              </View>
            </View>
          </Modal>
        )}

        {Platform.OS === 'ios' && (
          <Modal visible={showEndDatePicker} transparent animationType="fade" onRequestClose={() => setShowEndDatePicker(false)}>
            <View style={styles.iosPickerOverlay}>
              <View style={styles.iosPickerContainer}>
                <View style={styles.iosPickerHeader}>
                  <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                    <Text style={styles.iosPickerAction}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setCustomEndDate(toDateString(tempEndDate));
                      setShowEndDatePicker(false);
                    }}
                  >
                    <Text style={[styles.iosPickerAction, styles.iosPickerActionPrimary]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempEndDate}
                  mode="date"
                  display="spinner"
                  minimumDate={new Date(`${customStartDate}T00:00:00`)}
                  maximumDate={new Date()}
                  onChange={(_, selectedDate) => {
                    if (selectedDate) setTempEndDate(selectedDate);
                  }}
                />
              </View>
            </View>
          </Modal>
        )}

        {/* Revenue Chart */}
        <RevenueChart />

        {/* Stats Cards Row */}
        <View style={styles.statsRow}>
          {/* Total Revenue Card */}
          <View style={[styles.statCard, { backgroundColor: '#2E7D52' }]}>
            <Text style={styles.statLabel}>Total Revenue</Text>
            <Text style={styles.statValue}>{formatPrice(reportData?.totalRevenue || 0)}</Text>
            <View style={styles.changeRow}>
              <Ionicons name="cash-outline" size={12} color="#4CAF50" />
              <Text style={styles.changeText}>Avg: {formatPrice(reportData?.averageOrderValue || 0)}</Text>
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
            <Text style={styles.statValue}>{newUsersInPeriod.toLocaleString()}</Text>
            <View style={styles.changeRow}>
              <Ionicons name="people-outline" size={12} color="#81D4FA" />
              <Text style={[styles.changeText, { color: '#81D4FA' }]}>New users</Text>
            </View>
          </View>
        </View>

        {/* Top Restaurants Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Branches</Text>
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
                <Text style={styles.itemRevenue}>{formatPrice(item.revenue)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Order Status Distribution */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Status</Text>
          {statusEntries.length === 0 ? (
            <Text style={{ color: '#999', paddingVertical: 12 }}>No orders in this period</Text>
          ) : (
          statusEntries.map(([status, count]) => (
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
          )))}
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
                  const tabScreens = new Set([
                    'ManagerDashboard',
                    'Home',
                    'AdminOrders',
                    'AdminProducts',
                    'AdminUsers',
                    'AdminReports',
                    'ManagerMenu',
                    'BannerManagement',
                  ]);
                  if (tabScreens.has(item.screen) && tabNavigation) {
                    // @ts-ignore
                    tabNavigation.navigate(item.screen);
                  } else {
                    navigateToTabScreen(navigation as never, item.screen);
                  }
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
        navigation={navigation}
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
  dateFilterCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#eee',
  },
  dateFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  dateFilterLabel: {
    width: 40,
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
  },
  dateInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateInputText: {
    fontSize: 14,
    color: '#1a1a2e',
  },
  applyRangeButton: {
    marginTop: 4,
    backgroundColor: '#E87E35',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  applyRangeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  iosPickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  iosPickerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  iosPickerAction: {
    fontSize: 16,
    color: '#666',
  },
  iosPickerActionPrimary: {
    color: '#E87E35',
    fontWeight: '600',
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
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  tabActive: {
    backgroundColor: '#E87E35',
  },
  tabText: {
    fontSize: 12,
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
