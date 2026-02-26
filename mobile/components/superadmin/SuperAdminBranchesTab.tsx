import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SPACING } from '../../constants/spacing';
import { getSpacing } from '../../utils/responsive';

interface Branch {
  _id: string;
  name: string;
  location: string;
  manager?: {
    _id: string;
    displayName: string;
    rating: number;
  };
  isActive: boolean;
  revenue: number;
  orders: number;
  performance: number;
}

interface SuperAdminBranchesTabProps {
  branches: Branch[];
  loading: boolean;
  onRefresh: () => void;
  refreshing: boolean;
}

export default function SuperAdminBranchesTab({
  branches,
  loading,
}: SuperAdminBranchesTabProps) {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'revenue' | 'performance' | 'orders' | 'name'>('revenue');

  const filteredBranches = branches
    .filter((branch) => {
      if (filterStatus === 'active') return branch.isActive;
      if (filterStatus === 'inactive') return !branch.isActive;
      return true;
    })
    .filter((branch) =>
      branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      branch.location.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'revenue':
          return (b.revenue || 0) - (a.revenue || 0);
        case 'performance':
          return (b.performance || 0) - (a.performance || 0);
        case 'orders':
          return (b.orders || 0) - (a.orders || 0);
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  const formatCurrency = (value: number) => {
    return '$' + value.toLocaleString();
  };

  const handleAssignManager = (branchId: string) => {
    // @ts-ignore
    navigation.navigate('AssignBranchManager', { branchId });
  };

  const handleAudit = (branchId: string) => {
    // @ts-ignore
    navigation.navigate('BranchAudit', { branchId });
  };

  const handleEdit = (branchId: string) => {
    // @ts-ignore
    navigation.navigate('EditBranch', { branchId });
  };

  const handleDeactivate = (branchId: string) => {
    // TODO: Implement deactivation
    console.log('Deactivate branch:', branchId);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.orange} />
        <Text style={styles.loadingText}>Loading branches...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search and Filter Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#95A5A6" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search branches..."
          placeholderTextColor="#95A5A6"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter and Sort Options */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active' },
            { id: 'inactive', label: 'Inactive' },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterButton,
                filterStatus === filter.id && styles.filterButtonActive,
              ]}
              onPress={() => setFilterStatus(filter.id as any)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filterStatus === filter.id && styles.filterButtonTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { id: 'revenue', label: 'Revenue' },
            { id: 'performance', label: 'Performance' },
            { id: 'orders', label: 'Orders' },
            { id: 'name', label: 'Name' },
          ].map((sort) => (
            <TouchableOpacity
              key={sort.id}
              style={[
                styles.sortButton,
                sortBy === sort.id && styles.sortButtonActive,
              ]}
              onPress={() => setSortBy(sort.id as any)}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  sortBy === sort.id && styles.sortButtonTextActive,
                ]}
              >
                {sort.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Branches Count */}
      <Text style={styles.countText}>
        Showing {filteredBranches.length} of {branches.length} branches
      </Text>

      {/* Branch Cards */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {filteredBranches.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={60} color="#95A5A6" />
            <Text style={styles.emptyText}>No branches found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search' : 'Create a new branch to get started'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => {
                  // @ts-ignore
                  navigation.navigate('CreateBranch');
                }}
              >
                <Text style={styles.createButtonText}>Create Branch</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredBranches.map((branch) => (
            <View key={branch._id} style={styles.branchCard}>
              {/* Branch Header */}
              <View style={styles.branchHeader}>
                <View style={styles.branchTitleRow}>
                  <Text style={styles.branchName}>{branch.name}</Text>
                  <View
                    style={[
                      styles.statusIndicator,
                      { backgroundColor: branch.isActive ? COLORS.green : COLORS.error },
                    ]}
                  />
                </View>
                <View style={styles.managerRow}>
                  <Ionicons name="person" size={14} color="#95A5A6" />
                  <Text style={styles.managerText}>
                    {branch.manager?.displayName || 'No manager assigned'}
                  </Text>
                  {branch.manager?.rating && (
                    <View style={styles.ratingContainer}>
                      <Ionicons name="star" size={12} color="#FFD700" />
                      <Text style={styles.ratingText}>{branch.manager.rating.toFixed(1)}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.locationRow}>
                  <Ionicons name="location" size={14} color="#95A5A6" />
                  <Text style={styles.locationText}>{branch.location || 'No location'}</Text>
                </View>
              </View>

              {/* Status Badge */}
              <View
                style={[
                  styles.statusBadge,
                  branch.isActive ? styles.activeBadge : styles.inactiveBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    branch.isActive ? styles.activeBadgeText : styles.inactiveBadgeText,
                  ]}
                >
                  {branch.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatCurrency(branch.revenue || 0)}</Text>
                  <Text style={styles.statLabel}>Today</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{branch.orders || 0}</Text>
                  <Text style={styles.statLabel}>Orders</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    ${((branch.revenue || 0) / Math.max(branch.orders || 1, 1)).toFixed(2)}
                  </Text>
                  <Text style={styles.statLabel}>Avg Order</Text>
                </View>
              </View>

              {/* Performance */}
              <View style={styles.performanceContainer}>
                <View style={styles.performanceHeader}>
                  <Text style={styles.performanceLabel}>Performance</Text>
                  <Text
                    style={[
                      styles.performanceValue,
                      {
                        color:
                          (branch.performance || 0) >= 90
                            ? COLORS.green
                            : (branch.performance || 0) >= 70
                            ? '#F39C12'
                            : COLORS.error,
                      },
                    ]}
                  >
                    {branch.performance || 0}%
                  </Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${Math.min(branch.performance || 0, 100)}%`,
                        backgroundColor:
                          (branch.performance || 0) >= 90
                            ? COLORS.green
                            : (branch.performance || 0) >= 70
                            ? '#F39C12'
                            : COLORS.error,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsContainer}>
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => handleEdit(branch._id)}
                  >
                    <Ionicons name="create" size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.auditButton]}
                    onPress={() => handleAudit(branch._id)}
                  >
                    <Ionicons name="clipboard" size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>Audit</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.assignButton]}
                    onPress={() => handleAssignManager(branch._id)}
                  >
                    <Ionicons name="person-add" size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>Assign Mgr</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, branch.isActive ? styles.deactivateButton : styles.activateButton]}
                    onPress={() => handleDeactivate(branch._id)}
                  >
                    <Ionicons
                      name={branch.isActive ? 'close-circle' : 'checkmark-circle'}
                      size={16}
                      color="#fff"
                    />
                    <Text style={styles.actionButtonText}>
                      {branch.isActive ? 'Deactivate' : 'Activate'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.card,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: getSpacing(40),
  },
  loadingText: {
    marginTop: SPACING.itemGap,
    fontSize: FONTS.sizes.body,
    color: COLORS.lightText,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SPACING.borderRadius.button,
    paddingHorizontal: SPACING.itemGap,
    marginBottom: SPACING.itemGap,
    height: SPACING.inputHeight,
  },
  searchIcon: {
    marginRight: SPACING.small,
  },
  searchInput: {
    flex: 1,
    height: SPACING.inputHeight,
    fontSize: FONTS.sizes.body,
    color: COLORS.darkText,
  },
  filterContainer: {
    marginBottom: SPACING.itemGap,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    marginRight: SPACING.small,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterButtonActive: {
    backgroundColor: COLORS.orange,
    borderColor: COLORS.orange,
  },
  filterButtonText: {
    fontSize: FONTS.sizes.small,
    color: '#666',
  },
  filterButtonTextActive: {
    color: COLORS.white,
    fontWeight: FONTS.weights.semibold,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.itemGap,
  },
  sortLabel: {
    fontSize: FONTS.sizes.small,
    color: COLORS.lightText,
    marginRight: SPACING.small,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 6,
  },
  sortButtonActive: {
    backgroundColor: '#2C3E50',
  },
  sortButtonText: {
    fontSize: FONTS.sizes.small,
    color: '#666',
  },
  sortButtonTextActive: {
    color: COLORS.white,
    fontWeight: FONTS.weights.semibold,
  },
  countText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.lightText,
    marginBottom: SPACING.itemGap,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: getSpacing(40),
  },
  emptyText: {
    fontSize: FONTS.sizes.subheading,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.darkText,
    marginTop: SPACING.card,
  },
  emptySubtext: {
    fontSize: FONTS.sizes.body,
    color: COLORS.lightText,
    marginTop: SPACING.small,
    textAlign: 'center',
  },
  createButton: {
    marginTop: SPACING.card,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.orange,
    borderRadius: SPACING.borderRadius.button,
  },
  createButtonText: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.white,
  },
  branchCard: {
    backgroundColor: COLORS.white,
    borderRadius: SPACING.borderRadius.card,
    padding: SPACING.card,
    marginBottom: SPACING.itemGap,
    borderTopWidth: 3,
    borderTopColor: COLORS.orange,
    ...SPACING.shadow.medium,
  },
  branchHeader: {
    marginBottom: SPACING.itemGap,
  },
  branchTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.tiny,
  },
  branchName: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.bold,
    color: COLORS.darkText,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  managerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.tiny,
  },
  managerText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.lightText,
    marginLeft: SPACING.small,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: SPACING.small,
  },
  ratingText: {
    fontSize: FONTS.sizes.small,
    color: '#FFD700',
    marginLeft: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.lightText,
    marginLeft: SPACING.small,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SPACING.borderRadius.card,
    marginBottom: SPACING.itemGap,
  },
  activeBadge: {
    backgroundColor: '#D4EDDA',
  },
  inactiveBadge: {
    backgroundColor: '#F8D7DA',
  },
  statusBadgeText: {
    fontSize: FONTS.sizes.tiny,
    fontWeight: FONTS.weights.semibold,
  },
  activeBadgeText: {
    color: '#155724',
  },
  inactiveBadgeText: {
    color: '#721C24',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.itemGap,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: SPACING.itemGap,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#f0f0f0',
  },
  statValue: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.bold,
    color: COLORS.orange,
  },
  statLabel: {
    fontSize: FONTS.sizes.tiny,
    color: COLORS.lightText,
    marginTop: 2,
  },
  performanceContainer: {
    marginBottom: SPACING.itemGap,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  performanceLabel: {
    fontSize: FONTS.sizes.small,
    color: COLORS.lightText,
  },
  performanceValue: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.semibold,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  /* ... */
  actionsContainer: {
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  editButton: {
    backgroundColor: '#3498DB',
  },
  auditButton: {
    backgroundColor: '#9B59B6',
  },
  assignButton: {
    backgroundColor: COLORS.orange,
  },
  deactivateButton: {
    backgroundColor: '#E74C3C',
  },
  activateButton: {
    backgroundColor: COLORS.green,
  },
});
