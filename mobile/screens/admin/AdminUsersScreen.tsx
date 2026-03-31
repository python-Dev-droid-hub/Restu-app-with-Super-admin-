import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalization } from '../../context/LocalizationContext';
import { useUserData } from '../../hooks/useUserData';

// Components
import ResponsiveHeader from '../../components/layout/ResponsiveHeader';
import ProfileMenu from '../../components/common/ProfileMenu';
import AdminBottomNavigation from '../../components/navigation/AdminBottomNavigation';

// Utils & Constants
import { getSpacing } from '../../utils/responsive';
import { COLORS } from '../../constants/colors';

interface User {
  _id: string;
  displayName: string;
  email: string;
  role: string;
  isActive?: boolean;
  createdAt: string;
}

type UserTab = 'all' | 'customer' | 'admin' | 'chef' | 'waiter' | 'rider' | 'branch_manager';

export default function AdminUsersScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useLocalization();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<UserTab>('all');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
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

  // Filter menu items based on role
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

  // Load users when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [])
  );

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      if (response.success) {
        setUsers(response.data.users || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      setLoading(true);
      const endpoint = currentStatus ? `/users/${userId}/deactivate` : `/users/${userId}/activate`;
      const response = await api.put(endpoint, {});

      if (response.success) {
        Alert.alert('Success', `User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
        // Update local state immediately for better UX
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user._id === userId ? { ...user, isActive: !currentStatus } : user
          )
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to update user status');
      }
    } catch (error: any) {
      console.error('Error updating user status:', error);
      Alert.alert('Error', error?.message || 'Failed to update user status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    Alert.alert(
      'Delete User',
      'Are you sure you want to delete this user? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await api.delete(`/users/${userId}`);
              if (response.success) {
                Alert.alert('Success', 'User deleted successfully');
                loadUsers();
              } else {
                Alert.alert('Error', response.message || 'Failed to delete user');
              }
            } catch (error: any) {
              console.error('Error deleting user:', error);
              Alert.alert('Error', error?.response?.data?.message || error?.message || 'Failed to delete user. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Get parent tab navigation for bottom nav
  const tabNavigation = navigation.getParent();

  const handleLogout = async () => {
    setShowProfileMenu(false);
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['authToken', 'userRole', 'userData']);
              // @ts-ignore
              navigation.reset({
                index: 0,
                // @ts-ignore
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Error during logout:', error);
            }
          },
        },
      ]
    );
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return '#1976d2';
      case 'CHEF':
        return '#ff9800';
      case 'WAITER':
        return '#9c27b0';
      case 'RIDER':
        return '#f44336';
      case 'CUSTOMER':
        return '#4caf50';
      default:
        return '#666';
    }
  };

  const getFilteredUsers = () => {
    if (activeTab === 'all') return users;
    if (activeTab === 'customer') return users.filter(u => u.role === 'CUSTOMER');
    if (activeTab === 'admin') return users.filter(u => u.role === 'ADMIN');
    if (activeTab === 'chef') return users.filter(u => u.role === 'CHEF');
    if (activeTab === 'waiter') return users.filter(u => u.role === 'WAITER');
    if (activeTab === 'rider') return users.filter(u => u.role === 'RIDER');
    if (activeTab === 'branch_manager') return users.filter(u => u.role === 'BRANCH_MANAGER');
    return users;
  };

  const renderTab = (tab: UserTab, label: string, count?: number) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity
        key={tab}
        style={[styles.tab, isActive ? styles.tabActive : styles.tabInactive]}
        onPress={() => setActiveTab(tab)}
      >
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
          {label}
        </Text>
        {count !== undefined && (
          <Text style={[styles.tabCount, isActive && styles.tabCountActive]}>
            {count}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const filteredUsers = getFilteredUsers();

  // For managers, only show tabs for roles they can create
  const getTabs = () => {
    if (userRole === 'BRANCH_MANAGER') {
      return [
        { tab: 'all' as UserTab, label: 'All Users' },
        { tab: 'chef' as UserTab, label: 'Chefs' },
        { tab: 'waiter' as UserTab, label: 'Waiters' },
        { tab: 'rider' as UserTab, label: 'Riders' },
      ];
    }
    return [
      { tab: 'all' as UserTab, label: 'All Users' },
      { tab: 'customer' as UserTab, label: 'Customers' },
      { tab: 'admin' as UserTab, label: 'Admins' },
      { tab: 'chef' as UserTab, label: 'Chefs' },
      { tab: 'waiter' as UserTab, label: 'Waiters' },
      { tab: 'rider' as UserTab, label: 'Riders' },
    ];
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      {/* Responsive Header */}
      <ResponsiveHeader
        title={t('users.title')}
        notificationCount={0}
        profileImage={profileImage}
        onNotificationPress={() => {
          // @ts-ignore
          navigation.navigate('AdminNotifications');
        }}
        onProfilePress={() => setShowProfileMenu(true)}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Filter Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScrollView}
          contentContainerStyle={styles.tabsContainer}
        >
          {getTabs().map(({ tab, label }) => renderTab(tab, label))}
        </ScrollView>

        <View style={styles.usersContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {activeTab === 'all' ? 'All Users' : 
               activeTab === 'customer' ? 'Customers' : 
               activeTab === 'admin' ? 'Admins' :
               activeTab === 'chef' ? 'Chefs' :
               activeTab === 'waiter' ? 'Waiters' :
               activeTab === 'rider' ? 'Riders' :
               activeTab === 'branch_manager' ? 'Branch Managers' : 'Users'} ({filteredUsers.length})
            </Text>
            {/* Add User Button - All roles can add users, managers restricted to WAITER/CHEF/RIDER in AddUserScreen */}
            <TouchableOpacity 
              style={styles.addUserButton}
              onPress={() => { // @ts-ignore
                navigation.navigate('AddUser');
              }}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addUserButtonText}>Add User</Text>
            </TouchableOpacity>
          </View>
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <TouchableOpacity 
                key={user._id} 
                style={styles.userCard}
                onPress={() => { // @ts-ignore
                  navigation.navigate('UserDetail', { userId: user._id });
                }}
              >
                <View style={styles.userHeader}>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.displayName}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) }]}>
                    <Text style={styles.roleText}>{user.role}</Text>
                  </View>
                </View>

                <View style={styles.userFooter}>
                  <View style={[styles.statusIndicator, { backgroundColor: (user.isActive !== false) ? '#4caf50' : '#f44336' }]}>
                    <Text style={styles.statusText}>{(user.isActive !== false) ? 'Active' : 'Inactive'}</Text>
                  </View>
                  <Text style={styles.userDate}>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: (user.isActive !== false) ? '#f44336' : '#4caf50' }]}
                    onPress={() => toggleUserStatus(user._id, user.isActive !== false)}
                  >
                    <Text style={styles.actionButtonText}>
                      {(user.isActive !== false) ? 'Deactivate' : 'Activate'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#f44336' }]}
                    onPress={() => deleteUser(user._id)}
                  >
                    <Text style={styles.actionButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          )}
        </View>
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Floating Add User Button - All roles can add users */}
      <TouchableOpacity
        style={[
          styles.fab,
          { bottom: getSpacing(22) + insets.bottom }
        ]}
        onPress={() => { // @ts-ignore
          navigation.navigate('AddUser');
        }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* More Menu Modal */}
      <ProfileMenu
        visible={showProfileMenu}
        onClose={() => setShowProfileMenu(false)}
        onLogout={() => { // @ts-ignore
          navigation.navigate('Welcome');
        }}
        onChangePassword={() => { // @ts-ignore
          navigation.navigate('ChangePassword');
        }}
      />

      {/* More Menu Modal */}
      <Modal
        visible={showMoreMenu}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMoreMenu(false)}
      >
        <TouchableOpacity 
          style={styles.moreMenuOverlay}
          activeOpacity={1}
          onPress={() => setShowMoreMenu(false)}
        >
          <View style={styles.moreMenuContainer}>
            <View style={styles.moreMenuHeader}>
              <Text style={styles.moreMenuTitle}>More Options</Text>
              <TouchableOpacity onPress={() => setShowMoreMenu(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.moreMenuItem}
                onPress={() => {
                  setShowMoreMenu(false);
                  // @ts-ignore
                  navigation.navigate(item.screen);
                }}
              >
                <View style={styles.moreMenuIconContainer}>
                  <Ionicons name={item.icon as any} size={20} color="#E87E35" />
                </View>
                <Text style={styles.moreMenuItemText}>{item.name}</Text>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Bottom Navigation */}
      <AdminBottomNavigation onMorePress={() => setShowMoreMenu(true)} tabNavigation={tabNavigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  scrollView: {
    flex: 1,
  },
  tabsScrollView: {
    maxHeight: 60,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    alignItems: 'center',
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  tabInactive: {
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
  tabCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  tabCountActive: {
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  usersContainer: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  addUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E87E35',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
  },
  addUserButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  userCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  userFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  userDate: {
    fontSize: 12,
    color: '#888',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  fab: {
    position: 'absolute',
    right: getSpacing(4),
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E87E35',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E87E35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
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
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    paddingTop: 70,
    paddingRight: 16,
    alignItems: 'flex-end',
  },
  profileMenu: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  profileMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  profileMenuImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  profileMenuName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  profileMenuRole: {
    fontSize: 12,
    color: '#888',
  },
  profileMenuDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  profileMenuItemText: {
    fontSize: 14,
    color: '#E87E35',
    fontWeight: '500',
  },
  moreMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  moreMenuContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  moreMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  moreMenuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  moreMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  moreMenuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff5f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  moreMenuItemText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
});
