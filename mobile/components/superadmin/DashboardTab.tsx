import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SPACING } from '../../constants/spacing';
import { api } from '../../components/api/client';

interface Branch {
  _id: string;
  id?: string;
  name?: string;
  branchName?: string;
}

export default function DashboardTab() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [stats, setStats] = useState({
    ordersToday: 0,
    totalItemsSold: 0,
    todayRevenue: 0,
    totalBranches: 0,
    topPerformingBranches: [],
  });

  const fetchDashboardData = async () => {
    try {
      console.log('Fetching dashboard data...');
      let url = '/dashboard/superadmin/stats';
      if (selectedBranch !== 'all') {
        url += `?branchId=${selectedBranch}`;
      }
      const response = await api.get(url);
      console.log('Dashboard API response:', JSON.stringify(response, null, 2));
      setRawResponse(response);
      if (response.success && response.data) {
        console.log('Setting stats:', response.data);
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async () => {
    try {
      const response = await api.get('/dashboard/superadmin/branches');
      if (response.success) {
        setBranches(response.data || []);
      }
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    await loadBranches();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchDashboardData();
    loadBranches();
  }, [selectedBranch]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.orange} />
        <Text style={styles.loadingText}>Loading dashboard data...</Text>
      </SafeAreaView>
    );
  }

  const getSelectedBranchName = () => {
    if (selectedBranch === 'all') return 'All Branches';
    const branch = branches.find(b => b._id === selectedBranch);
    return branch?.name || 'Select Branch';
  };

  const quickStats = [
    { label: 'Orders Today', value: stats.ordersToday.toString(), icon: 'receipt', color: COLORS.orange, bgColor: '#FFF8F0' },
    { label: 'Items Sold', value: stats.totalItemsSold.toString(), icon: 'cube', color: COLORS.info, bgColor: '#F0F7FF' },
    { label: 'Revenue', value: `$${(stats.todayRevenue || 0).toLocaleString()}`, icon: 'cash', color: COLORS.success, bgColor: '#F0FFF4' },
    { label: 'Branches', value: stats.totalBranches.toString(), icon: 'business', color: COLORS.purple, bgColor: '#F5F0FF' },
  ];

  const summaryCards = [
    { label: 'Orders', value: stats.ordersToday.toString(), icon: 'receipt', color: COLORS.orange },
    { label: 'Items', value: stats.totalItemsSold.toString(), icon: 'cube', color: COLORS.info },
    { label: 'Revenue', value: `$${(stats.todayRevenue || 0).toLocaleString()}`, icon: 'cash', color: COLORS.success },
    { label: 'Branches', value: stats.totalBranches.toString(), icon: 'business', color: COLORS.purple },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.orange]} />
        }
      >
        {/* Branch Filter */}
        <View style={styles.branchFilterContainer}>
          <TouchableOpacity 
            style={styles.branchSelector}
            onPress={() => setShowBranchDropdown(!showBranchDropdown)}
          >
            <Ionicons name="business-outline" size={18} color="#666" />
            <Text style={styles.branchText}>{getSelectedBranchName()}</Text>
            <Ionicons name={showBranchDropdown ? "chevron-up" : "chevron-down"} size={16} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Branch Dropdown */}
        {showBranchDropdown && (
          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={[styles.dropdownItem, selectedBranch === 'all' && styles.dropdownItemActive]}
              onPress={() => {
                setSelectedBranch('all');
                setShowBranchDropdown(false);
              }}
            >
              <Text style={[styles.dropdownText, selectedBranch === 'all' && styles.dropdownTextActive]}>
                All Branches
              </Text>
            </TouchableOpacity>
            {branches.map((branch) => (
              <TouchableOpacity
                key={branch._id || branch.id}
                style={[styles.dropdownItem, selectedBranch === (branch._id || branch.id) && styles.dropdownItemActive]}
                onPress={() => {
                  setSelectedBranch(branch._id || branch.id || '');
                  setShowBranchDropdown(false);
                }}
              >
                <Text style={[styles.dropdownText, selectedBranch === (branch._id || branch.id) && styles.dropdownTextActive]}>
                  {branch.name || branch.branchName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Debug Section - Shows raw API response */}
        {rawResponse && (
          <View style={[styles.section, { backgroundColor: '#FFE4E1' }]}>
            <Text style={styles.sectionTitle}>DEBUG - Raw API Data:</Text>
            <Text style={{ fontSize: 10, color: COLORS.darkText }}>
              totalBranches: {JSON.stringify(rawResponse.data?.totalBranches)}
            </Text>
            <Text style={{ fontSize: 10, color: COLORS.darkText }}>
              Response: {JSON.stringify(rawResponse.data, null, 2).substring(0, 500)}
            </Text>
          </View>
        )}

        {/* Section 1: Quick Stats */}
        <View style={styles.quickStatsSection}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickStatsContainer}
          >
            {quickStats.map((stat, index) => (
              <View key={index} style={[styles.quickStatCard, { backgroundColor: stat.bgColor, borderLeftColor: stat.color }]}>
                <Ionicons name={stat.icon as any} size={24} color={stat.color} />
                <Text style={[styles.quickStatValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.quickStatLabel}>{stat.label}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Section 2: Branch Performance Chart */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Branch Performance</Text>
            <TouchableOpacity>
              <Text style={styles.viewLink}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.chartContainer}>
            {stats.topPerformingBranches?.length > 0 ? (
              stats.topPerformingBranches.map((branch: any, index: number) => (
                <View key={index} style={styles.chartRow}>
                  <Text style={styles.branchName}>{branch.name}</Text>
                  <View style={styles.barContainer}>
                    <View 
                      style={[
                        styles.bar, 
                        { 
                          width: `${Math.min(branch.performance, 100)}%`, 
                          backgroundColor: branch.performance >= 90 ? COLORS.success : 
                                        branch.performance >= 70 ? COLORS.orange : COLORS.red 
                        }
                      ]}
                    >
                      <Text style={styles.barLabel}>{branch.performance}%</Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noDataText}>No branch performance data available</Text>
            )}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            {stats.topPerformingBranches?.length > 0 ? (
              stats.topPerformingBranches.map((branch: any, index: number) => (
                <View key={index} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: branch.performance >= 90 ? COLORS.success : branch.performance >= 70 ? COLORS.orange : COLORS.red }]} />
                  <Text style={styles.legendText}>{branch.name}</Text>
                </View>
              ))
            ) : null}
          </View>
        </View>

        {/* Section 3: Today's Summary Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Summary</Text>
          <View style={styles.summaryGrid}>
            {summaryCards.map((card, index) => (
              <View key={index} style={[styles.summaryCard, { borderLeftColor: card.color }]}>
                <Ionicons name={card.icon as any} size={24} color={card.color} />
                <Text style={[styles.summaryValue, { color: card.color }]}>{card.value}</Text>
                <Text style={styles.summaryLabel}>{card.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Section 4: Branches Overview Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Branches Overview</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllLink}>View All</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.previewText}>
            See full branch details and management options in the Branches tab
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBackground,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.card,
    fontSize: FONTS.sizes.body,
    color: COLORS.lightText,
  },
  scrollContent: {
    paddingHorizontal: SPACING.horizontal,
    paddingTop: SPACING.card,
    paddingBottom: SPACING.section,
    gap: SPACING.card,
  },
  branchFilterContainer: {
    paddingHorizontal: SPACING.horizontal,
    paddingTop: SPACING.card,
    paddingBottom: 8,
  },
  branchSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  branchText: {
    fontSize: 14,
    color: COLORS.darkText,
    fontWeight: '500',
    flex: 1,
  },
  dropdownContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    marginHorizontal: SPACING.horizontal,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 100,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemActive: {
    backgroundColor: '#FFF3E0',
  },
  dropdownText: {
    fontSize: 14,
    color: COLORS.darkText,
  },
  dropdownTextActive: {
    color: COLORS.orange,
    fontWeight: '600',
  },
  quickStatsSection: {
    marginBottom: SPACING.card,
  },
  quickStatsContainer: {
    gap: 8,
    paddingRight: SPACING.horizontal,
  },
  quickStatCard: {
    width: 95,
    height: 85,
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: FONTS.weights.bold,
    marginTop: 4,
  },
  quickStatLabel: {
    fontSize: 10,
    color: COLORS.lightText,
    marginTop: 2,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: SPACING.borderRadius.card,
    padding: SPACING.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.card,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.subheading,
    fontWeight: FONTS.weights.bold,
    color: COLORS.darkText,
  },
  viewLink: {
    fontSize: 12,
    color: COLORS.orange,
  },
  viewAllLink: {
    fontSize: 12,
    color: COLORS.info,
  },
  chartContainer: {
    gap: SPACING.card,
  },
  chartRow: {
    gap: 8,
  },
  branchName: {
    fontSize: 13,
    color: COLORS.darkText,
    marginBottom: 4,
  },
  barContainer: {
    height: 32,
    backgroundColor: COLORS.lightBackground,
    borderRadius: 8,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: FONTS.weights.bold,
    color: COLORS.white,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.card,
    marginTop: SPACING.card,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.darkText,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    width: '47%',
    backgroundColor: COLORS.white,
    borderRadius: SPACING.borderRadius.card,
    padding: SPACING.card,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
    minHeight: 110,
    justifyContent: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: FONTS.weights.bold,
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.lightText,
    marginTop: 4,
  },
  noDataText: {
    fontSize: 14,
    color: COLORS.lightText,
    textAlign: 'center',
    padding: 20,
  },
  previewText: {
    fontSize: 14,
    color: COLORS.lightText,
    textAlign: 'center',
  },
});
