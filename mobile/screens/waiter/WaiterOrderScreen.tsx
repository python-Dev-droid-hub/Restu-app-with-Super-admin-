import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';
import { useSettings } from '../../context/SettingsContext';

const { width, height } = Dimensions.get('window');
const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

const COLORS = {
  primary: '#FF7A59',
  primaryLight: '#FFF0EB',
  primaryDark: '#E56A4A',
  background: '#F8F9FA',
  white: '#FFFFFF',
  text: '#1A1A2E',
  textMuted: '#8E8E93',
  border: '#E8E8E8',
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
  card: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.5)',
};

interface ProductSize {
  id: string;
  size_id: string;
  size_name: string;
  price: number;
  isDefault?: boolean;
}

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
  effectivePrice?: number;
  productSizes?: ProductSize[];
}

interface Category {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  products?: Product[];
}

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  unitPrice: number;
  quantity: number;
  specialInstructions?: string;
  lineTotal: number;
  selectedSize?: ProductSize;
}

interface RestaurantTable {
  id: string;
  table_number: string;
  seating_capacity: number;
  status: string;
  branch_id?: string;
}

interface UserData {
  id: string;
  _id?: string;
  display_name?: string;
  assigned_branch_id?: string;
  branch_id?: string;
}

export default function WaiterOrderScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { formatPrice, currencySymbol, taxRate } = useSettings();

  // Order state
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Data state
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountInput, setDiscountInput] = useState('');

  // Selected product for adding
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [addQuantity, setAddQuantity] = useState('1');
  const [addInstructions, setAddInstructions] = useState('');
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);

  // Calculate totals
  const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = Math.max(0, subtotal + taxAmount - discountAmount);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get user data
      const userDataRaw = await AsyncStorage.getItem('userData');
      let user = null;
      if (userDataRaw) {
        user = JSON.parse(userDataRaw);
      }

      // Fetch profile
      try {
        const profileResponse = await api.get('/users/profile');
        if (profileResponse.success && profileResponse.data) {
          user = { ...user, ...profileResponse.data };
        }
      } catch (e) {
        console.log('Could not fetch profile');
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
      if (tablesResponse.success && tablesResponse.data) {
        const rawTables = tablesResponse.data.tables || tablesResponse.data || [];
        const formattedTables: RestaurantTable[] = rawTables.map((t: any) => ({
          id: String(t.id || t._id),
          table_number: String(t.table_number || t.tableNumber || t.number || '1'),
          seating_capacity: t.seating_capacity || t.seatingCapacity || 4,
          status: t.status || 'AVAILABLE',
          branch_id: t.branch?._id || t.branch?.id || t.branch_id || t.branchId,
        }));
        setTables(formattedTables);
      }

      // Load menu - filter by branch if waiter has assigned branch
      const branchId = user?.assigned_branch_id || user?.branch_id || user?.branchId || user?.assignedBranch?._id;
      const menuUrl = branchId ? `/menu?branchId=${branchId}` : '/menu';
      const menuResponse = await api.get(menuUrl);
      if (menuResponse.success && menuResponse.data) {
        const rawCategories = menuResponse.data.categories || menuResponse.data || [];
        const allProducts: Product[] = [];
        
        const formattedCategories: Category[] = rawCategories.map((cat: any) => {
          const catProducts = (cat.products || cat.items || []).map((p: any) => {
            const product: Product = {
              id: String(p._id || p.id),
              name: p.name,
              price: p.price,
              description: p.description,
              image_url: p.imageUrl ? `${api.getBaseURL()}${p.imageUrl}` : (p.image_url || p.images?.[0]),
              images: p.images,
              is_available: p.is_available ?? p.isAvailable ?? true,
              has_sizes: p.has_sizes ?? p.hasSizes ?? false,
              category_id: p.category_id || p.category,
              effectivePrice: p.effectivePrice,
              productSizes: (p.productSizes || []).map((s: any) => ({
                id: String(s._id || s.id),
                size_id: s.size_id || s.sizeId,
                size_name: s.size_name || s.sizeName || s.name,
                price: s.price,
                isDefault: s.isDefault,
              })),
              sizes: (p.sizes || p.productSizes || []).map((s: any) => ({
                id: String(s._id || s.id),
                size_id: s.size_id || s.sizeId,
                size_name: s.size_name || s.sizeName || s.name,
                price: s.price,
              })),
            };
            allProducts.push(product);
            return product;
          });
          
          return {
            id: String(cat._id || cat.id),
            name: cat.name,
            description: cat.description,
            products: catProducts,
          };
        });

        setCategories(formattedCategories);
        setProducts(allProducts);
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

  // Helper to get display price
  const getDisplayPrice = (product: Product): number => {
    if (typeof product.effectivePrice === 'number' && !Number.isNaN(product.effectivePrice)) {
      return product.effectivePrice;
    }
    const sizes = product.productSizes || product.sizes;
    if (product.has_sizes && Array.isArray(sizes) && sizes.length > 0) {
      const defaultSize = sizes.find((s) => s?.isDefault);
      const candidate = defaultSize?.price ?? Math.min(...sizes.map((s) => s?.price ?? Number.POSITIVE_INFINITY));
      if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
    }
    return typeof product.price === 'number' && !Number.isNaN(product.price) ? product.price : 0;
  };

  // Add product to order
  const handleAddProduct = () => {
    if (!selectedProduct) {
      Alert.alert('Error', 'Please select a product');
      return;
    }

    const qty = parseInt(addQuantity) || 1;
    const price = selectedSize?.price ?? getDisplayPrice(selectedProduct);
    const lineTotal = price * qty;

    const newItem: OrderItem = {
      id: `item_${Date.now()}`,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      productImage: selectedProduct.image_url,
      unitPrice: price,
      quantity: qty,
      specialInstructions: addInstructions || undefined,
      lineTotal,
      selectedSize: selectedSize || undefined,
    };

    // Check if same product + same size + same instructions exists
    const existingIndex = orderItems.findIndex(
      item => item.productId === selectedProduct.id && 
              item.selectedSize?.id === selectedSize?.id &&
              item.specialInstructions === addInstructions
    );

    if (existingIndex >= 0) {
      const updatedItems = [...orderItems];
      updatedItems[existingIndex].quantity += qty;
      updatedItems[existingIndex].lineTotal = updatedItems[existingIndex].unitPrice * updatedItems[existingIndex].quantity;
      setOrderItems(updatedItems);
    } else {
      setOrderItems([...orderItems, newItem]);
    }

    // Reset and close
    setSelectedProduct(null);
    setAddQuantity('1');
    setAddInstructions('');
    setSelectedSize(null);
    setShowAddProduct(false);
  };

  // Update quantity
  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemId);
      return;
    }

    setOrderItems(orderItems.map(item => 
      item.id === itemId 
        ? { ...item, quantity: newQuantity, lineTotal: item.unitPrice * newQuantity }
        : item
    ));
  };

  // Remove item
  const handleRemoveItem = (itemId: string) => {
    setOrderItems(orderItems.filter(item => item.id !== itemId));
  };

  // Apply discount
  const handleApplyDiscount = () => {
    const discount = parseFloat(discountInput) || 0;
    setDiscountAmount(Math.max(0, discount));
    setShowDiscountModal(false);
    setDiscountInput('');
  };

  // Submit order
  const handleSubmitOrder = async () => {
    if (!selectedTable) {
      Alert.alert('Select Table', 'Please select a table for this order');
      return;
    }

    if (orderItems.length === 0) {
      Alert.alert('Empty Order', 'Please add at least one item');
      return;
    }

    if (!userData?.id) {
      Alert.alert('Error', 'User data not found. Please login again.');
      return;
    }

    const branchId = selectedTable.branch_id || userData.branch_id || userData.assigned_branch_id;

    if (!branchId) {
      Alert.alert('Error', 'Branch ID not found');
      return;
    }

    try {
      setSubmitting(true);

      const orderData = {
        items: orderItems.map(item => ({
          menuItemId: item.productId,
          quantity: item.quantity,
          customizations: item.selectedSize ? [{
            optionName: 'Size',
            optionValue: item.selectedSize.size_name,
            extraPrice: item.selectedSize.price - getDisplayPrice(products.find(p => p.id === item.productId) || products[0]),
          }] : [],
          specialInstructions: item.specialInstructions,
        })),
        restaurantId: branchId,
        orderType: 'DINE_IN',
        paymentMethod: 'cash',
        tableId: selectedTable.id,
        deliveryAddress: {
          street: `Table ${selectedTable.table_number}`,
          city: 'Restaurant',
          state: 'Local',
          zipCode: '00000',
        },
        specialInstructions: `Table order - Table #${selectedTable.table_number}${specialInstructions ? ` - ${specialInstructions}` : ''}`,
        discountAmount,
      };

      const response = await api.post('/orders', orderData);

      if (response.success) {
        Alert.alert(
          'Order Confirmed',
          `Order #${response.data?.orderNumber || 'created'} has been sent to kitchen`,
          [
            { 
              text: 'New Order', 
              onPress: () => {
                setOrderItems([]);
                setSelectedTable(null);
                setDiscountAmount(0);
                setSpecialInstructions('');
              }
            },
            { 
              text: 'View Orders', 
              onPress: () => navigation.goBack()
            }
          ]
        );
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

  // Filter products by category
  const filteredProducts = selectedCategory 
    ? products.filter(p => p.category_id === selectedCategory || !selectedCategory)
    : products;

  // Render product item in modal
  const renderProductItem = ({ item }: { item: Product }) => {
    const isSelected = selectedProduct?.id === item.id;
    const isAvailable = item.is_available !== false;

    return (
      <TouchableOpacity
        onPress={() => {
          if (isAvailable) {
            setSelectedProduct(item);
            if (item.has_sizes && item.productSizes && item.productSizes.length > 0) {
              setSelectedSize(item.productSizes.find(s => s.isDefault) || item.productSizes[0]);
            } else {
              setSelectedSize(null);
            }
          }
        }}
        style={[
          styles.productCard,
          isSelected && styles.productCardSelected,
          !isAvailable && styles.productCardUnavailable,
        ]}
        disabled={!isAvailable}
      >
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.productCardImage} />
        ) : (
          <View style={styles.productCardImagePlaceholder}>
            <Ionicons name="restaurant" size={24} color={COLORS.primary} />
          </View>
        )}
        
        <View style={styles.productCardInfo}>
          <Text style={styles.productCardName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.productCardPrice}>
            {currencySymbol}{getDisplayPrice(item).toFixed(2)}
          </Text>
          {item.has_sizes && (
            <Text style={styles.productCardSizes}>
              {item.productSizes?.length || 0} sizes
            </Text>
          )}
        </View>

        {isSelected && (
          <View style={styles.productCardCheck}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Render order item
  const renderOrderItem = ({ item }: { item: OrderItem }) => (
    <View style={styles.orderItem}>
      <View style={styles.orderItemLeft}>
        {item.productImage ? (
          <Image source={{ uri: item.productImage }} style={styles.orderItemImage} />
        ) : (
          <View style={styles.orderItemImagePlaceholder}>
            <Ionicons name="restaurant" size={16} color={COLORS.primary} />
          </View>
        )}
        
        <View style={styles.orderItemInfo}>
          <Text style={styles.orderItemName} numberOfLines={1}>{item.productName}</Text>
          {item.selectedSize && (
            <Text style={styles.orderItemSize}>{item.selectedSize.size_name}</Text>
          )}
          <Text style={styles.orderItemPrice}>
            {currencySymbol}{item.unitPrice.toFixed(2)} × {item.quantity}
          </Text>
          {item.specialInstructions && (
            <Text style={styles.orderItemNote} numberOfLines={1}>
              📝 {item.specialInstructions}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.orderItemRight}>
        <Text style={styles.orderItemTotal}>{currencySymbol}{item.lineTotal.toFixed(2)}</Text>
        
        <View style={styles.orderItemControls}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => handleUpdateQuantity(item.id, item.quantity - 1)}
          >
            <Ionicons name="remove" size={16} color={COLORS.primary} />
          </TouchableOpacity>
          
          <Text style={styles.qtyText}>{item.quantity}</Text>
          
          <TouchableOpacity
            style={[styles.qtyBtn, styles.qtyBtnAdd]}
            onPress={() => handleUpdateQuantity(item.id, item.quantity + 1)}
          >
            <Ionicons name="add" size={16} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Invoice panel
  const renderInvoice = () => (
    <View style={styles.invoicePanel}>
      <View style={styles.invoiceHeader}>
        <Text style={styles.invoiceTitle}>Invoice</Text>
        <TouchableOpacity onPress={() => setShowInvoice(false)}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.invoiceItems}>
        {orderItems.map(item => (
          <View key={item.id} style={styles.invoiceItemRow}>
            <View style={styles.invoiceItemLeft}>
              <Text style={styles.invoiceItemName}>{item.productName}</Text>
              <Text style={styles.invoiceItemQty}>
                {item.quantity} × {currencySymbol}{item.unitPrice.toFixed(2)}
              </Text>
            </View>
            <Text style={styles.invoiceItemTotal}>{currencySymbol}{item.lineTotal.toFixed(2)}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.invoiceTotals}>
        <View style={styles.invoiceRow}>
          <Text style={styles.invoiceLabel}>Subtotal</Text>
          <Text style={styles.invoiceValue}>{currencySymbol}{subtotal.toFixed(2)}</Text>
        </View>

        <View style={styles.invoiceRow}>
          <Text style={styles.invoiceLabel}>Tax ({taxRate}%)</Text>
          <Text style={styles.invoiceValue}>{currencySymbol}{taxAmount.toFixed(2)}</Text>
        </View>

        {discountAmount > 0 && (
          <View style={styles.invoiceRow}>
            <Text style={[styles.invoiceLabel, styles.discountText]}>Discount</Text>
            <Text style={[styles.invoiceValue, styles.discountText]}>
              -{currencySymbol}{discountAmount.toFixed(2)}
            </Text>
          </View>
        )}

        <View style={styles.invoiceTotalRow}>
          <Text style={styles.invoiceTotalLabel}>Total</Text>
          <Text style={styles.invoiceTotalValue}>{currencySymbol}{total.toFixed(2)}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.discountBtn}
        onPress={() => {
          setDiscountInput(discountAmount.toString());
          setShowDiscountModal(true);
        }}
      >
        <Ionicons name="pricetag" size={18} color={COLORS.primary} />
        <Text style={styles.discountBtnText}>
          {discountAmount > 0 ? 'Edit Discount' : 'Add Discount'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.confirmBtn, (submitting || orderItems.length === 0) && styles.confirmBtnDisabled]}
        onPress={handleSubmitOrder}
        disabled={submitting || orderItems.length === 0}
      >
        {submitting ? (
          <ActivityIndicator color={COLORS.white} size="small" />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
            <Text style={styles.confirmBtnText}>Confirm Order</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading menu...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Order</Text>
        <TouchableOpacity 
          style={styles.invoiceBtn}
          onPress={() => setShowInvoice(true)}
        >
          <Ionicons name="receipt" size={24} color={COLORS.primary} />
          {orderItems.length > 0 && (
            <View style={styles.invoiceBadge}>
              <Text style={styles.invoiceBadgeText}>{orderItems.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Table Selector */}
      <TouchableOpacity 
        style={styles.tableSelector}
        onPress={() => setShowTablePicker(true)}
      >
        <Ionicons name="restaurant" size={20} color={COLORS.primary} />
        <Text style={styles.tableSelectorText}>
          {selectedTable ? `Table #${selectedTable.table_number}` : 'Select Table'}
        </Text>
        <Ionicons name="chevron-down" size={20} color={COLORS.textMuted} />
      </TouchableOpacity>

      {/* Category Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContent}
      >
        {categories.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryTab,
              selectedCategory === cat.id && styles.categoryTabActive
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text style={[
              styles.categoryTabText,
              selectedCategory === cat.id && styles.categoryTabTextActive
            ]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Order Items List */}
      <ScrollView style={styles.orderList}>
        {orderItems.length === 0 ? (
          <View style={styles.emptyOrder}>
            <Ionicons name="cart-outline" size={64} color={COLORS.border} />
            <Text style={styles.emptyOrderText}>No items added yet</Text>
            <Text style={styles.emptyOrderHint}>Tap "Add Product" to start</Text>
          </View>
        ) : (
          <View style={styles.orderItemsContainer}>
            <FlatList
              data={orderItems}
              renderItem={renderOrderItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          </View>
        )}
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.totalInfo}>
          <Text style={styles.totalLabel}>
            {orderItems.length} item{orderItems.length !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.totalValue}>{currencySymbol}{total.toFixed(2)}</Text>
        </View>

        <TouchableOpacity
          style={styles.addProductBtn}
          onPress={() => setShowAddProduct(true)}
        >
          <Ionicons name="add" size={20} color={COLORS.white} />
          <Text style={styles.addProductBtnText}>Add Product</Text>
        </TouchableOpacity>
      </View>

      {/* Table Picker Modal */}
      <Modal visible={showTablePicker} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.tableModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Table</Text>
              <TouchableOpacity onPress={() => setShowTablePicker(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {tables.map(table => (
                <TouchableOpacity
                  key={table.id}
                  style={[
                    styles.tableOption,
                    selectedTable?.id === table.id && styles.tableOptionSelected
                  ]}
                  onPress={() => {
                    setSelectedTable(table);
                    setShowTablePicker(false);
                  }}
                >
                  <View style={styles.tableOptionLeft}>
                    <Ionicons name="square" size={24} color={COLORS.primary} />
                    <Text style={styles.tableOptionText}>Table #{table.table_number}</Text>
                  </View>
                  <Text style={styles.tableOptionCapacity}>
                    {table.seating_capacity} seats
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Product Modal */}
      <Modal visible={showAddProduct} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.addProductModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Product</Text>
              <TouchableOpacity onPress={() => setShowAddProduct(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Product List */}
            <FlatList
              data={filteredProducts}
              renderItem={renderProductItem}
              keyExtractor={item => item.id}
              numColumns={2}
              columnWrapperStyle={styles.productGrid}
              contentContainerStyle={styles.productGridContent}
            />

            {/* Selected Product Details */}
            {selectedProduct && (
              <View style={styles.selectedProductDetails}>
                {/* Size Selection */}
                {selectedProduct.has_sizes && selectedProduct.productSizes && selectedProduct.productSizes.length > 0 && (
                  <View style={styles.sizeSelector}>
                    <Text style={styles.sizeSelectorLabel}>Select Size:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {selectedProduct.productSizes.map(size => (
                        <TouchableOpacity
                          key={size.id}
                          style={[
                            styles.sizeOption,
                            selectedSize?.id === size.id && styles.sizeOptionSelected
                          ]}
                          onPress={() => setSelectedSize(size)}
                        >
                          <Text style={[
                            styles.sizeOptionText,
                            selectedSize?.id === size.id && styles.sizeOptionTextSelected
                          ]}>
                            {size.size_name}
                          </Text>
                          <Text style={styles.sizeOptionPrice}>
                            {currencySymbol}{size.price.toFixed(2)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Quantity */}
                <View style={styles.quantityInput}>
                  <Text style={styles.quantityLabel}>Quantity:</Text>
                  <TextInput
                    style={styles.quantityTextInput}
                    value={addQuantity}
                    onChangeText={setAddQuantity}
                    keyboardType="number-pad"
                    selectTextOnFocus
                  />
                </View>

                {/* Special Instructions */}
                <TextInput
                  style={styles.instructionsInput}
                  placeholder="Special instructions (optional)"
                  placeholderTextColor={COLORS.textMuted}
                  value={addInstructions}
                  onChangeText={setAddInstructions}
                  multiline
                />

                {/* Add Button */}
                <TouchableOpacity style={styles.addToOrderBtn} onPress={handleAddProduct}>
                  <Ionicons name="add-circle" size={20} color={COLORS.white} />
                  <Text style={styles.addToOrderBtnText}>
                    Add to Order - {currencySymbol}{((selectedSize?.price ?? getDisplayPrice(selectedProduct)) * (parseInt(addQuantity) || 1)).toFixed(2)}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Invoice Modal */}
      <Modal visible={showInvoice} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {renderInvoice()}
        </KeyboardAvoidingView>
      </Modal>

      {/* Discount Modal */}
      <Modal visible={showDiscountModal} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.discountModal}>
            <Text style={styles.discountModalTitle}>Apply Discount</Text>
            <TextInput
              style={styles.discountInput}
              placeholder="Discount amount"
              placeholderTextColor={COLORS.textMuted}
              value={discountInput}
              onChangeText={setDiscountInput}
              keyboardType="decimal-pad"
            />
            <View style={styles.discountModalButtons}>
              <TouchableOpacity 
                style={styles.discountCancelBtn}
                onPress={() => setShowDiscountModal(false)}
              >
                <Text style={styles.discountCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.discountApplyBtn}
                onPress={handleApplyDiscount}
              >
                <Text style={styles.discountApplyBtnText}>Apply</Text>
              </TouchableOpacity>
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
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: 8,
  },
  invoiceBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  invoiceBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  invoiceBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  tableSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tableSelectorText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 12,
  },
  categoryScroll: {
    maxHeight: 50,
    marginBottom: 12,
  },
  categoryContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryTab: {
    paddingHorizontal: 16,
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
  orderList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyOrder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyOrderText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 16,
  },
  emptyOrderHint: {
    fontSize: 14,
    color: COLORS.border,
    marginTop: 4,
  },
  orderItemsContainer: {
    paddingBottom: 16,
  },
  orderItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  orderItemLeft: {
    flex: 1,
    flexDirection: 'row',
  },
  orderItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: COLORS.border,
  },
  orderItemImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  orderItemSize: {
    fontSize: 12,
    color: COLORS.primary,
    marginBottom: 2,
  },
  orderItemPrice: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  orderItemNote: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  orderItemRight: {
    alignItems: 'flex-end',
  },
  orderItemTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8,
  },
  orderItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnAdd: {
    backgroundColor: COLORS.primary,
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalInfo: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  addProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addProductBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  tableModal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '60%',
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
    fontWeight: '700',
    color: COLORS.text,
  },
  tableOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
  tableOptionCapacity: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  addProductModal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  productGrid: {
    paddingHorizontal: 8,
    gap: 8,
  },
  productGridContent: {
    paddingVertical: 12,
  },
  productCard: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  productCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  productCardUnavailable: {
    opacity: 0.5,
  },
  productCardImage: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.border,
  },
  productCardImagePlaceholder: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productCardInfo: {
    marginTop: 8,
  },
  productCardName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  productCardPrice: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  productCardSizes: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  productCardCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  selectedProductDetails: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  sizeSelector: {
    marginBottom: 12,
  },
  sizeSelectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  sizeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
    alignItems: 'center',
  },
  sizeOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  sizeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  sizeOptionTextSelected: {
    color: COLORS.white,
  },
  sizeOptionPrice: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  quantityInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  quantityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: 12,
  },
  quantityTextInput: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  instructionsInput: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  addToOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  addToOrderBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  invoicePanel: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  invoiceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  invoiceItems: {
    maxHeight: 200,
    paddingHorizontal: 20,
  },
  invoiceItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  invoiceItemLeft: {
    flex: 1,
  },
  invoiceItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  invoiceItemQty: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  invoiceItemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  invoiceTotals: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  invoiceLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  invoiceValue: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
  },
  discountText: {
    color: COLORS.success,
  },
  invoiceTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  invoiceTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  invoiceTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  discountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 8,
  },
  discountBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  confirmBtnDisabled: {
    backgroundColor: COLORS.textMuted,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  discountModal: {
    backgroundColor: COLORS.white,
    margin: 20,
    borderRadius: 16,
    padding: 20,
  },
  discountModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  discountInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    textAlign: 'center',
  },
  discountModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  discountCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  discountCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  discountApplyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  discountApplyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
});
