import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SPACING } from '../../constants/spacing';
import { api } from '../../components/api/client';

const filters = ['All', 'Active', 'Inactive', 'High Performance', 'Needs Attention'];

export default function BranchesTab() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>('');

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const response = await api.get('/dashboard/superadmin/branches');
      console.log('Branches API response:', JSON.stringify(response, null, 2));
      setDebugInfo(JSON.stringify(response, null, 2).substring(0, 800));
      if (response.success) {
        setBranches(response.data);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      setDebugInfo('Error: ' + String(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const filteredBranches = branches.filter((branch) => {
    if (searchQuery && !branch.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    switch (activeFilter) {
      case 'Active':
        return branch.status === 'active';
      case 'Inactive':
        return branch.status === 'inactive';
      case 'High Performance':
        return branch.performance >= 90;
      case 'Needs Attention':
        return branch.performance < 80;
      default:
        return true;
    }
  });

  const getPerformanceColor = (performance: number) => {
    if (performance >= 90) return COLORS.success;
    if (performance >= 80) return COLORS.orange;
    return COLORS.red;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}

        {/* Debug Info */}
        {debugInfo && (
          <View style={[styles.section, { backgroundColor: '#FFE4E1', marginBottom: SPACING.card }]}>
            <Text style={styles.sectionTitle}>DEBUG:</Text>
            <Text style={{ fontSize: 10, color: COLORS.darkText }}>{debugInfo}</Text>
          </View>
        )}

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.lightText} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search branches..."
            placeholderTextColor={COLORS.lightText}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === filter && styles.filterChipTextActive,
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Summary Stats */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{branches.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {branches.filter((b) => b.status === 'active').length}
            </Text>
            <Text style={styles.summaryLabel}>Active</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {Math.round(branches.reduce((acc, b) => acc + b.performance, 0) / branches.length)}%
            </Text>
            <Text style={styles.summaryLabel}>Avg Perf.</Text>
          </View>
        </View>

        {/* Branch List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Branch Progress</Text>
            <Text style={styles.sectionSubtitle}>{filteredBranches.length} branches</Text>
          </View>

          {filteredBranches.map((branch) => (
            <TouchableOpacity key={branch.id} style={styles.branchCard} activeOpacity={0.7}>
              <View style={styles.branchHeader}>
                <View style={styles.branchInfo}>
                  <Text style={styles.branchName}>{branch.name}</Text>
                  <Text style={styles.branchLocation}>{branch.location}</Text>
                  <Text style={styles.branchManager}>Manager: {branch.manager}</Text>
                </View>
                <View
                  style={[
                    styles.performanceBadge,
                    { backgroundColor: getPerformanceColor(branch.performance) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.performanceText,
                      { color: getPerformanceColor(branch.performance) },
                    ]}
                  >
                    {branch.performance}%
                  </Text>
                </View>
              </View>

              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${branch.performance}%`,
                      backgroundColor: getPerformanceColor(branch.performance),
                    },
                  ]}
                />
              </View>

              <View style={styles.branchStats}>
                <View style={styles.statItem}>
                  <Ionicons name="receipt-outline" size={16} color={COLORS.lightText} />
                  <Text style={styles.statValue}>{branch.orders} orders</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="cash-outline" size={16} color={COLORS.lightText} />
                  <Text style={styles.statValue}>${branch.revenue.toLocaleString()}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Create Branch Button */}
        <TouchableOpacity style={styles.createButton} activeOpacity={0.8}>
          <Ionicons name="add-circle" size={24} color={COLORS.white} />
          <Text style={styles.createButtonText}>CREATE BRANCH</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBackground,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SPACING.horizontal,
    paddingTop: 0,
    paddingBottom: SPACING.section,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SPACING.borderRadius.button,
    paddingHorizontal: SPACING.card,
    paddingVertical: 12,
    marginBottom: SPACING.card,
    borderWidth: 1,
    borderColor: '#ECEFF1',
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.tiny,
    fontSize: FONTS.sizes.body,
    color: COLORS.darkText,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING.card,
    paddingRight: SPACING.horizontal,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ECEFF1',
  },
  filterChipActive: {
    backgroundColor: COLORS.orange,
    borderColor: COLORS.orange,
  },
  filterChipText: {
    fontSize: 12,
    color: COLORS.darkText,
    fontWeight: FONTS.weights.medium,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: SPACING.card,
    marginBottom: SPACING.card,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: SPACING.borderRadius.card,
    padding: SPACING.card,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: FONTS.weights.bold,
    color: COLORS.darkText,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.lightText,
    marginTop: 4,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: SPACING.borderRadius.card,
    padding: SPACING.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: SPACING.card,
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
  sectionSubtitle: {
    fontSize: FONTS.sizes.small,
    color: COLORS.lightText,
  },
  branchCard: {
    backgroundColor: COLORS.lightBackground,
    borderRadius: SPACING.borderRadius.card,
    padding: SPACING.card,
    marginBottom: SPACING.card,
  },
  branchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.card,
  },
  branchInfo: {
    flex: 1,
  },
  branchName: {
    fontSize: 15,
    fontWeight: FONTS.weights.bold,
    color: COLORS.darkText,
    marginBottom: 2,
  },
  branchLocation: {
    fontSize: 12,
    color: COLORS.lightText,
    marginBottom: 2,
  },
  branchManager: {
    fontSize: 12,
    color: COLORS.info,
  },
  performanceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  performanceText: {
    fontSize: 12,
    fontWeight: FONTS.weights.bold,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#ECEFF1',
    borderRadius: 4,
    marginBottom: SPACING.card,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  branchStats: {
    flexDirection: 'row',
    gap: SPACING.section,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 12,
    color: COLORS.lightText,
  },
  createButton: {
    backgroundColor: COLORS.orange,
    height: 48,
    borderRadius: SPACING.borderRadius.button,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: SPACING.card,
    marginBottom: SPACING.section,
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: FONTS.weights.bold,
  },
});
