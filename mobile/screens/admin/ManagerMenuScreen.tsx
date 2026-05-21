import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Image,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../../context/SettingsContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSpacing } from '../../utils/responsive';
import ResponsiveHeader from '../../components/layout/ResponsiveHeader';
import ProfileMenu from '../../components/common/ProfileMenu';
import AdminBottomNavigation from '../../components/navigation/AdminBottomNavigation';
import { useLocalization } from '../../context/LocalizationContext';
import { useUserData } from '../../hooks/useUserData';
import { COLORS } from '../../constants/colors';

interface Category {
  _id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  products: Product[];
}

interface CategoryOption {
  _id: string;
  name: string;
  productCount?: number;
  displayOrder?: number;
}

interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  effectivePrice?: number;
  imageUrl?: string;
  isAvailable: boolean;
  hasSizes?: boolean;
  productSizes?: Array<{
    price: number;
    isDefault?: boolean;
    size?: {
      name?: string;
    };
  }>;
  category?: {
    _id?: string;
    name: string;
  };
  // Branch activation fields
  isActivatedForBranch?: boolean;
  branchActivationId?: string | null;
}

const getDisplayPrice = (item: Product): number => {
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

export default function ManagerMenuScreen() {
  const navigation = useNavigation();
  const { currencySymbol } = useSettings();
  const { t } = useLocalization();
  const insets = useSafeAreaInsets();
  const { profileImage } = useUserData();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [assignedBranch, setAssignedBranch] = useState<{_id?: string; name?: string}>({});
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const loadMenu = useCallback(async (branchIdOverride?: string) => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.append('page', '1');
      params.append('limit', '1000');
      const branchId = branchIdOverride || assignedBranch._id;
      if (branchId) {
        params.append('activationBranchId', branchId);
      }

      const [productsResponse, categoriesResponse] = await Promise.all([
        api.get(`/menu/admin/products?${params.toString()}`),
        api.get('/menu/admin/categories'),
      ]);
      console.log('[ManagerMenu] Admin products response:', productsResponse);

      if (categoriesResponse.success) {
        const categoryList = categoriesResponse.data?.categories || categoriesResponse.data || [];
        const normalizedCategories = (Array.isArray(categoryList) ? categoryList : [])
          .map((category: any) => ({
            _id: String(category?._id || ''),
            name: String(category?.name || 'Uncategorized'),
            productCount:
              typeof category?.productCount === 'number' ? category.productCount : undefined,
            displayOrder:
              typeof category?.displayOrder === 'number' ? category.displayOrder : undefined,
          }))
          .filter((category: CategoryOption) => category._id);

        normalizedCategories.sort((a, b) => {
          const orderA = typeof a.displayOrder === 'number' ? a.displayOrder : Number.MAX_SAFE_INTEGER;
          const orderB = typeof b.displayOrder === 'number' ? b.displayOrder : Number.MAX_SAFE_INTEGER;
          if (orderA !== orderB) {
            return orderA - orderB;
          }
          return a.name.localeCompare(b.name);
        });

        setCategoryOptions(normalizedCategories);
      }

      if (productsResponse.success) {
        const products: Product[] = productsResponse.data?.products || [];

        const byCategory = new Map<string, Category>();
        for (const product of products) {
          const categoryData: any = product?.category;
          const categoryId = String(
            typeof categoryData === 'string'
              ? categoryData
              : categoryData?._id || 'uncategorized'
          ).trim();
          const categoryName =
            typeof categoryData === 'string'
              ? 'Category'
              : categoryData?.name || 'Uncategorized';

          if (!byCategory.has(categoryId)) {
            byCategory.set(categoryId, {
              _id: String(categoryId),
              name: categoryName,
              products: [],
            });
          }
          byCategory.get(categoryId)!.products.push(product);
        }

        const grouped = Array.from(byCategory.values())
          .map((category) => ({
            ...category,
            products: category.products.filter((product) => !!product && !!product._id),
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        setCategories(grouped);
      }
    } catch (error) {
      console.error('Error loading menu:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [assignedBranch._id]);

  const loadBranchAndMenu = useCallback(async () => {
    try {
      let branchId = assignedBranch._id || '';
      const stored = await AsyncStorage.getItem('userData');
      if (stored) {
        const parsed = JSON.parse(stored);
        const branchData = parsed.assignedBranch || parsed.branch;
        if (branchData) {
          branchId = branchData._id || branchData.branchId || parsed.branchId || '';
          setAssignedBranch({
            _id: branchId,
            name: branchData.name || branchData.branchName || 'My Branch',
          });
        }
      }

      await loadMenu(branchId);
    } catch (error) {
      console.error('Error loading branch:', error);
    }
  }, [assignedBranch._id, loadMenu]);

  useFocusEffect(
    useCallback(() => {
      console.log('🚀 MANAGER MENU SCREEN LOADED (cards+toggle build)');
      loadBranchAndMenu();
    }, [loadBranchAndMenu])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBranchAndMenu();
  };

  useEffect(() => {
    if (selectedCategoryId !== 'all' && !categoryOptions.some((category) => category._id === selectedCategoryId)) {
      setSelectedCategoryId('all');
    }
  }, [categoryOptions, selectedCategoryId]);

  // Toggle branch activation for branch managers
  const toggleBranchActivation = async (productId: string, currentStatus: boolean) => {
    if (!assignedBranch._id) {
      Alert.alert('Error', 'No branch assigned');
      return;
    }
    try {
      console.log('[ManagerMenu] Toggling product:', productId, 'current:', currentStatus);
      const response = await api.post(`/menu/admin/products/${productId}/toggle-activation`, {
        branchId: assignedBranch._id
      });
      console.log('[ManagerMenu] Response:', response);

      if (response.success) {
        // Reload menu to reflect changes
        await loadMenu();
      } else {
        Alert.alert('Error', 'Failed to update activation');
      }
    } catch (error) {
      console.error('[ManagerMenu] Error:', error);
      Alert.alert('Error', 'Failed to update activation');
    }
  };

  const getDefaultFoodImage = (name: string) => {
    if (name?.toLowerCase().includes('burger')) 
      return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&h=200&fit=crop';
    if (name?.toLowerCase().includes('pasta') || name?.toLowerCase().includes('spaghetti')) 
      return 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=200&h=200&fit=crop';
    if (name?.toLowerCase().includes('drink') || name?.toLowerCase().includes('lemonade')) 
      return 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=200&h=200&fit=crop';
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop';
  };

  const totalProducts = categories.reduce((sum, cat) => sum + cat.products.length, 0);
  const visibleCategories =
    selectedCategoryId === 'all'
      ? categories
      : categories.filter(
          (category) => String(category._id).trim() === String(selectedCategoryId).trim()
        );

  // Get parent tab navigation for bottom nav
  const tabNavigation = navigation.getParent();

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      {/* Item Row with Image and Info */}
      <View style={styles.itemRow}>
        <Image
          source={{ uri: item.imageUrl ? `${api.getBaseURL()}${item.imageUrl}` : getDefaultFoodImage(item.name) }}
          style={styles.productImage}
        />
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.productDescription} numberOfLines={2}>
            {item.description || 'Delicious fresh made with premium ingredients'}
          </Text>
          {/* Show activation badge */}
          <View style={[styles.activationBadge, item.isActivatedForBranch ? styles.activatedBadge : styles.deactivatedBadge]}>
            <Text style={styles.activationBadgeText}>
              {item.isActivatedForBranch ? '✓ Activated' : '○ Not Activated'}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.cardActionButton, item.isActivatedForBranch ? styles.cardDeactivateButton : styles.cardActivateButton]}
          onPress={() => toggleBranchActivation(item._id, item.isActivatedForBranch || false)}
          activeOpacity={0.8}
        >
          <Text style={styles.cardActionButtonText}>
            {item.isActivatedForBranch ? 'Deactivate' : 'Activate'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Price Footer */}
      <View style={styles.itemFooter}>
        <Text style={styles.productPrice}>
          {currencySymbol}{getDisplayPrice(item).toFixed(2)}
        </Text>
        <View style={[styles.availabilityBadge, item.isAvailable ? styles.available : styles.unavailable]}>
          <Text style={styles.availabilityText}>
            {item.isAvailable ? 'Available' : 'Unavailable'}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderCategory = ({ item }: { item: Category }) => (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryName}>{item.name}</Text>
        <Text style={styles.productCount}>{item.products.length} items</Text>
      </View>
      <FlatList
        data={item.products}
        renderItem={renderProduct}
        keyExtractor={(product) => product._id}
        scrollEnabled={false}
      />
    </View>
  );

  const moreMenuItems = [
    { name: t('nav.notifications'), icon: 'notifications-outline', screen: 'AdminNotifications' },
    { name: 'Table Assignment', icon: 'grid-outline', screen: 'TableAssignment' },
    { name: t('nav.categories'), icon: 'grid-outline', screen: 'AdminCategories' },
    { name: t('products.title'), icon: 'restaurant-outline', screen: 'AdminProducts' },
    { name: 'Banner Management', icon: 'image-outline', screen: 'BannerManagement' },
    { name: t('nav.coupons'), icon: 'ticket-outline', screen: 'AdminCoupons' },
    { name: 'Deals', icon: 'pricetag-outline', screen: 'AdminDeals' },
    { name: 'Product Size', icon: 'resize-outline', screen: 'AdminProductSizes' },
    { name: t('nav.reports'), icon: 'bar-chart-outline', screen: 'AdminReports' },
  ];

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      <ResponsiveHeader
        title="Menu"
        notificationCount={0}
        profileImage={profileImage}
        onNotificationPress={() => {
          // @ts-ignore
          navigation.navigate('AdminNotifications');
        }}
        onProfilePress={() => setShowProfileMenu(true)}
      />

      {/* Branch Name Display */}
      {assignedBranch.name && (
        <View style={styles.branchBar}>
          <Ionicons name="business-outline" size={18} color={COLORS.orange} />
          <Text style={styles.branchName}>{assignedBranch.name}</Text>
          <Text style={styles.productTotal}>{totalProducts} products</Text>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedCategoryId === 'all' && styles.filterChipActive,
          ]}
          onPress={() => setSelectedCategoryId('all')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedCategoryId === 'all' && styles.filterChipTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {categoryOptions.map((category) => (
          <TouchableOpacity
            key={category._id}
            style={[
              styles.filterChip,
              selectedCategoryId === category._id && styles.filterChipActive,
            ]}
            onPress={() => setSelectedCategoryId(category._id)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedCategoryId === category._id && styles.filterChipTextActive,
              ]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading menu...</Text>
        </View>
      ) : categories.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="restaurant-outline" size={64} color={COLORS.border} />
          <Text style={styles.emptyText}>No products activated</Text>
          <Text style={styles.emptySubtext}>
            Go to Products tab to activate products for your branch
          </Text>
          <TouchableOpacity 
            style={styles.activateButton}
            onPress={() => {
              // @ts-ignore
              navigation.navigate('AdminProducts');
            }}
          >
            <Text style={styles.activateButtonText}>Go to Products</Text>
          </TouchableOpacity>
        </View>
      ) : visibleCategories.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="options-outline" size={64} color={COLORS.border} />
          <Text style={styles.emptyText}>No products found</Text>
          <Text style={styles.emptySubtext}>
            This category does not have any activated products right now
          </Text>
        </View>
      ) : (
        <FlatList
          data={visibleCategories}
          renderItem={renderCategory}
          keyExtractor={(category) => category._id}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: getSpacing(25) + insets.bottom }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

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

      <ProfileMenu
        visible={showProfileMenu}
        onClose={() => setShowProfileMenu(false)}
        onLogout={() => {
          // @ts-ignore
          navigation.navigate('Welcome');
        }}
        navigation={navigation}
      />

      <AdminBottomNavigation onMorePress={() => setShowMoreMenu(true)} tabNavigation={tabNavigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  branchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFF3E0',
    gap: 8,
  },
  branchName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.orange,
  },
  productTotal: {
    fontSize: 12,
    color: COLORS.lightText,
  },
  filterScroll: {
    marginTop: getSpacing(1),
  },
  filterContent: {
    paddingHorizontal: getSpacing(4),
    paddingVertical: getSpacing(3),
    gap: getSpacing(2),
  },
  filterChip: {
    paddingHorizontal: getSpacing(3),
    paddingVertical: getSpacing(1.75),
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
  },
  filterChipActive: {
    backgroundColor: COLORS.orange,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.lightText,
  },
  filterChipTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: getSpacing(4),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.lightText,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.darkText,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.lightText,
    marginTop: 8,
    textAlign: 'center',
  },
  activateButton: {
    marginTop: 20,
    backgroundColor: COLORS.orange,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  activateButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
  },
  categorySection: {
    marginBottom: getSpacing(4),
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: getSpacing(3),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.darkText,
  },
  productCount: {
    fontSize: 12,
    color: COLORS.lightText,
  },
  productCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: getSpacing(3),
    marginTop: getSpacing(2),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: getSpacing(3),
  },
  cardActionButton: {
    minWidth: 92,
    height: 34,
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardActivateButton: {
    backgroundColor: COLORS.orange,
  },
  cardDeactivateButton: {
    backgroundColor: '#D32F2F',
  },
  cardActionButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 12,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkText,
  },
  productDescription: {
    fontSize: 12,
    color: COLORS.lightText,
    marginTop: 4,
  },
  activationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  activatedBadge: {
    backgroundColor: '#e8f5e9',
  },
  deactivatedBadge: {
    backgroundColor: '#fff3e0',
  },
  activationBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.darkText,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.orange,
  },
  availabilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  available: {
    backgroundColor: '#e8f5e9',
  },
  unavailable: {
    backgroundColor: '#ffebee',
  },
  availabilityText: {
    fontSize: 11,
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
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A2E',
    marginLeft: 16,
  },
});
