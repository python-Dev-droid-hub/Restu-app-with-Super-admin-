import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  RefreshControl,
  Modal,
  StatusBar,
  Image,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalization } from '../../context/LocalizationContext';
import {
  getAdminNotificationsList,
  markAllAdminNotificationsAsRead,
  clearAllAdminNotifications,
  markAdminNotificationAsRead,
  deleteAdminNotification,
  Notification,
} from '../../services/notificationService';
import { useUserData } from '../../hooks/useUserData';
import { isAdminRole } from '../../utils/permissionHelpers';
import { useBranch } from '../../context/BranchContext';
import GlobalBranchBar from '../../components/admin/GlobalBranchBar';
import { navigateToOrder } from '../../utils/navigateToOrder';

// Components
import ResponsiveHeader from '../../components/layout/ResponsiveHeader';
import ProfileMenu from '../../components/common/ProfileMenu';
import AdminBottomNavigation from '../../components/navigation/AdminBottomNavigation';

import { getSpacing } from '../../utils/responsive';
import { COLORS } from '../../constants/colors';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;
const FOOTER_MARGIN = Platform.OS === 'android' ? 20 : 10;

export default function AdminNotificationsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useLocalization();
  const { profileImage } = useUserData();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Get parent tab navigation for bottom nav (undefined for stack screens)
  const tabNavigation = navigation.getParent();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const [userRole, setUserRole] = useState<string>('');
  const { getApiBranchParam, branchRevision, isReady } = useBranch();

  // Load user role and branch on mount
  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    loadNotifications();
  }, [branchRevision, isReady]);

  const loadUserData = async () => {
    try {
      const stored = await AsyncStorage.getItem('userData');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUserRole(parsed.role || '');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
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

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const branchId = getApiBranchParam();
      const result = await getAdminNotificationsList(50, branchId);
      if (result.success) {
        setNotifications(result.notifications);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = () => {
    Alert.alert('Mark all as read?', 'Mark every notification in this list as read?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark all read',
        onPress: async () => {
          try {
            setActionLoading(true);
            const branchId = getApiBranchParam();
            const ok = await markAllAdminNotificationsAsRead(branchId);
            if (ok) {
              await loadNotifications();
            } else {
              Alert.alert('Error', 'Could not mark notifications as read');
            }
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleDeleteAll = () => {
    Alert.alert(
      'Delete all notifications?',
      'This removes all notifications in the current list. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete all',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              const branchId = getApiBranchParam();
              const ok = await clearAllAdminNotifications(branchId);
              if (ok) {
                setNotifications([]);
              } else {
                Alert.alert('Error', 'Could not delete notifications');
              }
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleNotificationPress = async (notification: Notification) => {
    const branchId = getApiBranchParam();
    const orderId =
      notification.data?.orderId ||
      (notification.data as { order_id?: string })?.order_id;
    const orderNumber =
      notification.data?.orderNumber ||
      (notification.data as { order_number?: string })?.order_number;

    if (orderId || orderNumber) {
      navigateToOrder(navigation as never, {
        _id: orderId ? String(orderId) : undefined,
        orderNumber: orderNumber ? String(orderNumber) : undefined,
      });
    }

    if (notification.read) return;

    const ok = await markAdminNotificationAsRead(notification._id, branchId);
    if (ok) {
      setNotifications((prev) =>
        prev.map((n) => (n._id === notification._id ? { ...n, read: true } : n))
      );
    }
  };

  const handleDeleteOne = (notificationId: string) => {
    Alert.alert('Delete notification?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const branchId = getApiBranchParam();
          const ok = await deleteAdminNotification(notificationId, branchId);
          if (ok) {
            setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
          } else {
            Alert.alert('Error', 'Could not delete notification');
          }
        },
      },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

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

  const getNotificationTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      INFO: '#2196f3',
      WARNING: '#ff9800',
      ERROR: '#f44336',
      SUCCESS: '#4caf50',
    };
    return colors[type] || '#757575';
  };

  const filteredNotifications =
    activeTab === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const NotificationCard = ({ notification }: { notification: Notification }) => {
    // Extract waiter name from notification data
    const waiterName = notification.data?.waiterName || notification.data?.waiter?.name || 
                       notification.waiterName || notification.assignedTo?.name ||
                       (notification.body?.includes('by') && notification.body.split('by')[1]?.trim()) ||
                       null;
    return (
      <TouchableOpacity
        style={[styles.notificationCard, !notification.read && styles.notificationCardUnread]}
        activeOpacity={0.85}
        onPress={() => handleNotificationPress(notification)}
      >
        <View style={styles.notificationHeader}>
          <View style={styles.notificationInfo}>
            <Text style={styles.notificationTitle}>{notification.title}</Text>
            <Text style={styles.notificationMessage} numberOfLines={3}>
              {notification.body || notification.message}
            </Text>
            {waiterName && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Ionicons name="person-circle" size={14} color="#888" />
                <Text style={{ fontSize: 12, color: '#888', marginLeft: 4 }}>By: {waiterName}</Text>
              </View>
            )}
          </View>
          <View style={styles.notificationActions}>
            <View style={[styles.typeBadge, { backgroundColor: getNotificationTypeColor(notification.type || 'INFO') }]}>
              <Text style={styles.typeText}>{notification.type || 'INFO'}</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleDeleteOne(notification._id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={20} color="#E74C3C" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.notificationDetails}>
          <Text style={styles.notificationDetail}>
            {notification.read ? '✓ Read' : '● Unread'}
          </Text>
          <Text style={styles.notificationDetail}>
            {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : 'Just now'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Responsive Header */}
      <ResponsiveHeader
        title={t('nav.notifications')}
        notificationCount={0}
        profileImage={profileImage}
        onNotificationPress={() => {
          // @ts-ignore
          navigation.navigate('AdminNotifications');
        }}
        onProfilePress={() => setShowProfileMenu(true)}
      />

      <GlobalBranchBar />

      {notifications.length > 0 && (
        <View style={styles.bulkActions}>
          <TouchableOpacity
            style={[styles.bulkButton, actionLoading && styles.bulkButtonDisabled]}
            onPress={handleMarkAllRead}
            disabled={actionLoading || unreadCount === 0}
          >
            <Ionicons name="checkmark-done-outline" size={18} color="#E87E35" />
            <Text style={styles.bulkButtonText}>Read all</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bulkButton, styles.bulkButtonDanger, actionLoading && styles.bulkButtonDisabled]}
            onPress={handleDeleteAll}
            disabled={actionLoading}
          >
            <Ionicons name="trash-outline" size={18} color="#E74C3C" />
            <Text style={[styles.bulkButtonText, styles.bulkButtonTextDanger]}>Delete all</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.tabNavigation}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'all' && styles.tabButtonActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All ({notifications.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'unread' && styles.tabButtonActive]}
          onPress={() => setActiveTab('unread')}
        >
          <Text style={[styles.tabText, activeTab === 'unread' && styles.tabTextActive]}>
            Unread ({unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { borderLeftColor: '#1976d2' }]}>
            <Text style={styles.statValue}>{notifications.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: '#4caf50' }]}>
            <Text style={styles.statValue}>{unreadCount}</Text>
            <Text style={styles.statLabel}>Unread</Text>
          </View>
        </View>

        <View style={styles.notificationsContainer}>
          <Text style={styles.sectionTitle}>
            {activeTab === 'unread' ? 'Unread Notifications' : 'All Notifications'}
          </Text>

          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <NotificationCard key={notification._id} notification={notification} />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyText}>
                {activeTab === 'unread' ? 'No unread notifications' : 'No notifications found'}
              </Text>
              <Text style={styles.emptySubtext}>
                {activeTab === 'unread' ? 'Unread notifications will appear here' : 'Notifications sent to you will appear here'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom Navigation */}
      <AdminBottomNavigation onMorePress={() => setShowMoreMenu(true)} tabNavigation={tabNavigation} />

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  bulkActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  bulkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  bulkButtonDanger: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
  },
  bulkButtonDisabled: {
    opacity: 0.5,
  },
  bulkButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E87E35',
  },
  bulkButtonTextDanger: {
    color: '#E74C3C',
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#E87E35',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
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
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  notificationsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  notificationCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  notificationCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: '#E87E35',
  },
  notificationActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  notificationInfo: {
    flex: 1,
    marginRight: 12,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  notificationDetails: {
    marginBottom: 12,
  },
  notificationDetail: {
    fontSize: 13,
    color: '#888',
    marginBottom: 2,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
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
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
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
  navItemActive: {
    transform: [{ scale: 1.05 }],
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
  // Branch Selector Styles
  branchSelectorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  branchSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E87E35',
  },
  branchSelectorText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginHorizontal: 10,
  },
  branchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 8,
  },
  branchLabelText: {
    fontSize: 14,
    color: '#E87E35',
    fontWeight: '600',
  },
  branchDropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E87E35',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  branchDropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  branchDropdownItemActive: {
    backgroundColor: '#FFF3E0',
  },
  branchDropdownText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  branchDropdownTextActive: {
    color: '#E87E35',
    fontWeight: '700',
  },
});
