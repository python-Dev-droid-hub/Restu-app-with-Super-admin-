import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StatusBar,
  Image,
  Switch,
  Dimensions,
  Modal,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../../context/SettingsContext';
import { useLocalization } from '../../context/LocalizationContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUserData } from '../../hooks/useUserData';

// Components
import ResponsiveHeader from '../../components/layout/ResponsiveHeader';
import ProfileMenu from '../../components/common/ProfileMenu';
import AdminBottomNavigation from '../../components/navigation/AdminBottomNavigation';

// Utils & Constants
import { getSpacing } from '../../utils/responsive';
import { COLORS } from '../../constants/colors';

interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  effectivePrice?: number;
  category: string | { _id: string; name: string };
  isAvailable: boolean;
  imageUrl?: string;
  hasSizes?: boolean;
  productSizes?: Array<{
    price: number;
    isDefault?: boolean;
    size?: {
      _id?: string;
      id?: string;
      size_name?: string;
      name?: string;
    };
  }>;
  preparationTime?: number;
  // Branch activation fields
  isActivatedForBranch?: boolean;
  branchActivationId?: string | null;
}

interface ProductCategory {
  _id: string;
  name: string;
  productCount?: number;
  displayOrder?: number;
}

const getDisplayPrice = (item: MenuItem): number => {
  if (typeof item.effectivePrice === 'number' && !Number.isNaN(item.effectivePrice)) {
    return item.effectivePrice;
  }

  const sizes = item.productSizes;
  if (item.hasSizes && Array.isArray(sizes) && sizes.length > 0) {
    const defaultSize = sizes.find((s) => s?.isDefault);
    const candidate = defaultSize?.price ?? Math.min(...sizes.map((s) => s?.price ?? Number.POSITIVE_INFINITY));
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
  }

  return typeof item.price === 'number' && !Number.isNaN(item.price) ? item.price : 0;
};

