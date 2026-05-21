import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';

// Map colors to semantic names for this component
const theme = {
  primary: COLORS.orange,
  text: COLORS.darkText,
  textSecondary: COLORS.lightText,
  background: COLORS.lightGray,
  white: COLORS.white,
  border: COLORS.border,
};
import { getSpacing } from '../../utils/responsive';
import { isAdminRole, getRoleDisplayName } from '../../utils/permissionHelpers';

// Components
import AdminBottomNavigation from '../../components/navigation/AdminBottomNavigation';

interface Branch {
  _id: string;
  branchName: string;
  branchCode?: string;
  address: string;
  city: string;
  phoneNumber: string;
  email?: string;
  managerName?: string;
  managerId?: string;
  isActive: boolean;
  createdAt: string;
  todayIncome?: number;
  todayOrders?: number;
  monthlyIncome?: number;
  totalOrders?: number;
}

interface Manager {
  _id: string;
  displayName: string;
  email: string;
  assignedBranchId?: string;
}

export default function BranchManagementScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [availableManagers, setAvailableManagers] = useState<Manager[]>([]);
  const [userRole, setUserRole] = useState<string>('');

  const menuItems = [
    { name: 'Notifications', icon: 'notifications-outline', screen: 'AdminNotifications' },
    { name: 'Table Assignment', icon: 'grid-outline', screen: 'TableAssignment' },
    // Only show Branches for SUPER_ADMIN
    ...(isAdminRole(userRole) ? [{ name: 'Branches', icon: 'business-outline', screen: 'AdminBranches' }] : []),
    { name: 'Deals', icon: 'pricetag-outline', screen: 'AdminDeals' },
    { name: 'Coupons', icon: 'ticket-outline', screen: 'AdminCoupons' },
    { name: 'Product Size', icon: 'resize-outline', screen: 'AdminProductSizes' },
    { name: 'Categories', icon: 'grid-outline', screen: 'AdminCategories' },
    { name: 'Reports', icon: 'bar-chart-outline', screen: 'AdminReports' },
    { name: 'Settings', icon: 'settings-outline', screen: 'AdminSettings' },
  ];

  useEffect(() => {
    loadUserRole();
    loadBranches();
    loadAvailableManagers();
  }, []);

  useEffect(() => {
    filterBranches();
  }, [branches, searchQuery, activeFilter]);

  const loadUserRole = async () => {
    try {
      const storedRole = await AsyncStorage.getItem('userRole');
      if (storedRole) {
        setUserRole(storedRole);
        if (!isAdminRole(storedRole)) {
          Alert.alert('Access Denied', 'Only administrators can manage branches.');
          navigation.goBack();
        }
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    }
  };

  const loadBranches = async () => {
    try {
      setLoading(true);
      const response = await api.get('/branches');
      if (response.success && response.data) {
        setBranches(response.data);
      } else {
        setBranches([]);
      }
    } catch (error) {
      console.error('Error loading branches:', error);
      Alert.alert('Error', 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableManagers = async () => {
    try {
      const response = await api.get('/users?role=BRANCH_MANAGER&unassigned=true');
      if (response.success && response.data) {
        setAvailableManagers(response.data);
      }
    } catch (error) {
      console.error('Error loading managers:', error);
    }
  };

  const filterBranches = () => {
    let filtered = [...branches];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (branch) =>
          branch.branchName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          branch.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          branch.managerName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (activeFilter === 'active') {
      filtered = filtered.filter((branch) => branch.isActive);
    } else if (activeFilter === 'inactive') {
      filtered = filtered.filter((branch) => !branch.isActive);
    }

    setFilteredBranches(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBranches();
    setRefreshing(false);
  };

  const handleCreateBranch = () => {
    // @ts-ignore
    navigation.navigate('AddBranch');
  };

  const handleEditBranch = (branch: Branch) => {
    // @ts-ignore
    navigation.navigate('AddBranch', { branchId: branch._id });
  };

  const handleAuditBranch = (branch: Branch) => {
    // @ts-ignore
    navigation.navigate('BranchAudit', { branchId: branch._id });
  };

  const handleAssignManager = (branch: Branch) => {
    setSelectedBranch(branch);
    loadAvailableManagers();
    setShowAssignModal(true);
  };

  const assignManagerToBranch = async (managerId: string) => {
    if (!selectedBranch) return;

    try {
      const response = await api.post(`/branches/${selectedBranch._id}/assign-manager`, {
        managerId,
      });

      if (response.success) {
        Alert.alert('Success', 'Manager assigned successfully');
        setShowAssignModal(false);
        loadBranches();
      } else {
        Alert.alert('Error', response.message || 'Failed to assign manager');
      }
    } catch (error) {
      console.error('Error assigning manager:', error);
      Alert.alert('Error', 'Failed to assign manager');
    }
  };

  const handleDeactivateBranch = (branch: Branch) => {
    Alert.alert(
      'Deactivate Branch',
      `Are you sure you want to deactivate ${branch.branchName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.patch(`/branches/${branch._id}/deactivate`);
              if (response.success) {
                Alert.alert('Success', 'Branch deactivated');
                loadBranches();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to deactivate branch');
            }
          },
        },
      ]
    );
  };

  const renderBranchCard = ({ item }: { item: Branch }) => (
    <View style={styles.branchCard}>
      <View style={styles.branchHeader}>
        <View>
          <Text style={styles.branchName}>{item.branchName}</Text>
          <Text style={styles.branchCode}>{item.branchCode || item._id.slice(-6)}</Text>
        </View>
        <View style={[styles.statusBadge, item.isActive ? styles.activeBadge : styles.inactiveBadge]}>
          <Text style={[styles.statusText, item.isActive ? styles.activeStatusText : styles.inactiveStatusText]}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.branchInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color={theme.textSecondary} />
          <Text style={styles.infoText}>{item.address}, {item.city}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={16} color={theme.textSecondary} />
          <Text style={styles.infoText}>{item.phoneNumber}</Text>
        </View>
        {item.managerName && (
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color={theme.textSecondary} />
            <Text style={styles.infoText}>Manager: {item.managerName}</Text>
          </View>
        )}
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>${item.todayIncome || 0}</Text>
          <Text style={styles.metricLabel}>Today</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{item.todayOrders || 0}</Text>
          <Text style={styles.metricLabel}>Orders</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>${item.monthlyIncome || 0}</Text>
          <Text style={styles.metricLabel}>Monthly</Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={() => handleEditBranch(item)}>
          <Ionicons name="create-outline" size={18} color={COLORS.white} />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, styles.auditButton]} onPress={() => handleAuditBranch(item)}>
          <Ionicons name="clipboard-outline" size={18} color={COLORS.white} />
          <Text style={styles.actionButtonText}>Audit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, styles.assignButton]} onPress={() => handleAssignManager(item)}>
          <Ionicons name="person-add-outline" size={18} color={COLORS.white} />
          <Text style={styles.actionButtonText}>Assign</Text>
        </TouchableOpacity>
      </View>

      {!item.isActive && (
        <TouchableOpacity style={styles.reactivateButton} onPress={() => handleDeactivateBranch(item)}>
          <Text style={styles.reactivateText}>Reactivate Branch</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.white} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading branches...</Text>
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
          <View>
            <Text style={styles.headerTitle}>Manage Branches</Text>
            <Text style={styles.headerSubtitle}>
              {branches.length} {branches.length === 1 ? 'branch' : 'branches'}
            </Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={handleCreateBranch}>
            <Ionicons name="add" size={28} color={theme.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search and Filter */}
      <View style={styles.filterSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={theme.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search branches by name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={theme.textSecondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterTabs}>
          {(['all', 'active', 'inactive'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterTab, activeFilter === filter && styles.activeFilterTab]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[styles.filterTabText, activeFilter === filter && styles.activeFilterTabText]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Branches List */}
      <FlatList
        data={filteredBranches}
        renderItem={renderBranchCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={64} color={theme.textSecondary} />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No branches found' : 'No branches created'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Try a different search term'
                : 'Create your first branch to get started'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={styles.createBranchButton} onPress={handleCreateBranch}>
                <Text style={styles.createBranchButtonText}>Create Branch</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Assign Manager Modal */}
      <Modal visible={showAssignModal} transparent animationType="slide" onRequestClose={() => setShowAssignModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Manager</Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Assign a manager to {selectedBranch?.branchName}
            </Text>

            {availableManagers.length === 0 ? (
              <View style={styles.noManagersState}>
                <Text style={styles.noManagersText}>No available managers</Text>
                <Text style={styles.noManagersSubtext}>
                  All managers are currently assigned to branches
                </Text>
              </View>
            ) : (
              <FlatList
                data={availableManagers}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.managerItem} onPress={() => assignManagerToBranch(item._id)}>
                    <View style={styles.managerAvatar}>
                      <Ionicons name="person" size={24} color={theme.primary} />
                    </View>
                    <View style={styles.managerInfo}>
                      <Text style={styles.managerName}>{item.displayName}</Text>
                      <Text style={styles.managerEmail}>{item.email}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation */}
      <AdminBottomNavigation onMorePress={() => setShowMoreMenu(true)} />

      {/* More Menu Modal */}
      <Modal visible={showMoreMenu} transparent animationType="slide" onRequestClose={() => setShowMoreMenu(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>More Options</Text>
              <TouchableOpacity onPress={() => setShowMoreMenu(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
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
                <Ionicons name={item.icon as any} size={24} color={theme.primary} />
                <Text style={styles.menuItemText}>{item.name}</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.border} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterSection: {
    backgroundColor: theme.white,
    padding: getSpacing(2),
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.background,
    borderRadius: 12,
    paddingHorizontal: getSpacing(2),
    paddingVertical: getSpacing(1),
  },
  searchInput: {
    flex: 1,
    marginLeft: getSpacing(1),
    fontSize: 14,
    color: theme.text,
  },
  filterTabs: {
    flexDirection: 'row',
    marginTop: getSpacing(2),
    gap: getSpacing(1),
  },
  filterTab: {
    paddingHorizontal: getSpacing(2),
    paddingVertical: getSpacing(1),
    borderRadius: 20,
    backgroundColor: theme.background,
  },
  activeFilterTab: {
    backgroundColor: theme.primary,
  },
  filterTabText: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: '600',
  },
  activeFilterTabText: {
    color: theme.white,
  },
  listContainer: {
    padding: getSpacing(2),
  },
  branchCard: {
    backgroundColor: theme.white,
    borderRadius: 12,
    padding: getSpacing(2),
    marginBottom: getSpacing(2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  branchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: getSpacing(1.5),
  },
  branchName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.text,
  },
  branchCode: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
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
  branchInfo: {
    marginBottom: getSpacing(1.5),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: theme.textSecondary,
    marginLeft: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: getSpacing(1.5),
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.border,
    marginBottom: getSpacing(1.5),
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.primary,
  },
  metricLabel: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: getSpacing(1),
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
  editButton: {
    backgroundColor: '#3498DB',
  },
  auditButton: {
    backgroundColor: '#6C63FF',
  },
  assignButton: {
    backgroundColor: theme.primary,
  },
  actionButtonText: {
    color: theme.white,
    fontSize: 12,
    fontWeight: '600',
  },
  reactivateButton: {
    marginTop: getSpacing(1.5),
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
  },
  reactivateText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: getSpacing(8),
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginTop: getSpacing(2),
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: getSpacing(1),
    textAlign: 'center',
  },
  createBranchButton: {
    marginTop: getSpacing(3),
    backgroundColor: theme.primary,
    paddingHorizontal: getSpacing(4),
    paddingVertical: getSpacing(1.5),
    borderRadius: 8,
  },
  createBranchButtonText: {
    color: theme.white,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: getSpacing(2),
    paddingBottom: getSpacing(4),
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getSpacing(2),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: getSpacing(2),
  },
  managerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: getSpacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  managerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  managerInfo: {
    flex: 1,
    marginLeft: getSpacing(1.5),
  },
  managerName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
  },
  managerEmail: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },
  noManagersState: {
    alignItems: 'center',
    paddingVertical: getSpacing(4),
  },
  noManagersText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
  noManagersSubtext: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: getSpacing(1),
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: theme.text,
    marginLeft: 16,
  },
});
