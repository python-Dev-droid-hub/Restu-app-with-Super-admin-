import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { getSpacing } from '../../utils/responsive';
import { isAdminRole, canAuditBranches } from '../../utils/permissionHelpers';
import { useSettings } from '../../context/SettingsContext';

const { width } = Dimensions.get('window');

// Theme mapping
const theme = {
  primary: COLORS.orange,
  text: COLORS.darkText,
  textSecondary: COLORS.lightText,
  background: COLORS.lightGray,
  white: COLORS.white,
  border: COLORS.border,
  success: COLORS.success,
  error: COLORS.error,
  blue: COLORS.blue,
  purple: COLORS.purple,
};

interface AuditData {
  branch: {
    _id: string;
    branchName: string;
    address: string;
    city: string;
    isActive: boolean;
    createdAt: string;
    managerName?: string;
  };
  overview: {
    totalOrders: number;
    todayOrders: number;
    todayIncome: number;
    monthlyIncome: number;
    totalRevenue: number;
    performance: number;
  };
  financial: {
    dailyRevenue: number[];
    weeklyRevenue: number;
    monthlyRevenue: number;
    averageOrderValue: number;
  };
  operations: {
    totalDeliveries: number;
    avgPrepTime: number;
    kitchenEfficiency: number;
    orderFulfillmentRate: number;
    cancelledOrders: number;
  };
  staff: {
    totalStaff: number;
    chefs: number;
    waiters: number;
    riders: number;
    branchManagers: number;
  };
}

