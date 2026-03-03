import React, { useState, useEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
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

type CategoryTab = 'all' | 'food' | 'drinks' | 'desserts';

interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string | { _id: string; name: string };
  isAvailable: boolean;
  imageUrl?: string;
  hasSizes?: boolean;
  preparationTime?: number;
}

export default function AdminProductsScreen() {
  const navigation = useNavigation();
  const { currencySymbol } = useSettings();
  const { t } = useLocalization();
  const insets = useSafeAreaInsets();
  const { userRole, profileImage } = useUserData();
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeTab, setActiveTab] = useState<CategoryTab>('all');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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

  useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    try {
      setLoading(true);
      console.log('🔍 [ADMIN PRODUCTS] Loading products...');
      const response = await api.get('/menu/admin/products');
      console.log('🔍 [ADMIN PRODUCTS] API Response:', response);
      console.log('🔍 [ADMIN PRODUCTS] Response success:', response.success);
      
      if (response.success) {
        const products = response.data.products || [];
        console.log('🔍 [ADMIN PRODUCTS] Loaded products:', products.length);
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
  };

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
              const response = await api.delete(`/products/${itemId}`);
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

  const getFilteredItems = () => {
    if (activeTab === 'all') return menuItems;
    return menuItems.filter(item => {
      const categoryName = getCategoryName(item.category).toLowerCase();
      if (activeTab === 'food') return categoryName.includes('food') || categoryName.includes('burger') || categoryName.includes('pasta') || categoryName.includes('main') || categoryName.includes('meal');
      if (activeTab === 'drinks') return categoryName.includes('drink') || categoryName.includes('beverage') || categoryName.includes('juice') || categoryName.includes('soda');
      if (activeTab === 'desserts') return categoryName.includes('dessert') || categoryName.includes('sweet') || categoryName.includes('cake') || categoryName.includes('ice cream');
      return true;
    });
  };

  const renderTab = (tab: CategoryTab, label: string) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity
        style={[
          styles.tab, 
          isActive ? styles.tabActive : styles.tabInactive
        ]}
        onPress={() => setActiveTab(tab)}
      >
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const filteredItems = getFilteredItems();

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
        title={t('nav.menu')}
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
        <View style={styles.tabsContainer}>
          {renderTab('all', 'All')}
          {renderTab('food', 'Food')}
          {renderTab('drinks', 'Drinks')}
          {renderTab('desserts', 'Desserts')}
        </View>

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
                  </View>
                  
                  {/* Toggle Switch */}
                  <Switch
                    value={item.isAvailable}
                    onValueChange={() => toggleItemAvailability(item._id, item.isAvailable)}
                    trackColor={{ false: COLORS.border, true: COLORS.green }}
                    thumbColor={COLORS.white}
                  />
                </View>

                {/* Price and Edit/Delete Actions */}
                <View style={styles.itemFooter}>
                  <Text style={styles.itemPrice}>{currencySymbol}{(item.price || 0).toFixed(2)}</Text>
                  
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
                  navigation.navigate(item.screen as any);
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
        onLogout={() => navigation.navigate('Welcome' as any)}
        onChangePassword={() => navigation.navigate('ChangePassword' as any)}
      />

      {/* Bottom Navigation */}
      <AdminBottomNavigation onMorePress={() => setShowMoreMenu(true)} />
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
    flexDirection: 'row',
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
