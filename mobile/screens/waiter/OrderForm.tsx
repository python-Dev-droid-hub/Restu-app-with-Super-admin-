import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  TextInput,
  Image,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';
import { useSettings } from '../../context/SettingsContext';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

const COLORS = {
  primary: '#FF7A59',
  primaryLight: '#FFF0EB',
  background: '#F8F9FA',
  white: '#FFFFFF',
  text: '#1A1A2E',
  textMuted: '#8E8E93',
  border: '#E8E8E8',
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
};

interface Product {
  id: string;
  _id?: string;
  name: string;
  price: number;
  description?: string;
  image_url?: string;
  images?: string[];
  is_available?: boolean;
  has_sizes?: boolean;
  category_id?: string;
  sizes?: ProductSize[];
}

interface ProductSize {
  id: string;
  size_id: string;
  size_name: string;
  price: number;
}

interface Category {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  products?: Product[];
}

interface RestaurantTable {
  id: string;
  table_number: string;
  seating_capacity: number;
  status: string;
  branch_id?: string;
  branchId?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: ProductSize;
  specialInstructions?: string;
}

interface UserData {
  id: string;
  _id?: string;
  display_name?: string;
  assigned_branch_id?: string;
  branch_id?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: 'Preparing' | 'Completed' | 'Delayed' | 'Cancelled';
  total: number;
  timeAgo: string;
  items: number;
}