export default function BranchAuditScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  // @ts-ignore
  const branchId = route.params?.branchId;

  const [activeTab, setActiveTab] = useState<'overview' | 'financial' | 'operations' | 'staff'>('overview');
  const [auditData, setAuditData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const { currencySymbol } = useSettings();

  useEffect(() => {
    loadUserRole();
    if (branchId) {
      loadAuditData();
    }
  }, [branchId]);

  const loadUserRole = async () => {
    try {
      const storedRole = await AsyncStorage.getItem('userRole');
      if (storedRole) {
        setUserRole(storedRole);
        if (!canAuditBranches(storedRole)) {
          Alert.alert('Access Denied', 'Only administrators can audit branches.');
          navigation.goBack();
        }
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    }
  };

  const loadAuditData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/branches/${branchId}/audit`);
      if (response.success && response.data) {
        setAuditData(response.data);
      } else {
        Alert.alert('Error', 'Failed to load audit data');
      }
    } catch (error) {
      console.error('Error loading audit data:', error);
      Alert.alert('Error', 'Failed to load audit data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = () => {
    Alert.alert('Export Report', 'Report export functionality will be implemented here.');
  };

  const handleDeactivateBranch = () => {
    Alert.alert(
      'Deactivate Branch',
      `Are you sure you want to deactivate ${auditData?.branch.branchName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.patch(`/branches/${branchId}/deactivate`);
              if (response.success) {
                Alert.alert('Success', 'Branch deactivated');
                loadAuditData();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to deactivate branch');
            }
          },
        },
      ]
    );
  };

  const MetricCard = ({ title, value, subtitle, color = theme.primary }: { title: string; value: string | number; subtitle?: string; color?: string }) => (
    <View style={styles.metricCard}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      {/* Branch Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <View>
            <Text style={styles.branchName}>{auditData?.branch.branchName}</Text>
            <Text style={styles.branchLocation}>
              {auditData?.branch.address}, {auditData?.branch.city}
            </Text>
          </View>
          <View style={[styles.statusBadge, auditData?.branch.isActive ? styles.activeBadge : styles.inactiveBadge]}>
            <Text style={[styles.statusText, auditData?.branch.isActive ? styles.activeStatusText : styles.inactiveStatusText]}>
              {auditData?.branch.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {auditData?.branch.managerName && (
          <View style={styles.managerRow}>
            <Ionicons name="person" size={16} color={theme.textSecondary} />
            <Text style={styles.managerText}>Manager: {auditData.branch.managerName}</Text>
          </View>
        )}

        <View style={styles.createdRow}>
          <Text style={styles.createdText}>
            Created: {new Date(auditData?.branch.createdAt || '').toLocaleDateString()}
          </Text>
        </View>
      </View>

      {/* Key Metrics */}
      <Text style={styles.sectionTitle}>Performance Overview</Text>
      <View style={styles.metricsGrid}>
        <MetricCard
          title="Today's Orders"
          value={auditData?.overview.todayOrders || 0}
          subtitle="orders"
          color={theme.blue}
        />
        <MetricCard
          title="Today's Income"
          value={`${currencySymbol}${auditData?.overview.todayIncome || 0}`}
          subtitle="revenue"
          color={theme.success}
        />
        <MetricCard
          title="Monthly Income"
          value={`${currencySymbol}${auditData?.overview.monthlyIncome || 0}`}
          subtitle="this month"
          color={theme.primary}
        />
        <MetricCard
          title="Performance"
          value={`${auditData?.overview.performance || 0}%`}
          subtitle="on-time rate"
          color={theme.purple}
        />
      </View>

      {/* Total Stats */}
      <View style={styles.totalStatsCard}>
        <View style={styles.totalStatItem}>
          <Text style={styles.totalStatValue}>{auditData?.overview.totalOrders || 0}</Text>
          <Text style={styles.totalStatLabel}>Total Orders</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.totalStatItem}>
          <Text style={styles.totalStatValue}>{currencySymbol}{auditData?.overview.totalRevenue || 0}</Text>
          <Text style={styles.totalStatLabel}>Total Revenue</Text>
        </View>
      </View>
    </View>
  );

  const renderFinancialTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Financial Overview</Text>
      <View style={styles.metricsGrid}>
        <MetricCard
          title="Weekly Revenue"
          value={`${currencySymbol}${auditData?.financial.weeklyRevenue || 0}`}
          color={theme.blue}
        />
        <MetricCard
          title="Monthly Revenue"
          value={`${currencySymbol}${auditData?.financial.monthlyRevenue || 0}`}
          color={theme.primary}
        />
        <MetricCard
          title="Avg Order Value"
          value={`${currencySymbol}${auditData?.financial.averageOrderValue || 0}`}
          color={theme.success}
        />
        <MetricCard
          title="Daily Avg"
          value={`${currencySymbol}${Math.round((auditData?.financial.weeklyRevenue || 0) / 7)}`}
          color={theme.purple}
        />
      </View>

      {/* Payment Status */}
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Payment Status</Text>
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Completed Payments</Text>
          <Text style={[styles.paymentValue, { color: theme.success }]}>98%</Text>
        </View>
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Pending Payments</Text>
          <Text style={[styles.paymentValue, { color: theme.error }]}>2%</Text>
        </View>
      </View>
    </View>
  );

  const renderOperationsTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Operations Metrics</Text>
      <View style={styles.metricsGrid}>
        <MetricCard
          title="Total Deliveries"
          value={auditData?.operations.totalDeliveries || 0}
          color={theme.blue}
        />
        <MetricCard
          title="Avg Prep Time"
          value={`${auditData?.operations.avgPrepTime || 0}m`}
          subtitle="minutes"
          color={theme.primary}
        />
        <MetricCard
          title="Kitchen Efficiency"
          value={`${auditData?.operations.kitchenEfficiency || 0}%`}
          color={theme.success}
        />
        <MetricCard
          title="Fulfillment Rate"
          value={`${auditData?.operations.orderFulfillmentRate || 0}%`}
          color={theme.purple}
        />
      </View>

      {/* Cancelled Orders */}
      <View style={[styles.infoCard, styles.warningCard]}>
        <View style={styles.warningHeader}>
          <Ionicons name="warning" size={24} color={theme.error} />
          <Text style={styles.warningTitle}>Cancelled Orders</Text>
        </View>
        <Text style={styles.warningValue}>{auditData?.operations.cancelledOrders || 0}</Text>
        <Text style={styles.warningSubtitle}>orders cancelled this month</Text>
      </View>
    </View>
  );

  const renderStaffTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Staff Overview</Text>
      <View style={styles.metricsGrid}>
        <MetricCard
          title="Total Staff"
          value={auditData?.staff.totalStaff || 0}
          color={theme.blue}
        />
        <MetricCard
          title="Chefs"
          value={auditData?.staff.chefs || 0}
          color={theme.primary}
        />
        <MetricCard
          title="Waiters"
          value={auditData?.staff.waiters || 0}
          color={theme.success}
        />
        <MetricCard
          title="Riders"
          value={auditData?.staff.riders || 0}
          color={theme.purple}
        />
      </View>

      {/* Staff Distribution */}
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Staff Distribution</Text>
        {auditData?.staff.totalStaff ? (
          <>
            <View style={styles.distributionRow}>
              <Text style={styles.distributionLabel}>Chefs</Text>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${(auditData.staff.chefs / auditData.staff.totalStaff) * 100}%`,
                      backgroundColor: theme.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.distributionValue}>{auditData.staff.chefs}</Text>
            </View>
            <View style={styles.distributionRow}>
              <Text style={styles.distributionLabel}>Waiters</Text>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${(auditData.staff.waiters / auditData.staff.totalStaff) * 100}%`,
                      backgroundColor: theme.blue,
                    },
                  ]}
                />
              </View>
              <Text style={styles.distributionValue}>{auditData.staff.waiters}</Text>
            </View>
            <View style={styles.distributionRow}>
              <Text style={styles.distributionLabel}>Riders</Text>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${(auditData.staff.riders / auditData.staff.totalStaff) * 100}%`,
                      backgroundColor: theme.success,
                    },
                  ]}
                />
              </View>
              <Text style={styles.distributionValue}>{auditData.staff.riders}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.emptyText}>No staff data available</Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.white} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading audit data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.white} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + getSpacing(1) }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color={theme.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Branch Audit</Text>
            <Text style={styles.headerSubtitle}>{auditData?.branch.branchName}</Text>
          </View>
          <TouchableOpacity onPress={handleExportReport}>
            <Ionicons name="download-outline" size={24} color={theme.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        {(['overview', 'financial', 'operations', 'staff'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'financial' && renderFinancialTab()}
        {activeTab === 'operations' && renderOperationsTab()}
        {activeTab === 'staff' && renderStaffTab()}

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => {
              // @ts-ignore
              navigation.navigate('AddBranch', { branchId });
            }}
          >
            <Ionicons name="create" size={20} color={theme.white} />
            <Text style={styles.actionButtonText}>Edit Branch</Text>
          </TouchableOpacity>

          {auditData?.branch.isActive ? (
            <TouchableOpacity style={[styles.actionButton, styles.deactivateButton]} onPress={handleDeactivateBranch}>
              <Ionicons name="close-circle" size={20} color={theme.white} />
              <Text style={styles.actionButtonText}>Deactivate</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.activateButton]}
              onPress={async () => {
                try {
                  const response = await api.patch(`/branches/${branchId}/activate`);
                  if (response.success) {
                    Alert.alert('Success', 'Branch activated');
                    loadAuditData();
                  }
                } catch (error) {
                  Alert.alert('Error', 'Failed to activate branch');
                }
              }}
            >
              <Ionicons name="checkmark-circle" size={20} color={theme.white} />
              <Text style={styles.actionButtonText}>Activate</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: getSpacing(4) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: getSpacing(2),
    fontSize: 14,
    color: theme.textSecondary,
  },
  header: {
    backgroundColor: '#2C3E50',
    paddingHorizontal: getSpacing(2),
    paddingBottom: getSpacing(2),
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.white,
    paddingHorizontal: getSpacing(1),
    paddingVertical: getSpacing(1),
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  tab: {
    flex: 1,
    paddingVertical: getSpacing(1),
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: theme.primary + '20',
  },
  tabText: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: theme.primary,
  },
  scrollView: {
    flex: 1,
  },
  tabContent: {
    padding: getSpacing(2),
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: getSpacing(2),
  },
  infoCard: {
    backgroundColor: theme.white,
    borderRadius: 12,
    padding: getSpacing(2),
    marginBottom: getSpacing(2),
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: getSpacing(1.5),
  },
  branchName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.text,
  },
  branchLocation: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#E8F5E9',
  },
  inactiveBadge: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeStatusText: {
    color: '#2E7D32',
  },
  inactiveStatusText: {
    color: '#C62828',
  },
  managerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getSpacing(1),
  },
  managerText: {
    fontSize: 13,
    color: theme.textSecondary,
    marginLeft: 8,
  },
  createdRow: {
    marginTop: getSpacing(1),
    paddingTop: getSpacing(1),
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  createdText: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: getSpacing(1.5),
    marginBottom: getSpacing(2),
  },
  metricCard: {
    width: (width - getSpacing(6)) / 2,
    backgroundColor: theme.white,
    borderRadius: 12,
    padding: getSpacing(2),
  },
  metricTitle: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  metricSubtitle: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 4,
  },
  totalStatsCard: {
    flexDirection: 'row',
    backgroundColor: theme.white,
    borderRadius: 12,
    padding: getSpacing(2),
  },
  totalStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  totalStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.primary,
  },
  totalStatLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.border,
    marginHorizontal: getSpacing(2),
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: getSpacing(2),
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: getSpacing(1),
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  paymentLabel: {
    fontSize: 14,
    color: theme.text,
  },
  paymentValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  warningCard: {
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: getSpacing(1),
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.error,
  },
  warningValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.error,
  },
  warningSubtitle: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 4,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getSpacing(1.5),
  },
  distributionLabel: {
    width: 70,
    fontSize: 13,
    color: theme.text,
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: theme.border,
    borderRadius: 4,
    marginHorizontal: getSpacing(1.5),
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  distributionValue: {
    width: 30,
    fontSize: 13,
    color: theme.textSecondary,
    textAlign: 'right',
  },
  emptyText: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    paddingVertical: getSpacing(2),
  },
  actionSection: {
    flexDirection: 'row',
    gap: getSpacing(1.5),
    padding: getSpacing(2),
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  editButton: {
    backgroundColor: theme.blue,
  },
  deactivateButton: {
    backgroundColor: theme.error,
  },
  activateButton: {
    backgroundColor: theme.success,
  },
  actionButtonText: {
    color: theme.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
