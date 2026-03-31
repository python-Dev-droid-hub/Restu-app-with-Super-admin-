import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  TextInput,
  RefreshControl,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';
import ResponsiveHeader from '../../components/layout/ResponsiveHeader';
import ProfileMenu from '../../components/common/ProfileMenu';
import AdminBottomNavigation from '../../components/navigation/AdminBottomNavigation';
import { useUserData } from '../../hooks/useUserData';

interface Table {
  _id: string;
  number: number;
  capacity: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
  branchId: string;
  assignedWaiterId?: string;
  assignedWaiterName?: string;
}

interface Waiter {
  _id: string;
  display_name: string;
  displayName?: string;
  email: string;
  phone_number?: string;
  assignedTablesCount?: number;
}

interface Branch {
  _id: string;
  branchName: string;
  branchCode: string;
}

const COLORS = {
  primary: '#E87E35',
  success: '#2BC48A',
  warning: '#FF9F43',
  danger: '#FF4D4D',
  dark: '#1A1A2E',
  muted: '#8E8E93',
  border: '#E5E5EA',
  background: '#F8F9FA',
  white: '#FFFFFF',
};

export default function TableAssignmentScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tables, setTables] = useState<Table[]>([]);
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [searchWaiterQuery, setSearchWaiterQuery] = useState('');
  const [userData, setUserData] = useState<{branchId?: string}>({});
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const canManageWaiterAssignment = userRole !== 'BRANCH_MANAGER';
  const { profileImage } = useUserData();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [assignByEmail, setAssignByEmail] = useState(false);
  
  // Add Table modal state
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState('4');
  const [selectedWaiterForNewTable, setSelectedWaiterForNewTable] = useState<string>('');
  const [addingTable, setAddingTable] = useState(false);

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
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    }
  };

  // Filter menu items based on role
  const menuItems = [
    { name: 'Notifications', icon: 'notifications-outline', screen: 'AdminNotifications' },
    { name: 'Table Assignment', icon: 'grid-outline', screen: 'TableAssignment' },
    // Only show Branches for SUPER_ADMIN
    ...(userRole === 'SUPER_ADMIN' ? [{ name: 'Branches', icon: 'business-outline', screen: 'AdminBranches' }] : []),
    { name: 'Deals', icon: 'pricetag-outline', screen: 'AdminDeals' },
    { name: 'Coupons', icon: 'ticket-outline', screen: 'AdminCoupons' },
    { name: 'Product Size', icon: 'resize-outline', screen: 'AdminProductSizes' },
    { name: 'Categories', icon: 'grid-outline', screen: 'AdminCategories' },
    { name: 'Reports', icon: 'bar-chart-outline', screen: 'AdminReports' },
    { name: 'Settings', icon: 'settings-outline', screen: 'AdminSettings' },
  ];

  // Load user data and initial data
  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedBranch, userData]);

  const loadUserData = async () => {
    try {
      const stored = await AsyncStorage.getItem('userData');
      if (stored) {
        const parsed = JSON.parse(stored);
        const branchId =
          parsed.assignedBranch?._id ||
          parsed.branch?._id ||
          parsed.assigned_branch_id ||
          parsed.branchId;
        setUserData({ branchId });
      } else {
        // No user data found, still need to load data
        setUserData({});
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setUserData({});
    }
  };

  // For managers, force selected branch to their assigned branch and hide branch filter
  useEffect(() => {
    if (userRole === 'BRANCH_MANAGER' && userData.branchId) {
      setSelectedBranch(userData.branchId);
      setShowBranchDropdown(false);
    }
  }, [userRole, userData.branchId]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadTables(),
        canManageWaiterAssignment ? loadWaiters() : Promise.resolve(),
        loadBranches(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadTables = async () => {
    try {
      const params = new URLSearchParams();
      const effectiveBranchId = userRole === 'BRANCH_MANAGER' && userData.branchId 
        ? userData.branchId 
        : (selectedBranch !== 'all' ? selectedBranch : userData.branchId);
      
      if (effectiveBranchId) {
        params.append('branchId', effectiveBranchId);
      }

      const response = await api.get(`/tables?${params.toString()}`);
      if (response.success && response.data) {
        const rawTables = response.data.tables || response.data || [];
        const normalizedTables = rawTables.map((t: any) => ({
          _id: String(t._id || t.id).trim(),
          number: t.tableNumber,
          capacity: t.seatingCapacity,
          status: t.status,
          section: t.section,
          floorNumber: t.floorNumber,
          branch: t.branch,
          assignedWaiterId: t.currentWaiter?._id ? String(t.currentWaiter._id).trim() : t.assignedWaiterId,
          assignedWaiterName: t.currentWaiter?.displayName || t.currentWaiter?.name || t.currentWaiter?.email || t.assignedWaiterName,
        }));
        setTables(normalizedTables);
      } else {
        setTables([]);
      }
    } catch (error) {
      console.error('Error loading tables:', error);
      setTables([]);
    }
  };

  const loadWaiters = async () => {
    try {
      const params = new URLSearchParams();
      params.append('role', 'WAITER');
      if (selectedBranch !== 'all') {
        params.append('branchId', selectedBranch);
      } else if (userData.branchId) {
        params.append('branchId', userData.branchId);
      }

      const response = await api.get(`/users?${params.toString()}`);
      if (response.success && response.data) {
        const rawWaiters = response.data.users || response.data || [];
        const normalizedWaiters = rawWaiters.map((w: any) => ({
          _id: w._id,
          display_name: w.display_name || w.displayName || w.name || 'Unknown',
          displayName: w.display_name || w.displayName || w.name,
          email: w.email || '',
          phone_number: w.phone_number,
          assignedTablesCount: w.assignedTablesCount,
        }));
        setWaiters(normalizedWaiters);
      } else {
        setWaiters([]);
      }
    } catch (error) {
      console.error('Error loading waiters:', error);
      setWaiters([]);
    }
  };

  const loadBranches = async () => {
    try {
      const response = await api.get('/branches');
      if (response.success && response.data) {
        setBranches(response.data.branches || []);
      }
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const handleAddTable = async () => {
    // Parse table numbers - support comma-separated or single number
    const tableNumbers = newTableNumber
      .split(/[,\s]+/)
      .map(n => parseInt(n.trim(), 10))
      .filter(n => !isNaN(n) && n > 0);

    if (tableNumbers.length === 0) {
      Alert.alert('Error', 'Please enter valid table number(s). Use commas to separate multiple tables (e.g., 1, 2, 3)');
      return;
    }

    const capacity = parseInt(newTableCapacity, 10);
    if (!capacity || capacity < 1) {
      Alert.alert('Error', 'Please enter a valid capacity');
      return;
    }

    const branchId = userRole === 'BRANCH_MANAGER' ? userData.branchId : (selectedBranch !== 'all' ? selectedBranch : userData.branchId);
    if (!branchId) {
      Alert.alert('Error', 'Please select a branch first');
      return;
    }

    setAddingTable(true);
    const results: string[] = [];
    
    console.log('[TABLE_CREATE] Starting table creation...');
    console.log('[TABLE_CREATE] Table numbers:', tableNumbers);
    console.log('[TABLE_CREATE] Capacity:', capacity);
    console.log('[TABLE_CREATE] BranchId:', branchId);
    console.log('[TABLE_CREATE] Selected waiter:', canManageWaiterAssignment ? selectedWaiterForNewTable : 'disabled');
    
    try {
      for (const tableNum of tableNumbers) {
        try {
          const requestBody = {
            tableNumber: String(tableNum),
            seatingCapacity: capacity,
            branch: branchId,
            status: 'AVAILABLE',
          };
          console.log('[TABLE_CREATE] Request body:', JSON.stringify(requestBody));
          
          const response = await api.post('/tables', requestBody);
          console.log('[TABLE_CREATE] API response:', JSON.stringify(response));

          if (response.success && response.data) {
            const rawNewTable = response.data.table || response.data;
            console.log('[TABLE_CREATE] New table created:', rawNewTable);

            const newTable: Table = {
              _id: String(rawNewTable._id || rawNewTable.id).trim(),
              number: rawNewTable.tableNumber ?? rawNewTable.number ?? tableNum,
              capacity: rawNewTable.seatingCapacity ?? rawNewTable.capacity ?? capacity,
              status: rawNewTable.status || 'AVAILABLE',
              branchId: rawNewTable.branch?._id || rawNewTable.branch || branchId,
              assignedWaiterId: rawNewTable.currentWaiter?._id
                ? String(rawNewTable.currentWaiter._id).trim()
                : rawNewTable.assignedWaiterId,
              assignedWaiterName: rawNewTable.currentWaiter?.displayName || rawNewTable.currentWaiter?.name || rawNewTable.currentWaiter?.email || rawNewTable.assignedWaiterName,
            };
            
            // If a waiter was selected, assign them to the new table
            if (canManageWaiterAssignment && selectedWaiterForNewTable) {
              const selectedWaiter = waiters.find(w => w._id === selectedWaiterForNewTable);
              console.log('[TABLE_CREATE] Selected waiter object:', selectedWaiter);
              if (selectedWaiter) {
                try {
                  console.log('[TABLE_CREATE] Assigning waiter', selectedWaiter._id, 'to table', newTable._id);
                  const assignResponse = await api.patch(`/tables/${newTable._id}/assign`, {
                    waiterId: selectedWaiter._id,
                  });
                  console.log('[TABLE_CREATE] Assign response:', assignResponse);
                  newTable.assignedWaiterId = selectedWaiter._id;
                  newTable.assignedWaiterName = selectedWaiter.display_name;
                } catch (assignError) {
                  console.error('[TABLE_CREATE] Error assigning waiter to new table:', assignError);
                }
              }
            }

            setTables(prev => [...prev, newTable]);
            results.push(`Table ${tableNum} added`);
          } else {
            console.log('[TABLE_CREATE] Failed response:', response);
            results.push(`Table ${tableNum} failed: ${response.message || 'Unknown error'}`);
          }
        } catch (error: any) {
          console.error(`[TABLE_CREATE] Error adding table ${tableNum}:`, error);
          console.error('[TABLE_CREATE] Error response:', error?.response);
          console.error('[TABLE_CREATE] Error data:', error?.response?.data);
          results.push(`Table ${tableNum} failed: ${error?.response?.data?.message || error?.message || 'Error'}`);
        }
      }

      // Show summary
      const successCount = results.filter(r => r.includes('added')).length;
      const failCount = results.length - successCount;
      
      if (successCount > 0) {
        Alert.alert(
          'Complete',
          `${successCount} table(s) added successfully.${failCount > 0 ? `\n\nFailed:\n${results.filter(r => r.includes('failed')).join('\n')}` : ''}`
        );
      } else {
        Alert.alert('Error', results.join('\n'));
      }
      
      // Reset form
      setNewTableNumber('');
      setNewTableCapacity('4');
      setSelectedWaiterForNewTable('');
      setShowAddTableModal(false);
    } catch (error) {
      console.error('Error adding tables:', error);
      Alert.alert('Error', 'Failed to add tables. Please try again.');
    } finally {
      setAddingTable(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAssignWaiter = (table: Table) => {
    if (!canManageWaiterAssignment) return;
    setSelectedTable(table);
    setSearchWaiterQuery('');
    setShowAssignModal(true);
  };

  const handleUnassignWaiter = async (table: Table) => {
  Alert.alert(
    'Unassign Waiter',
    `Remove waiter assignment from Table ${table.number}?`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unassign',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await api.patch(`/tables/${table._id}/unassign`);
            if (response.success) {
              setTables(prev => prev.map(t => 
                t._id === table._id 
                  ? { ...t, assignedWaiterId: undefined, assignedWaiterName: undefined }
                  : t
              ));
              Alert.alert('Success', 'Waiter unassigned successfully');
            } else {
              // Update locally for mock
              setTables(prev => prev.map(t => 
                t._id === table._id 
                  ? { ...t, assignedWaiterId: undefined, assignedWaiterName: undefined }
                  : t
              ));
              Alert.alert('Success', 'Waiter unassigned successfully');
            }
          } catch (error) {
            console.error('Error unassigning waiter:', error);
            Alert.alert('Error', 'Failed to unassign waiter');
          }
        },
      },
    ]
  );
};

  const confirmAssignWaiter = async (waiter: Waiter) => {
    if (!selectedTable) return;

    try {
      const response = await api.patch(`/tables/${selectedTable._id}/assign`, {
        waiterId: waiter._id,
      });
      
      if (response.success) {
        setTables(prev => prev.map(t => 
          t._id === selectedTable._id 
            ? { ...t, assignedWaiterId: waiter._id, assignedWaiterName: waiter.display_name }
            : t
        ));
        setShowAssignModal(false);
        setSelectedTable(null);
        Alert.alert('Success', `${waiter.display_name} assigned to Table ${selectedTable.number}`);
      } else {
        // Update locally for mock
        setTables(prev => prev.map(t => 
          t._id === selectedTable._id 
            ? { ...t, assignedWaiterId: waiter._id, assignedWaiterName: waiter.display_name }
            : t
        ));
        setShowAssignModal(false);
        Alert.alert('Success', `${waiter.display_name} assigned to Table ${selectedTable.number}`);
        setSelectedTable(null);
      }
    } catch (error) {
      console.error('Error assigning waiter:', error);
      Alert.alert('Error', 'Failed to assign waiter');
    }
  };

  // Assign waiter by email function
  const assignWaiterByEmail = async () => {
    if (!selectedTable) return;
    if (!emailInput.trim()) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      // First try to find waiter by email in the loaded waiters list
      const matchedWaiter = waiters.find(w => 
        w.email?.toLowerCase() === emailInput.trim().toLowerCase()
      );

      if (matchedWaiter) {
        // Assign the matched waiter
        await confirmAssignWaiter(matchedWaiter);
        setEmailInput('');
        setAssignByEmail(false);
        return;
      }

      // If not found locally, try API lookup
      const response = await api.get(`/users?role=WAITER&email=${encodeURIComponent(emailInput.trim())}`);
      
      if (response.success && response.data && response.data.length > 0) {
        const waiter = response.data[0];
        await confirmAssignWaiter({
          _id: waiter._id,
          display_name: waiter.displayName || waiter.name,
          email: waiter.email,
        });
        setEmailInput('');
        setAssignByEmail(false);
      } else {
        Alert.alert('Error', 'No waiter found with this email address. Please check the email and try again.');
      }
    } catch (error) {
      console.error('Error finding waiter by email:', error);
      Alert.alert('Error', 'Failed to find waiter. Please check the email and try again.');
    }
  };

  const filteredWaiters = waiters.filter(w => 
    w.display_name?.toLowerCase().includes(searchWaiterQuery.toLowerCase()) ||
    w.email?.toLowerCase().includes(searchWaiterQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return COLORS.success;
      case 'OCCUPIED': return COLORS.danger;
      case 'RESERVED': return COLORS.warning;
      default: return COLORS.muted;
    }
  };

  const getSelectedBranchName = () => {
    const branchId = userRole === 'BRANCH_MANAGER' ? userData.branchId : selectedBranch;
    if (!branchId) return 'Select Branch';
    const branch = branches.find(b => b._id === branchId);
    if (!branch) return 'Select Branch';
    return `${branch.branchName} (${branch.branchCode})`;
  };

  const handleDeleteTable = async (table: Table) => {
    Alert.alert(
      'Delete Table',
      `Are you sure you want to delete Table ${table.number}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const tableId = table._id.trim();
              const response = await api.delete(`/tables/${tableId}`);
              if (response.success) {
                setTables(prev => prev.filter(t => t._id !== table._id));
                Alert.alert('Success', 'Table deleted successfully');
              } else {
                Alert.alert('Error', response.message || 'Failed to delete table');
              }
            } catch (error: any) {
              console.error('Error deleting table:', error);
              Alert.alert('Error', error?.response?.data?.message || 'Failed to delete table');
            }
          },
        },
      ]
    );
  };

  const renderTableCard = ({ item }: { item: Table }) => {
    const statusColor = getStatusColor(item.status);
    
    return (
      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <View style={[styles.tableNumberBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.tableNumberText, { color: statusColor }]}>T{item.number}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
          </View>
          <TouchableOpacity 
            style={styles.deleteTableBtn}
            onPress={() => handleDeleteTable(item)}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.tableInfo}>
          <View style={styles.tableInfoRow}>
            <Ionicons name="people-outline" size={16} color={COLORS.muted} />
            <Text style={styles.tableInfoText}>Capacity: {item.capacity} persons</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderWaiterItem = ({ item }: { item: Waiter }) => (
    <TouchableOpacity 
      style={styles.waiterItem}
      onPress={() => confirmAssignWaiter(item)}
    >
      <View style={styles.waiterAvatar}>
        <Text style={styles.waiterAvatarText}>
          {item.display_name ? item.display_name.split(' ').map(n => n[0]).join('').toUpperCase() : '?'}
        </Text>
      </View>
      <View style={styles.waiterInfo}>
        <Text style={styles.waiterName}>{item.display_name}</Text>
        <Text style={styles.waiterEmail}>{item.email}</Text>
        <Text style={styles.waiterTables}>
          {item.assignedTablesCount || 0} tables assigned
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading tables...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      {/* Responsive Header */}
      <ResponsiveHeader
        title="Table Assignment"
        profileImage={profileImage}
        onProfilePress={() => setShowProfileMenu(true)}
      />

      {/* Branch Selector (SUPER_ADMIN and ADMIN). Managers see fixed branch name + code (no filter). */}
      {userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' ? (
        <>
          <TouchableOpacity
            style={styles.branchSelector}
            onPress={() => setShowBranchDropdown(!showBranchDropdown)}
            activeOpacity={0.7}
          >
            <Ionicons name="business-outline" size={18} color={COLORS.primary} />
            <Text style={styles.branchSelectorText}>{getSelectedBranchName()}</Text>
            <Ionicons name={showBranchDropdown ? "chevron-up" : "chevron-down"} size={16} color={COLORS.muted} />
          </TouchableOpacity>

          {showBranchDropdown && (
            <View style={styles.branchDropdown}>
              <TouchableOpacity
                style={[styles.branchDropdownItem, selectedBranch === 'all' && styles.branchDropdownItemActive]}
                onPress={() => {
                  setSelectedBranch('all');
                  setShowBranchDropdown(false);
                }}
              >
                <Text style={[styles.branchDropdownText, selectedBranch === 'all' && styles.branchDropdownTextActive]}>
                  All Branches
                </Text>
              </TouchableOpacity>
              {branches.map(branch => (
                <TouchableOpacity
                  key={branch._id}
                  style={[styles.branchDropdownItem, selectedBranch === branch._id && styles.branchDropdownItemActive]}
                  onPress={() => {
                    setSelectedBranch(branch._id);
                    setShowBranchDropdown(false);
                  }}
                >
                  <Text style={[styles.branchDropdownText, selectedBranch === branch._id && styles.branchDropdownTextActive]}>
                    {branch.branchName} ({branch.branchCode})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      ) : (
        <View style={styles.branchSelector}>
          <Ionicons name="business-outline" size={18} color={COLORS.primary} />
          <Text style={styles.branchSelectorText}>{getSelectedBranchName()}</Text>
        </View>
      )}

      {/* Stats Summary - Categories Style */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.orangeCard]}>
          <Text style={styles.statCardValue}>{tables.length}</Text>
          <Text style={styles.statCardLabel}>Total</Text>
        </View>
      </View>

      {/* Add Table Button */}
      <TouchableOpacity
        style={styles.addTableButton}
        onPress={() => setShowAddTableModal(true)}
      >
        <Ionicons name="add-circle" size={20} color={COLORS.white} />
        <Text style={styles.addTableButtonText}>Add Table</Text>
      </TouchableOpacity>

      {/* Tables Grid */}
      <FlatList
        data={tables}
        renderItem={renderTableCard}
        keyExtractor={item => item._id}
        contentContainerStyle={[styles.tablesList, { paddingBottom: 100 }]}
        numColumns={2}
        columnWrapperStyle={styles.tableRow}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={48} color={COLORS.muted} />
            <Text style={styles.emptyText}>No tables found</Text>
          </View>
        }
      />

      {/* Add Table Modal */}
      <Modal
        visible={showAddTableModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowAddTableModal(false);
          setNewTableNumber('');
          setNewTableCapacity('4');
          setSelectedWaiterForNewTable('');
          Keyboard.dismiss();
        }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView 
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Table</Text>
                <TouchableOpacity onPress={() => {
                  setShowAddTableModal(false);
                  setNewTableNumber('');
                  setNewTableCapacity('4');
                  setSelectedWaiterForNewTable('');
                  Keyboard.dismiss();
                }}>
                  <Ionicons name="close" size={24} color={COLORS.muted} />
                </TouchableOpacity>
              </View>

              <View style={styles.formSection}>
                {/* Table Number Input */}
                <Text style={styles.inputLabel}>Table Number(s)</Text>
                <Text style={styles.inputHint}>Enter comma-separated numbers (e.g., 1, 2, 3, 4)</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="restaurant-outline" size={18} color={COLORS.muted} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="1, 2, 3, 4, 5"
                    value={newTableNumber}
                    onChangeText={setNewTableNumber}
                    keyboardType="number-pad"
                    returnKeyType="done"
                  />
                </View>

                {/* Capacity Input */}
                <Text style={styles.inputLabel}>Capacity (persons)</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="people-outline" size={18} color={COLORS.muted} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter capacity"
                    value={newTableCapacity}
                    onChangeText={setNewTableCapacity}
                    keyboardType="number-pad"
                    returnKeyType="done"
                  />
                </View>

                {/* Add Table Button */}
                <TouchableOpacity
                  style={[styles.submitButton, addingTable && styles.submitButtonDisabled]}
                  onPress={handleAddTable}
                  disabled={addingTable}
                >
                  {addingTable ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <>
                      <Ionicons name="add-circle" size={18} color={COLORS.white} />
                      <Text style={styles.submitButtonText}>Add Table(s)</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Assign Waiter Modal */}
      {canManageWaiterAssignment ? (
        <Modal
          visible={showAssignModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setShowAssignModal(false);
            setAssignByEmail(false);
            setEmailInput('');
          }}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    Assign Waiter to Table {selectedTable?.number}
                  </Text>
                  <TouchableOpacity onPress={() => {
                    setShowAssignModal(false);
                    setAssignByEmail(false);
                    setEmailInput('');
                    Keyboard.dismiss();
                  }}>
                    <Ionicons name="close" size={24} color={COLORS.muted} />
                  </TouchableOpacity>
                </View>
                {assignByEmail ? (
                  <>
                    <View style={styles.emailInputContainer}>
                      <Ionicons name="mail-outline" size={18} color={COLORS.muted} />
                      <TextInput
                        style={styles.emailInput}
                        placeholder="waiter@example.com"
                        value={emailInput}
                        onChangeText={setEmailInput}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.assignEmailButton}
                      onPress={assignWaiterByEmail}
                    >
                      <Ionicons name="person-add" size={18} color={COLORS.white} />
                      <Text style={styles.assignEmailButtonText}>Assign Waiter</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {/* Search Waiter */}
                    <View style={styles.searchContainer}>
                      <Ionicons name="search" size={18} color={COLORS.muted} />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Search waiters..."
                        value={searchWaiterQuery}
                        onChangeText={setSearchWaiterQuery}
                      />
                    </View>

                    {/* Waiters List */}
                    <ScrollView style={styles.waitersList} nestedScrollEnabled={true}>
                      {filteredWaiters.length === 0 ? (
                        <View style={styles.emptyWaiterContainer}>
                          <Ionicons name="person-outline" size={32} color={COLORS.muted} />
                          <Text style={styles.emptyWaiterText}>No waiters found</Text>
                        </View>
                      ) : (
                        filteredWaiters.map((item) => (
                          <TouchableOpacity 
                            key={item._id}
                            style={styles.waiterItem}
                            onPress={() => confirmAssignWaiter(item)}
                          >
                            <View style={styles.waiterAvatar}>
                              <Text style={styles.waiterAvatarText}>
                                {item.display_name ? item.display_name.split(' ').map(n => n[0]).join('').toUpperCase() : '?'}
                              </Text>
                            </View>
                            <View style={styles.waiterInfo}>
                              <Text style={styles.waiterName}>{item.display_name}</Text>
                              <Text style={styles.waiterEmail}>{item.email}</Text>
                              <Text style={styles.waiterTables}>
                                {item.assignedTablesCount || 0} tables assigned
                              </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </>
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      ) : null}

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
              <Text style={styles.modalTitle}>More</Text>
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

      {/* Bottom Navigation */}
      <AdminBottomNavigation
        onMorePress={() => setShowMoreMenu(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalScrollView: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.muted,
  },
  // Header Styles - White like Categories
  header: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  leftSection: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileButton: {
    width: 40,
    height: 40,
  },
  profilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Stats Grid - Categories Style
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  orangeCard: {
    backgroundColor: '#FF8C42',
  },
  greenCard: {
    backgroundColor: '#2ECC71',
  },
  blueCard: {
    backgroundColor: '#3B82F6',
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statCardLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 4,
    opacity: 0.9,
  },
  branchSelectorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    zIndex: 100,
  },
  branchSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  branchSelectorText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.dark,
  },
  branchDropdown: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
    maxHeight: 200,
  },
  branchDropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  branchDropdownItemActive: {
    backgroundColor: COLORS.primary + '10',
  },
  branchDropdownText: {
    fontSize: 14,
    color: COLORS.dark,
  },
  branchDropdownTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    marginBottom: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  tablesList: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  tableRow: {
    justifyContent: 'space-between',
  },
  tableCard: {
    flex: 1,
    margin: 4,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  deleteTableBtn: {
    padding: 4,
    marginLeft: 'auto',
  },
  tableNumberBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tableNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  tableInfo: {
    marginBottom: 12,
  },
  tableInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  tableInfoText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  assignedWaiter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  assignedWaiterText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  unassignedWaiter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unassignedWaiterText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  tableActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  assignBtn: {
    backgroundColor: COLORS.primary,
  },
  assignBtnText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
  },
  reassignBtn: {
    backgroundColor: COLORS.primary + '15',
    flex: 1,
  },
  reassignBtnText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  unassignBtn: {
    backgroundColor: COLORS.danger + '15',
    flex: 0,
    paddingHorizontal: 12,
  },
  unassignBtnText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '500',
  },
  addTableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  addTableButtonText: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: '600',
  },
  formSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inputLabel: {
    fontSize: 13,
    color: COLORS.dark,
    marginBottom: 8,
    fontWeight: '500',
  },
  inputHint: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 8,
    marginTop: -4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.dark,
  },
  waiterDropdown: {
    marginBottom: 16,
  },
  waiterDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  waiterDropdownText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.dark,
  },
  waiterListContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    marginTop: 8,
    maxHeight: 200,
  },
  waiterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  waiterOptionSelected: {
    backgroundColor: COLORS.primary + '10',
  },
  waiterOptionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  waiterOptionAvatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  waiterOptionInfo: {
    flex: 1,
  },
  waiterOptionName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  waiterOptionEmail: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  waiterOptionList: {
    maxHeight: 200,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.background,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
  },
  waitersList: {
    paddingHorizontal: 16,
  },
  waiterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  waiterAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  waiterAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  waiterInfo: {
    flex: 1,
  },
  waiterName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
  },
  waiterEmail: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  waiterTables: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 2,
  },
  emptyWaiterContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyWaiterText: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.white,
  },
  toggleButtonText: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '500',
  },
  toggleButtonTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  emailSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emailLabel: {
    fontSize: 13,
    color: COLORS.dark,
    marginBottom: 8,
    fontWeight: '500',
  },
  emailInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: COLORS.background,
    borderRadius: 10,
  },
  emailInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 14,
  },
  assignEmailButton: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  assignEmailButtonText: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.dark,
    marginLeft: 16,
  },
});
