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
  Image,
  Switch,
  Dimensions,
  Modal,
  Platform,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalization } from '../../context/LocalizationContext';
import { useUserData } from '../../hooks/useUserData';
import { COLORS } from '../../constants/colors';
import { getSpacing } from '../../utils/responsive';

// Components
import ResponsiveHeader from '../../components/layout/ResponsiveHeader';
import ProfileMenu from '../../components/common/ProfileMenu';
import AdminBottomNavigation from '../../components/navigation/AdminBottomNavigation';

const { width } = Dimensions.get('window');

interface Branch {
  _id: string;
  branchName: string;
  address: string;
  phoneNumber: string;
  managerName: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminBranchesScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useLocalization();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([]);

  const [userRole, setUserRole] = useState<string>('');
  const { profileImage } = useUserData();

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
    loadBranches();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = branches.filter(branch =>
        branch.branchName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.managerName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredBranches(filtered);
    } else {
      setFilteredBranches(branches);
    }
  }, [searchQuery, branches]);

  const loadBranches = async () => {
    try {
      setLoading(true);
      const response = await api.get('/branches');
      if (response.success && response.data) {
        setBranches(response.data.branches || []);
        setFilteredBranches(response.data.branches || []);
      }
    } catch (error) {
      console.error('Error loading branches:', error);
      Alert.alert('Error', 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBranches();
    setRefreshing(false);
  };

  const toggleBranchStatus = async (branchId: string, currentStatus: boolean) => {
    try {
      const response = await api.put(`/branches/${branchId}`, {
        isActive: !currentStatus
      });

      if (response.success) {
        Alert.alert('Success', `Branch ${!currentStatus ? 'activated' : 'deactivated'}`);
        loadBranches(); // Refresh branches
      }
    } catch (error) {
      console.error('Error updating branch status:', error);
      Alert.alert('Error', 'Failed to update branch status');
    }
  };

  const BranchCard = ({ branch }: { branch: Branch }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{branch.branchName}</Text>
          <Text style={styles.itemDescription} numberOfLines={2}>{branch.address}</Text>
          <View style={styles.itemMeta}>
            <Text style={styles.metaText}>📞 {branch.phoneNumber}</Text>
            <Text style={styles.metaText}>👤 {branch.managerName}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, branch.isActive ? styles.activeBadge : styles.inactiveBadge]}>
          <Text style={[styles.statusText, branch.isActive ? styles.activeText : styles.inactiveText]}>
            {branch.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.itemFooter}>
        <Text style={styles.itemDate}>Created: {new Date(branch.createdAt).toLocaleDateString()}</Text>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.iconBtn, styles.editBtn]}
            onPress={() => {/* TODO: Navigate to edit branch screen */}}
          >
            <Ionicons name="pencil" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.iconBtn, styles.deleteBtn]}
            onPress={() => {/* TODO: Delete branch */}}
          >
            <Ionicons name="trash" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Responsive Header */}
      <ResponsiveHeader
        title={t('nav.branches')}
        notificationCount={unreadCount}
        profileImage={profileImage}
        onNotificationPress={() => {
          // @ts-ignore
          navigation.navigate('AdminNotifications');
        }}
        onProfilePress={() => setShowProfileMenu(true)}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search branches..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: '#1976d2' }]}>
            <Text style={styles.statValue}>{(branches.length || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Branches</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#4caf50' }]}>
            <Text style={styles.statValue}>{(branches.filter(b => b.isActive).length || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Active Branches</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#f44336' }]}>
            <Text style={styles.statValue}>{(branches.filter(b => !b.isActive).length || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Inactive Branches</Text>
          </View>
        </View>

        <View style={styles.itemsContainer}>
          <Text style={styles.sectionTitle}>All Branches</Text>

          {filteredBranches.length > 0 ? (
            filteredBranches.map((branch) => (
              <BranchCard key={branch._id} branch={branch} />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="business-outline" size={64} color="#ddd" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No branches found matching your search' : 'No branches found'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery ? 'Try different search terms' : 'Branches will appear here when added'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Only show Add button for SUPER_ADMIN and ADMIN, not BRANCH_MANAGER */}
      {(userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') && (
        <TouchableOpacity 
          style={[
            styles.floatingButton,
            { bottom: getSpacing(22) + insets.bottom }
          ]}
          onPress={() => { // @ts-ignore
            navigation.navigate('AddBranch');
          }}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Bottom Navigation */}
      <AdminBottomNavigation onMorePress={() => setShowMoreMenu(true)} />

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
              <Text style={styles.modalTitle}>{t('nav.more')}</Text>
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    marginLeft: 12,
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
  },
  itemsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 16,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  itemMeta: {
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#e8f5e8',
  },
  inactiveBadge: {
    backgroundColor: '#ffeaea',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeText: {
    color: '#4caf50',
  },
  inactiveText: {
    color: '#f44336',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemDate: {
    fontSize: 12,
    color: '#999',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    backgroundColor: '#2196F3',
  },
  deleteBtn: {
    backgroundColor: '#F44336',
  },
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 8,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 150,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E87E35',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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
});