export default function OrderForm() {
  const navigation = useNavigation();
  const { formatPrice, currencySymbol } = useSettings();

  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [orderFilter, setOrderFilter] = useState<'All' | 'Active' | 'Preparing' | 'Delayed' | 'Cancelled'>('All');
  const [showSpecialRequestModal, setShowSpecialRequestModal] = useState(false);

  useEffect(() => {
    loadData();
    loadRecentOrders();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get user data from AsyncStorage first
      const userDataRaw = await AsyncStorage.getItem('userData');
      let user = null;
      if (userDataRaw) {
        user = JSON.parse(userDataRaw);
      }

      // Fetch full user profile to get branch_id
      try {
        const profileResponse = await api.get('/users/profile');
        if (profileResponse.success && profileResponse.data) {
          const profile = profileResponse.data;
          user = { ...user, ...profile };
        }
      } catch (profileError) {
        console.log('Could not fetch profile, using stored data');
      }

      if (user) {
        setUserData({
          id: user.id || user._id,
          _id: user._id,
          display_name: user.display_name || user.name,
          assigned_branch_id: user.assigned_branch_id || user.branch_id || user.branchId,
          branch_id: user.branch_id || user.branchId,
        });
      }

      // Load tables
      const tablesResponse = await api.get('/tables');
      console.log('Tables response:', JSON.stringify(tablesResponse.data?.[0], null, 2));
      if (tablesResponse.success && tablesResponse.data) {
        const rawTables = tablesResponse.data.tables || tablesResponse.data || [];
        console.log('First table raw:', JSON.stringify(rawTables[0], null, 2));
        const formattedTables: RestaurantTable[] = rawTables.map((t: any) => ({
          id: String(t.id || t._id),
          table_number: String(t.table_number || t.tableNumber || t.number || '1'),
          seating_capacity: t.seating_capacity || t.seatingCapacity || 4,
          status: t.status || 'AVAILABLE',
          branch_id: t.branch?._id || t.branch?.id || t.branch_id || t.branchId,
          branchId: t.branch?._id || t.branch?.id || t.branchId || t.branch_id,
        }));
        console.log('First table formatted:', JSON.stringify(formattedTables[0], null, 2));
        setTables(formattedTables);
        
        // Set branch from first table if available
        if (formattedTables.length > 0 && formattedTables[0].branch_id) {
          setUserData(prev => prev ? { ...prev, branch_id: formattedTables[0].branch_id } : null);
        }
      }

      // Load menu/products
      const menuResponse = await api.get('/menu/menu');
      if (menuResponse.success && menuResponse.data) {
        // The /menu endpoint returns categories with products directly
        const rawCategories = menuResponse.data.categories || menuResponse.data || [];
        const formattedCategories: Category[] = rawCategories.map((cat: any) => ({
          id: String(cat._id || cat.id),
          name: cat.name,
          description: cat.description,
          products: (cat.products || cat.items || []).map((p: any) => ({
            id: String(p._id || p.id),
            name: p.name,
            price: p.price,
            description: p.description,
            image_url: p.imageUrl ? `${api.getBaseURL()}${p.imageUrl}` : (p.image_url || p.images?.[0]),
            images: p.images,
            is_available: p.is_available ?? p.isAvailable ?? true,
            has_sizes: p.has_sizes ?? p.hasSizes ?? false,
            category_id: p.category_id || p.category,
            sizes: (p.sizes || p.productSizes || []).map((s: any) => ({
              id: String(s._id || s.id),
              size_id: s.size_id || s.sizeId,
              size_name: s.size_name || s.sizeName || s.name,
              price: s.price,
            })),
          })),
        }));
        setCategories(formattedCategories);
        if (formattedCategories.length > 0) {
          setSelectedCategory(formattedCategories[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load menu data');
    } finally {
      setLoading(false);
    }
  };

  const loadRecentOrders = async () => {
    try {
      const response = await api.get('/orders/waiter/my-orders');
      if (response.success && response.data) {
        const orders = response.data.orders || response.data || [];
        const formattedOrders: Order[] = orders.map((o: any) => ({
          id: o._id || o.id,
          orderNumber: `#${(o._id || o.id || '').slice(-5)}`,
          status: o.status === 'PENDING' ? 'Preparing' : 
                  o.status === 'READY' ? 'Completed' :
                  o.status === 'CANCELLED' ? 'Cancelled' : 'Preparing',
          total: o.total_amount || o.total || 0,
          timeAgo: o.createdAt ? formatTimeAgo(o.createdAt) : 'Just now',
          items: o.items?.length || 0,
        }));
        setRecentOrders(formattedOrders);
      }
    } catch (error) {
      console.error('Error loading recent orders:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffHours / 24)} days ago`;
  };

  const getProductQuantity = (productId: string) => {
    const item = cart.find(item => item.product.id === productId);
    return item ? item.quantity : 0;
  };

  const addToCart = (product: Product, size?: ProductSize) => {
    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(
        item => item.product.id === product.id && item.selectedSize?.id === size?.id
      );

      if (existingIndex >= 0) {
        const updated = [...prevCart];
        updated[existingIndex].quantity += 1;
        return updated;
      }

      return [...prevCart, { product, quantity: 1, selectedSize: size }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.product.id === productId);
      if (existingIndex >= 0) {
        const updated = [...prevCart];
        if (updated[existingIndex].quantity > 1) {
          updated[existingIndex].quantity -= 1;
          return updated;
        } else {
          return prevCart.filter((_, i) => i !== existingIndex);
        }
      }
      return prevCart;
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
    } else {
      setCart(prevCart => {
        const existingIndex = prevCart.findIndex(item => item.product.id === productId);
        if (existingIndex >= 0) {
          const updated = [...prevCart];
          updated[existingIndex].quantity = quantity;
          return updated;
        }
        return prevCart;
      });
    }
  };

  const calculateTotal = useCallback(() => {
    return cart.reduce((total, item) => {
      const price = item.selectedSize?.price ?? item.product.price;
      return total + price * item.quantity;
    }, 0);
  }, [cart]);

  const handleSubmitOrder = async () => {
    if (!selectedTable) {
      Alert.alert('Select Table', 'Please select a table for this order');
      return;
    }

    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to your order');
      return;
    }

    if (!userData?.id) {
      Alert.alert('Error', 'User data not found. Please login again.');
      return;
    }

    const table = tables.find(t => t.id === selectedTable);
    
    // Get branch from table or userData
    const branchId = table?.branch_id || table?.branchId || userData?.branch_id || userData?.assigned_branch_id;
    console.log('Branch ID for order:', branchId, 'from table:', table?.branch_id, table?.branchId);
    
    if (!branchId) {
      Alert.alert('Error', 'Branch ID not found. Please contact admin.');
      return;
    }

    // Match server validation schema
    const orderData = {
      items: cart.map(item => ({
        menuItemId: item.product.id,
        quantity: item.quantity,
        customizations: item.product.has_sizes && item.selectedSize ? [{
          optionName: 'Size',
          optionValue: item.selectedSize.size_name,
          extraPrice: item.selectedSize.price - item.product.price,
        }] : [],
      })),
      restaurantId: branchId,
      orderType: 'DINE_IN',
      paymentMethod: 'cash',
      tableId: selectedTable,
      deliveryAddress: {
        street: `Table ${table?.table_number || '1'}`,
        city: 'Restaurant',
        state: 'Local',
        zipCode: '00000',
      },
      deliveryInstructions: specialInstructions || `Table order - Table #${table?.table_number}`,
    };
    
    console.log('Order data being sent:', JSON.stringify(orderData, null, 2));

    setSubmitting(true);

    try {
      const response = await api.post('/orders', orderData);

      if (response.success) {
        const orderId = response.data?.order?.id || response.data?.order?._id || response.data?.id || response.data?._id;
        
        Alert.alert('Order Created', `Order placed successfully! Order ID: ${orderId}`, [
          {
            text: 'OK',
            onPress: () => {
              setCart([]);
              setSpecialInstructions('');
              loadRecentOrders();
            },
          },
        ]);
        setCart([]);
        setSpecialInstructions('');
        setSelectedTable(null);
      } else {
        Alert.alert('Error', response.message || 'Failed to create order');
      }
    } catch (error: any) {
      console.error('Error creating order:', error);
      Alert.alert('Error', error?.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Preparing': return COLORS.warning;
      case 'Completed': return COLORS.success;
      case 'Delayed': return COLORS.danger;
      case 'Cancelled': return COLORS.textMuted;
      default: return COLORS.primary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Preparing': return 'time-outline';
      case 'Completed': return 'checkmark-circle';
      case 'Delayed': return 'alert-circle';
      case 'Cancelled': return 'close-circle';
      default: return 'time-outline';
    }
  };

  const renderProductItem = (product: Product) => {
    const quantity = getProductQuantity(product.id);
    const isAvailable = product.is_available !== false;
    
    // Get valid image URL - prepend base URL if needed
    let imageUrl = product.image_url;
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = `${api.getBaseURL()}${imageUrl}`;
    }
    const hasValidImage = imageUrl && imageUrl.startsWith('http');

    return (
      <View key={product.id} style={styles.productItem}>
        {hasValidImage ? (
          <Image 
            source={{ uri: imageUrl }} 
            style={styles.productImage}
            defaultSource={undefined}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Ionicons name="restaurant-outline" size={28} color={COLORS.primary} />
          </View>
        )}

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
          <Text style={styles.productPrice}>{formatPrice(product.price)}</Text>
          {product.description && (
            <Text style={styles.productDescription} numberOfLines={1}>
              {product.description}
            </Text>
          )}
        </View>

        <View style={styles.productRight}>
          <Text style={styles.productPriceLarge}>{formatPrice(product.price)}</Text>
          
          {quantity > 0 ? (
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityBtn}
                onPress={() => removeFromCart(product.id)}
              >
                <Ionicons name="remove" size={16} color={COLORS.primary} />
              </TouchableOpacity>
              
              <View style={styles.quantityBadge}>
                <Text style={styles.quantityText}>{quantity}</Text>
              </View>
              
              <TouchableOpacity
                style={styles.quantityBtn}
                onPress={() => isAvailable && addToCart(product)}
                disabled={!isAvailable}
              >
                <Ionicons name="add" size={16} color={COLORS.primary} />
              </TouchableOpacity>
              
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} style={styles.checkIcon} />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => isAvailable && addToCart(product)}
              disabled={!isAvailable}
            >
              <Ionicons name="add" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const filteredOrders = orderFilter === 'All' 
    ? recentOrders 
    : recentOrders.filter(o => o.status === orderFilter);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading menu...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentCategory = categories.find(c => c.id === selectedCategory);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = calculateTotal();

  return (
    <SafeAreaView style={[styles.container, { paddingTop: STATUSBAR_HEIGHT }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Get Order</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Ionicons name="close" size={28} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Table Selector */}
        <View style={styles.tableSection}>
          <Text style={styles.tableLabel}>Table #</Text>
          <TouchableOpacity
            style={styles.tableSelector}
            onPress={() => setShowTablePicker(true)}
          >
            <Text style={styles.tableNumber}>
              {selectedTable ? tables.find(t => t.id === selectedTable)?.table_number : 'Select'}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryTabsContainer}
          contentContainerStyle={styles.categoryTabsContent}
        >
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryTab,
                selectedCategory === cat.id && styles.categoryTabActive,
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text
                style={[
                  styles.categoryTabText,
                  selectedCategory === cat.id && styles.categoryTabTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Products List */}
        <View style={styles.productsContainer}>
          {currentCategory?.products
            ?.filter(product => product.is_available !== false)
            .map(product => renderProductItem(product))}
        </View>

        {/* Add Special Request Button */}
        <TouchableOpacity
          style={styles.specialRequestBtn}
          onPress={() => setShowSpecialRequestModal(true)}
        >
          <Ionicons name="sparkles" size={16} color={COLORS.primary} />
          <Text style={styles.specialRequestText}>Add Special Request</Text>
          <Ionicons name="add" size={20} color={COLORS.primary} />
        </TouchableOpacity>

        {/* Recent Orders Section - REMOVED as requested */}
        {/* Bottom Spacer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Cart Summary */}
      {totalItems > 0 && (
        <View style={styles.bottomCart}>
          <View style={styles.cartInfo}>
            <Text style={styles.cartItemCount}>{totalItems} items</Text>
            <Text style={styles.cartTotal}>{formatPrice(totalAmount)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.placeOrderBtn, submitting && styles.placeOrderBtnDisabled]}
            onPress={handleSubmitOrder}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.placeOrderText}>Place Order</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Table Picker Modal */}
      <Modal
        visible={showTablePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTablePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Table</Text>
              <TouchableOpacity onPress={() => setShowTablePicker(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.tableList}>
              {tables.filter(t => t.status === 'AVAILABLE' || t.status === 'OCCUPIED').map(table => (
                <TouchableOpacity
                  key={table.id}
                  style={[
                    styles.tableOption,
                    selectedTable === table.id && styles.tableOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedTable(table.id);
                    setShowTablePicker(false);
                  }}
                >
                  <View style={styles.tableOptionLeft}>
                    <Ionicons name="restaurant-outline" size={20} color={selectedTable === table.id ? COLORS.primary : COLORS.textMuted} />
                    <Text
                      style={[
                        styles.tableOptionText,
                        selectedTable === table.id && styles.tableOptionTextSelected,
                      ]}
                    >
                      Table {table.table_number}
                    </Text>
                  </View>
                  {selectedTable === table.id && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Special Request Modal */}
      <Modal
        visible={showSpecialRequestModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSpecialRequestModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.specialRequestModal}>
              <Text style={styles.specialRequestTitle}>Special Request</Text>
              <TextInput
                style={styles.specialRequestInput}
                placeholder="Enter any special instructions..."
                placeholderTextColor={COLORS.textMuted}
                value={specialInstructions}
                onChangeText={setSpecialInstructions}
                multiline
                numberOfLines={4}
              />
              <View style={styles.specialRequestButtons}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowSpecialRequestModal(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={() => setShowSpecialRequestModal(false)}
                >
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.background,
  },
  closeBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  scrollView: {
    flex: 1,
  },
  tableSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tableLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: 12,
  },
  tableSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flex: 1,
    justifyContent: 'space-between',
  },
  tableNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  categoryTabsContainer: {
    maxHeight: 50,
  },
  categoryTabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  categoryTabTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  productsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  productImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  productDescription: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  productRight: {
    alignItems: 'flex-end',
  },
  productPriceLarge: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  checkIcon: {
    marginLeft: 4,
  },
  specialRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  specialRequestText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  recentOrdersSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  viewAllText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  orderFilterContainer: {
    maxHeight: 40,
    marginBottom: 16,
  },
  orderFilterContent: {
    gap: 8,
  },
  orderFilterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
  },
  orderFilterTabActive: {
    backgroundColor: COLORS.text,
  },
  orderFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  orderFilterTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  ordersList: {
    gap: 12,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
  },
  orderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderInfo: {},
  orderNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  orderTime: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  orderRight: {
    alignItems: 'flex-end',
  },
  orderTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bottomCart: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cartInfo: {
    flex: 1,
  },
  cartItemCount: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  cartTotal: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 2,
  },
  placeOrderBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  placeOrderBtnDisabled: {
    backgroundColor: COLORS.textMuted,
  },
  placeOrderText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
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
    fontWeight: '800',
    color: COLORS.text,
  },
  tableList: {
    padding: 20,
  },
  tableOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: COLORS.background,
  },
  tableOptionSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  tableOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tableOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  tableOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  specialRequestModal: {
    backgroundColor: COLORS.white,
    margin: 20,
    borderRadius: 20,
    padding: 20,
  },
  specialRequestTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 16,
  },
  specialRequestInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: COLORS.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  specialRequestButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
});
