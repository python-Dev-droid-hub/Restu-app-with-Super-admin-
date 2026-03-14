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
  Switch,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';
import { Ionicons } from '@expo/vector-icons';
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

interface Category {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  icon?: string;
  imageUrl?: string;
  sortOrder?: number;
  displayOrder?: number;
  isActive: boolean;
  productCount?: number;
}

export default function AdminCategoriesScreen() {
  const navigation = useNavigation() as any;
  const insets = useSafeAreaInsets();
  const { t } = useLocalization();
  const { profileImage } = useUserData();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [userRole, setUserRole] = useState<string>('');
  const [assignedBranch, setAssignedBranch] = useState<{_id?: string; name?: string; code?: string}>({});

  // Load user role and branch on mount
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const stored = await AsyncStorage.getItem('userData');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUserRole(parsed.role || '');
        const branchData = parsed.assignedBranch || parsed.branch;
        if (branchData) {
          setAssignedBranch({
            _id: branchData._id || branchData.branchId || parsed.branchId,
            name: branchData.name || branchData.branchName || 'My Branch',
            code: branchData.code || branchData.branchCode || ''
          });
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const menuItems = [
    { name: t('nav.notifications'), icon: 'notifications-outline', screen: 'AdminNotifications' },
    { name: 'Table Assignment', icon: 'grid-outline', screen: 'TableAssignment' },
    // Only show Branches for SUPER_ADMIN
    ...(userRole === 'SUPER_ADMIN' ? [{ name: t('nav.branches'), icon: 'business-outline', screen: 'AdminBranches' }] : []),
    { name: t('nav.deals'), icon: 'pricetag-outline', screen: 'AdminDealCampaigns' },
    { name: t('nav.coupons'), icon: 'ticket-outline', screen: 'AdminCoupons' },
    { name: t('nav.productSizes'), icon: 'resize-outline', screen: 'AdminProductSizes' },
    { name: t('nav.categories'), icon: 'grid-outline', screen: 'AdminCategories' },
    { name: t('nav.reports'), icon: 'bar-chart-outline', screen: 'AdminReports' },
    { name: t('nav.settings'), icon: 'settings-outline', screen: 'AdminSettings' },
  ];

  useEffect(() => {
    loadCategories();
  }, []);

  // Refresh when screen comes into focus (e.g., after adding category)
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Categories screen focused - refreshing data');
      loadCategories();
    }, [])
  );

  // Additional listener for navigation state changes
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🔄 Navigation focus event - refreshing categories');
      loadCategories();
    });

    return unsubscribe;
  }, [navigation]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      console.log('Fetching categories from API...');
      
      // Check if token exists
      const token = await AsyncStorage.getItem('authToken');
      console.log('Auth token exists:', !!token);
      
      const response = await api.get('/menu/admin/categories');
      console.log('API Response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        // API returns data directly as array or as { categories: [] }
        const cats = Array.isArray(response.data) 
          ? response.data 
          : response.data.categories || [];
        console.log('Categories loaded:', cats.length);
        setCategories(cats);
      } else {
        console.log('No data in response or API failed:', response);
      }
    } catch (error: any) {
      console.error('Error loading categories:', error);
      console.error('Error details:', error.response?.data);
      console.error('Error status:', error.response?.status);
      Alert.alert('Error', 'Failed to load categories. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCategories();
    setRefreshing(false);
  };

  const toggleCategoryStatus = async (categoryId: string, currentStatus: boolean) => {
    try {
      const response = await api.put(`/menu/admin/categories/${categoryId}`, {
        isActive: !currentStatus
      });

      if (response.success) {
        Alert.alert('Success', `Category ${!currentStatus ? 'activated' : 'deactivated'}`);
        loadCategories();
      }
    } catch (error) {
      console.error('Error updating category status:', error);
      Alert.alert('Error', 'Failed to update category status');
    }
  };

  const deleteCategory = async (categoryId: string) => {
    Alert.alert(
      'Delete Category',
      'Are you sure you want to delete this category?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete(`/menu/admin/categories/${categoryId}`);
              if (response.success) {
                Alert.alert('Success', 'Category deleted');
                loadCategories();
              }
            } catch (error) {
              console.error('Error deleting category:', error);
              Alert.alert('Error', 'Failed to delete category');
            }
          },
        },
      ]
    );
  };

  const editCategory = (category: any) => {
    // @ts-ignore
    navigation.navigate('AddCategory', { category });
  };

  const activeCount = categories.filter(c => c.isActive).length;
  const totalProducts = categories.reduce((acc, c) => acc + (c.productCount || 0), 0);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      {/* Responsive Header */}
      <ResponsiveHeader
        title={t('nav.categories')}
        notificationCount={unreadCount}
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
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: getSpacing(25) + insets.bottom }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Branch Info */}
        <View style={styles.branchInfoContainer}>
          <View style={styles.branchInfo}>
            <Ionicons name="business-outline" size={18} color="#E87E35" />
            <Text style={styles.branchInfoText}>
              {assignedBranch.name || 'Loading Branch...'}
            </Text>
            {assignedBranch.code && (
              <View style={styles.branchCodeBadge}>
                <Text style={styles.branchCodeText}>{assignedBranch.code}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: COLORS.orange }]}>
            <Text style={styles.statValue}>{categories.length}</Text>
            <Text style={styles.statLabel}>Total Categories</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: COLORS.green }]}>
            <Text style={styles.statValue}>{activeCount}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: COLORS.blue }]}>
            <Text style={styles.statValue}>{totalProducts}</Text>
            <Text style={styles.statLabel}>Total Products</Text>
          </View>
        </View>

        {/* Categories List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Categories</Text>

          {categories.length > 0 ? (
            categories.map((category) => (
              <View key={category._id || category.id} style={styles.categoryCard}>
                {/* Category Header */}
                <View style={styles.categoryHeader}>
                  <View style={styles.iconContainer}>
                    {category.imageUrl ? (
                      <Image source={{ uri: category.imageUrl }} style={styles.categoryImage} />
                    ) : (
                      <Ionicons name="grid-outline" size={24} color={COLORS.orange} />
                    )}
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    <Text style={styles.categoryDescription}>
                      {category.description || 'No description'}
                    </Text>
                  </View>
                </View>

                {/* Product Count & Sort Order */}
                <View style={styles.categoryMeta}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Products</Text>
                    <Text style={styles.metaValue}>{category.productCount || 0}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Sort Order</Text>
                    <Text style={styles.metaValue}>#{category.sortOrder || category.displayOrder || 0}</Text>
                  </View>
                </View>

                {/* Actions: Toggle + Edit/Delete */}
                <View style={styles.actionRow}>
                  <Switch
                    value={category.isActive}
                    onValueChange={() => toggleCategoryStatus(category._id || category.id!, category.isActive)}
                    trackColor={{ false: COLORS.border, true: COLORS.green }}
                    thumbColor={COLORS.white}
                  />
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: COLORS.lightGray }]}
                      onPress={() => deleteCategory(category._id || category.id!)}
                    >
                      <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: COLORS.lightGray }]}
                      onPress={() => editCategory(category)}
                    >
                      <Ionicons name="create-outline" size={20} color={COLORS.blue} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="grid-outline" size={64} color={COLORS.border} />
              <Text style={styles.emptyText}>No categories found</Text>
              {loading && <Text style={styles.loadingText}>Loading...</Text>}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity 
        style={[
          styles.fab,
          { bottom: getSpacing(22) + insets.bottom }
        ]}
        onPress={() => {
          // @ts-ignore
          navigation.navigate('AddCategory');
        }}
      >
        <Ionicons name="add" size={28} color={COLORS.white} />
      </TouchableOpacity>

      {/* Bottom Navigation */}
      <AdminBottomNavigation onMorePress={() => setShowMoreMenu(true)} />

      {/* Profile Menu Modal */}
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
                  // @ts-ignore
                  navigation.navigate(item.screen);
                }}
              >
                <Ionicons name={item.icon as any} size={24} color={COLORS.orange} />
                <Text style={styles.menuItemText}>{item.name}</Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.border} />
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
    backgroundColor: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: getSpacing(4),
    paddingTop: getSpacing(3),
  },
  statsRow: {
    flexDirection: 'row',
    gap: getSpacing(2.5),
    marginBottom: getSpacing(4),
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: getSpacing(3),
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: getSpacing(1),
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  section: {
    marginBottom: getSpacing(4),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginBottom: getSpacing(3),
  },
  categoryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: getSpacing(3),
    marginBottom: getSpacing(3),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getSpacing(3),
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getSpacing(3),
  },
  categoryImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginBottom: getSpacing(0.5),
  },
  categoryDescription: {
    fontSize: 13,
    color: COLORS.lightText,
  },
  categoryMeta: {
    flexDirection: 'row',
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    padding: getSpacing(2),
    marginBottom: getSpacing(3),
  },
  metaItem: {
    flex: 1,
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 11,
    color: COLORS.lightText,
    marginBottom: getSpacing(0.5),
  },
  metaValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.darkText,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: getSpacing(2),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: getSpacing(2),
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: getSpacing(15),
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.lightText,
    marginTop: getSpacing(4),
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.lightText,
    marginTop: getSpacing(2),
  },
  fab: {
    position: 'absolute',
    right: getSpacing(4),
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.orange,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
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
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: getSpacing(5),
    paddingBottom: getSpacing(10),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getSpacing(5),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.darkText,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: getSpacing(4),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.darkText,
    marginLeft: getSpacing(4),
  },
  profileModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: getSpacing(20),
    paddingRight: getSpacing(5),
  },
  profileMenu: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    width: 220,
    shadowColor: COLORS.darkText,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  profileMenuHeader: {
    alignItems: 'center',
    padding: getSpacing(5),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  profileMenuImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: getSpacing(2.5),
  },
  profileMenuName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.darkText,
  },
  profileMenuEmail: {
    fontSize: 12,
    color: COLORS.lightText,
    marginTop: getSpacing(0.5),
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: getSpacing(3.5),
    paddingHorizontal: getSpacing(4),
  },
  profileMenuItemText: {
    fontSize: 14,
    color: COLORS.darkText,
    marginLeft: getSpacing(3),
  },
  profileMenuDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: getSpacing(4),
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