export default function AdminProductsScreen() {
  const navigation = useNavigation();
  const { currencySymbol } = useSettings();
  const { t } = useLocalization();
  const insets = useSafeAreaInsets();
  const { userRole, profileImage } = useUserData();
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<ProductCategory[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState('all');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [assignedBranch, setAssignedBranch] = useState<{_id?: string; name?: string}>({});

  // Load assigned branch for branch managers
  useEffect(() => {
    const loadBranch = async () => {
      if (userRole === 'BRANCH_MANAGER') {
        const stored = await AsyncStorage.getItem('userData');
        if (stored) {
          const parsed = JSON.parse(stored);
          const branchData = parsed.assignedBranch || parsed.branch;
          if (branchData) {
            setAssignedBranch({
              _id: branchData._id || branchData.branchId || parsed.branchId,
              name: branchData.name || branchData.branchName || 'My Branch'
            });
          }
        }
      }
    };
    loadBranch();
  }, [userRole]);

  const moreMenuItems = [
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

  const loadCategories = useCallback(async () => {
    try {
      const response = await api.get('/menu/admin/categories');
      if (response.success) {
        const categoryList = response.data?.categories || response.data || [];
        const normalized = (Array.isArray(categoryList) ? categoryList : [])
          .map((category: any) => ({
            _id: String(category?._id || ''),
            name: String(category?.name || 'Uncategorized'),
            productCount:
              typeof category?.productCount === 'number' ? category.productCount : undefined,
            displayOrder:
              typeof category?.displayOrder === 'number' ? category.displayOrder : undefined,
          }))
          .filter((category: ProductCategory) => category._id);

        normalized.sort((a, b) => {
          const orderA = typeof a.displayOrder === 'number' ? a.displayOrder : Number.MAX_SAFE_INTEGER;
          const orderB = typeof b.displayOrder === 'number' ? b.displayOrder : Number.MAX_SAFE_INTEGER;
          if (orderA !== orderB) {
            return orderA - orderB;
          }
          return a.name.localeCompare(b.name);
        });

        setCategoryOptions(normalized);
      }
    } catch (error) {
      console.error('🔍 [ADMIN PRODUCTS] Error loading categories:', error);
    }
  }, []);

  const loadMenuItems = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔍 [ADMIN PRODUCTS] Loading products...');
      const response = await api.get('/menu/admin/products');
      console.log('🔍 [ADMIN PRODUCTS] API Response:', response);
      console.log('🔍 [ADMIN PRODUCTS] Response success:', response.success);
      
      if (response.success) {
        const products = response.data.products || [];
        console.log('🔍 [ADMIN PRODUCTS] Loaded products:', products.length);
        if (products.length > 0) {
          const sample = products.find((p: any) => p?.hasSizes) || products[0];
          console.log('🔍 [ADMIN PRODUCTS] Sample product for price debug:', {
            id: sample?._id,
            name: sample?.name,
            price: sample?.price,
            hasSizes: sample?.hasSizes,
            effectivePrice: sample?.effectivePrice,
            productSizesCount: Array.isArray(sample?.productSizes) ? sample.productSizes.length : 0,
            productSizes: sample?.productSizes
          });
        }
        setMenuItems(products);
      } else {
        console.log('🔍 [ADMIN PRODUCTS] API call failed');
        Alert.alert('Error', 'Failed to load menu items');
      }
    } catch (error) {
      console.error('🔍 [ADMIN PRODUCTS] Error loading products:', error);
      Alert.alert('Error', 'Failed to load menu items');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    await Promise.all([loadMenuItems(), loadCategories()]);
  }, [loadCategories, loadMenuItems]);

  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [refreshData])
  );

  const toggleItemAvailability = async (itemId: string, currentStatus: boolean) => {
    try {
      console.log('🔍 [PRODUCT TOGGLE] Starting toggle for product:', itemId, 'current status:', currentStatus);
      const response = await api.put(`/menu/admin/products/${itemId}`, {
        isAvailable: !currentStatus
      });
      console.log('🔍 [PRODUCT TOGGLE] API response:', response);

      if (response.success) {
        console.log('🔍 [PRODUCT TOGGLE] Success - reloading products');
        loadMenuItems();
      } else {
        console.log('🔍 [PRODUCT TOGGLE] API call failed:', response);
      }
    } catch (error) {
      console.error('🔍 [PRODUCT TOGGLE] Error:', error);
      Alert.alert('Error', 'Failed to update item availability');
    }
  };

  // Toggle branch activation for branch managers
  const toggleBranchActivation = async (productId: string, currentStatus: boolean) => {
    if (!assignedBranch._id) {
      Alert.alert('Error', 'No branch assigned');
      return;
    }
    try {
      console.log('🔍 [BRANCH ACTIVATION] Toggling product:', productId, 'current:', currentStatus);
      const response = await api.post(`/menu/admin/products/${productId}/toggle-activation`, {
        branchId: assignedBranch._id
      });
      console.log('🔍 [BRANCH ACTIVATION] Response:', response);

      if (response.success) {
        loadMenuItems();
      } else {
        Alert.alert('Error', 'Failed to update activation');
      }
    } catch (error) {
      console.error('🔍 [BRANCH ACTIVATION] Error:', error);
      Alert.alert('Error', 'Failed to update activation');
    }
  };

  const deleteMenuItem = async (itemId: string) => {
    Alert.alert(
      'Delete Menu Item',
      'Are you sure you want to delete this menu item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete(`/menu/admin/products/${itemId}`);
              if (response.success) {
                Alert.alert('Success', 'Menu item deleted');
                loadMenuItems();
              }
            } catch (error) {
              console.error('Error deleting menu item:', error);
              Alert.alert('Error', 'Failed to delete menu item');
            }
          },
        },
      ]
    );
  };

  const getCategoryName = (category: string | { _id: string; name: string } | undefined) => {
    if (!category) return 'Uncategorized';
    if (typeof category === 'string') return category;
    return category?.name || 'Uncategorized';
  };

  const getCategoryId = (category: string | { _id: string; name: string } | undefined) => {
    if (!category) return 'uncategorized';
    if (typeof category === 'string') return category;
    return category?._id || 'uncategorized';
  };

  useEffect(() => {
    if (activeCategoryId !== 'all' && !categoryOptions.some((category) => category._id === activeCategoryId)) {
      setActiveCategoryId('all');
    }
  }, [activeCategoryId, categoryOptions]);

  const getFilteredItems = () => {
    if (activeCategoryId === 'all') return menuItems;
    return menuItems.filter((item) => getCategoryId(item.category) === activeCategoryId);
  };

  const renderTab = (categoryId: string, label: string) => {
    const isActive = activeCategoryId === categoryId;
    return (
      <TouchableOpacity
        style={[
          styles.tab, 
          isActive ? styles.tabActive : styles.tabInactive
        ]}
        onPress={() => setActiveCategoryId(categoryId)}
      >
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const filteredItems = getFilteredItems();

  // Get parent tab navigation for bottom nav
  const tabNavigation = navigation.getParent();

  const getDefaultFoodImage = (name: string) => {
    // Return different food images based on item name/type
    if (name?.toLowerCase().includes('burger')) 
      return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&h=200&fit=crop';
    if (name?.toLowerCase().includes('pasta') || name?.toLowerCase().includes('spaghetti')) 
      return 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=200&h=200&fit=crop';
    if (name?.toLowerCase().includes('drink') || name?.toLowerCase().includes('lemonade')) 
      return 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=200&h=200&fit=crop';
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop';
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      {/* Responsive Header */}
      <ResponsiveHeader
        title={t('products.title')}
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
          <RefreshControl refreshing={loading} onRefresh={loadMenuItems} />
        }
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: getSpacing(25) + insets.bottom }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
          contentContainerStyle={styles.tabsContent}
        >
          {renderTab('all', 'All')}
          {categoryOptions.map((category) => renderTab(category._id, category.name))}
        </ScrollView>

        <View style={styles.menuContainer}>
          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => (
              <View key={item._id} style={styles.menuCard}>
                {/* Item Row with Image and Info */}
                <View style={styles.itemRow}>
                  <Image
                    source={{ uri: item.imageUrl ? `${api.getBaseURL()}${item.imageUrl}` : getDefaultFoodImage(item.name) }}
                    style={styles.foodImage}
                  />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemDescription} numberOfLines={1}>
                      {item.description || 'Delicious fresh made with premium ingredients'}
                    </Text>
                    {/* Show activation badge for branch managers */}
                    {userRole === 'BRANCH_MANAGER' && (
                      <View style={[styles.activationBadge, item.isActivatedForBranch ? styles.activatedBadge : styles.deactivatedBadge]}>
                        <Text style={styles.activationBadgeText}>
                          {item.isActivatedForBranch ? '✓ Activated' : '○ Not Activated'}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  {/* Toggle Switch - For Branch Managers: Activation, For Admins: Availability */}
                  {userRole === 'BRANCH_MANAGER' ? (
                    <Switch
                      value={item.isActivatedForBranch || false}
                      onValueChange={() => toggleBranchActivation(item._id, item.isActivatedForBranch || false)}
                      trackColor={{ false: COLORS.border, true: COLORS.orange }}
                      thumbColor={COLORS.white}
                    />
                  ) : (
                    <Switch
                      value={item.isAvailable}
                      onValueChange={() => toggleItemAvailability(item._id, item.isAvailable)}
                      trackColor={{ false: COLORS.border, true: COLORS.green }}
                      thumbColor={COLORS.white}
                    />
                  )}
                </View>

                {/* Price and Edit/Delete Actions */}
                <View style={styles.itemFooter}>
                  <Text style={styles.itemPrice}>{currencySymbol}{getDisplayPrice(item).toFixed(2)}</Text>
                  
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={[styles.iconBtn, styles.deleteBtn]}
                      onPress={() => deleteMenuItem(item._id)}
                    >
                      <Ionicons name="trash-outline" size={18} color={COLORS.white} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.iconBtn, styles.editBtn]} onPress={() => {
                      // @ts-ignore
                      navigation.navigate('AddProduct', { product: item });
                    }}>
                      <Ionicons name="create-outline" size={18} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="restaurant-outline" size={64} color={COLORS.border} />
              <Text style={styles.emptyText}>No menu items found</Text>
              <Text style={styles.emptySubtext}>Add dishes to your menu to get started</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[
          styles.fab,
          { bottom: getSpacing(22) + insets.bottom }
        ]}
        onPress={() => {
          // @ts-ignore
          navigation.navigate('AddProduct');
        }}
      >
        <Ionicons name="add" size={28} color={COLORS.white} />
      </TouchableOpacity>

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
              <Text style={styles.modalTitle}>More Options</Text>
              <TouchableOpacity onPress={() => setShowMoreMenu(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            {moreMenuItems.map((item, index) => (
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

      {/* Bottom Navigation */}
      <AdminBottomNavigation onMorePress={() => setShowMoreMenu(true)} tabNavigation={tabNavigation} />
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
  },
  tabsContainer: {
    marginTop: getSpacing(1),
  },
  tabsContent: {
    paddingHorizontal: getSpacing(4),
    paddingVertical: getSpacing(3),
    gap: getSpacing(2),
  },
  tab: {
    paddingVertical: getSpacing(2),
    paddingHorizontal: getSpacing(3),
    borderRadius: 20,
  },
  tabInactive: {
    backgroundColor: COLORS.lightGray,
  },
  tabActive: {
    backgroundColor: COLORS.orange,
  },
  tabText: {
    fontSize: 14,
    color: COLORS.lightText,
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  menuContainer: {
    paddingHorizontal: getSpacing(4),
    paddingTop: getSpacing(3),
  },
  menuCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: getSpacing(3),
    marginBottom: getSpacing(3),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: getSpacing(3),
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.darkText,
    marginBottom: getSpacing(0.5),
  },
  itemDescription: {
    fontSize: 13,
    color: COLORS.lightText,
  },
  activationBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  activatedBadge: {
    backgroundColor: '#e8f5e9',
  },
  deactivatedBadge: {
    backgroundColor: '#ffebee',
  },
  activationBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: getSpacing(3),
    marginLeft: 68,
    paddingTop: getSpacing(2),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.darkText,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: getSpacing(2),
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    backgroundColor: COLORS.error,
  },
  editBtn: {
    backgroundColor: COLORS.blue,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: getSpacing(15),
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.darkText,
    marginTop: getSpacing(4),
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.lightText,
    marginTop: getSpacing(2),
    textAlign: 'center',
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
});
