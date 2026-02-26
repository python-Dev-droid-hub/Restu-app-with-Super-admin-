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
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

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

export default function OrderForm() {
  const navigation = useNavigation();

  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get user data
      const userDataRaw = await AsyncStorage.getItem('userData');
      if (userDataRaw) {
        const user = JSON.parse(userDataRaw);
        setUserData({
          id: user.id || user._id,
          _id: user._id,
          display_name: user.display_name || user.name,
          assigned_branch_id: user.assigned_branch_id || user.branch_id,
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
        }));
        setTables(formattedTables);
      }

      // Load menu/products
      const menuResponse = await api.get('/menu');
      if (menuResponse.success && menuResponse.data) {
        const rawCategories = menuResponse.data.categories || [];
        const formattedCategories: Category[] = rawCategories.map((cat: any) => ({
          id: String(cat._id || cat.id),
          name: cat.name,
          description: cat.description,
          products: (cat.products || []).map((p: any) => ({
            id: String(p._id || p.id),
            name: p.name,
            price: p.price,
            description: p.description,
            image_url: p.image_url || p.imageUrl || (p.images && p.images[0]),
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

  const removeFromCart = (index: number) => {
    setCart(prevCart => {
      const updated = [...prevCart];
      if (updated[index].quantity > 1) {
        updated[index].quantity -= 1;
      } else {
        updated.splice(index, 1);
      }
      return updated;
    });
  };

  const updateCartItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      setCart(prevCart => prevCart.filter((_, i) => i !== index));
    } else {
      setCart(prevCart => {
        const updated = [...prevCart];
        updated[index].quantity = quantity;
        return updated;
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

    const orderData = {
      table_id: selectedTable,
      table_number: table?.table_number,
      waiter_id: userData.id,
      branch_id: userData.assigned_branch_id,
      order_type: 'DINE_IN',
      items: cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        size_id: item.selectedSize?.size_id,
        size_name: item.selectedSize?.size_name,
        unit_price: item.selectedSize?.price ?? item.product.price,
        special_instructions: item.specialInstructions,
      })),
      special_instructions: specialInstructions,
      status: 'PENDING',
      subtotal: calculateTotal(),
      total_amount: calculateTotal(),
    };

    setSubmitting(true);

    try {
      const response = await api.post('/orders', orderData);

      if (response.success) {
        const orderId = response.data?.id || response.data?._id;
        
        Alert.alert('Order Created', 'Order created successfully!', [
          {
            text: 'Send to Kitchen',
            onPress: async () => {
              try {
                const kitchenResponse = await api.post(`/orders/${orderId}/submit-to-kitchen`);
                if (kitchenResponse.success) {
                  Alert.alert('Success', 'Order sent to kitchen!');
                } else {
                  Alert.alert('Note', 'Order created but kitchen notification pending');
                }
              } catch (err) {
                Alert.alert('Note', 'Order created but kitchen notification pending');
              }
              navigation.goBack();
            },
          },
          {
            text: 'View Orders',
            onPress: () => navigation.goBack(),
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

  const renderProduct = (product: Product) => {
    const isAvailable = product.is_available !== false;

    return (
      <TouchableOpacity
        key={product.id}
        style={[styles.productCard, !isAvailable && styles.productCardUnavailable]}
        onPress={() => isAvailable && addToCart(product)}
        disabled={!isAvailable}
      >
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={styles.productImage} />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Ionicons name="restaurant" size={24} color="#ccc" />
          </View>
        )}

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
          <Text style={styles.productPrice}>Rs. {product.price.toFixed(2)}</Text>
          {!isAvailable && <Text style={styles.unavailableText}>Unavailable</Text>}
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => isAvailable && addToCart(product)}
          disabled={!isAvailable}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderCartItem = (item: CartItem, index: number) => {
    const price = item.selectedSize?.price ?? item.product.price;

    return (
      <View key={index} style={styles.cartItem}>
        <View style={styles.cartItemInfo}>
          <Text style={styles.cartItemName}>{item.product.name}</Text>
          {item.selectedSize && (
            <Text style={styles.cartItemSize}>({item.selectedSize.size_name})</Text>
          )}
          <Text style={styles.cartItemPrice}>Rs. {(price * item.quantity).toFixed(2)}</Text>
        </View>

        <View style={styles.cartItemControls}>
          <TouchableOpacity
            style={styles.quantityBtn}
            onPress={() => removeFromCart(index)}
          >
            <Ionicons name="remove" size={16} color="#FF7A59" />
          </TouchableOpacity>

          <Text style={styles.quantityText}>{item.quantity}</Text>

          <TouchableOpacity
            style={styles.quantityBtn}
            onPress={() => addToCart(item.product, item.selectedSize)}
          >
            <Ionicons name="add" size={16} color="#FF7A59" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F6F7FB" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF7A59" />
          <Text style={styles.loadingText}>Loading menu...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: STATUSBAR_HEIGHT }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7FB" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Order</Text>
        <TouchableOpacity
          style={styles.cartBtn}
          onPress={() => setShowCart(!showCart)}
        >
          <Ionicons name="cart-outline" size={24} color="#1A1A2E" />
          {cart.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cart.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Table Selection */}
      <TouchableOpacity
        style={styles.tableSelector}
        onPress={() => setShowTablePicker(!showTablePicker)}
      >
        <Ionicons name="restaurant" size={20} color="#FF7A59" />
        <Text style={styles.tableSelectorText}>
          {selectedTable
            ? `Table ${tables.find(t => t.id === selectedTable)?.table_number}`
            : 'Select Table'}
        </Text>
        <Ionicons
          name={showTablePicker ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#666"
        />
      </TouchableOpacity>

      {showTablePicker && (
        <View style={styles.tablePicker}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
                <Text
                  style={[
                    styles.tableOptionText,
                    selectedTable === table.id && styles.tableOptionTextSelected,
                  ]}
                >
                  {table.table_number}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Category Tabs */}
      <ScrollView
        horizontal
        style={styles.categoryTabs}
        showsHorizontalScrollIndicator={false}
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

      {/* Products Grid */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {categories
          .filter(cat => selectedCategory === cat.id)
          .map(cat => (
            <View key={cat.id} style={styles.productsGrid}>
              {cat.products?.map(product => renderProduct(product))}
            </View>
          ))}
      </ScrollView>

      {/* Cart Modal */}
      {showCart && (
        <View style={styles.cartModal}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>Order Items</Text>
            <TouchableOpacity onPress={() => setShowCart(false)}>
              <Ionicons name="close" size={24} color="#1A1A2E" />
            </TouchableOpacity>
          </View>

          {cart.length === 0 ? (
            <View style={styles.emptyCart}>
              <Ionicons name="cart-outline" size={48} color="#ccc" />
              <Text style={styles.emptyCartText}>Your cart is empty</Text>
            </View>
          ) : (
            <>
              <ScrollView style={styles.cartList} showsVerticalScrollIndicator={false}>
                {cart.map((item, index) => renderCartItem(item, index))}
              </ScrollView>

              {/* Special Instructions */}
              <View style={styles.specialInstructionsContainer}>
                <Text style={styles.specialInstructionsLabel}>Special Instructions</Text>
                <TextInput
                  style={styles.specialInstructionsInput}
                  placeholder="Add notes for the kitchen..."
                  placeholderTextColor="#999"
                  value={specialInstructions}
                  onChangeText={setSpecialInstructions}
                  multiline
                  numberOfLines={2}
                />
              </View>

              {/* Total */}
              <View style={styles.cartTotal}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>Rs. {calculateTotal().toFixed(2)}</Text>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleSubmitOrder}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="restaurant" size={20} color="#fff" />
                    <Text style={styles.submitBtnText}>Create Order</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Bottom Cart Summary */}
      {!showCart && cart.length > 0 && (
        <View style={styles.bottomCartSummary}>
          <View style={styles.bottomCartInfo}>
            <Text style={styles.bottomCartCount}>{cart.length} items</Text>
            <Text style={styles.bottomCartTotal}>Rs. {calculateTotal().toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={styles.viewCartBtn}
            onPress={() => setShowCart(true)}
          >
            <Text style={styles.viewCartBtnText}>View Cart</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
    fontWeight: '800',
    color: '#1A1A2E',
    textAlign: 'center',
  },
  cartBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF7A59',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  tableSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 10,
  },
  tableSelectorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  tablePicker: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 14,
    padding: 12,
    maxHeight: 100,
  },
  tableOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 10,
    borderRadius: 12,
    backgroundColor: '#F6F7FB',
  },
  tableOptionSelected: {
    backgroundColor: '#FF7A59',
  },
  tableOptionText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  tableOptionTextSelected: {
    color: '#fff',
  },
  categoryTabs: {
    backgroundColor: '#fff',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F6F7FB',
  },
  categoryTabActive: {
    backgroundColor: '#FF7A59',
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
  },
  categoryTabTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  productCardUnavailable: {
    opacity: 0.5,
  },
  productImage: {
    width: '100%',
    height: 100,
    resizeMode: 'cover',
  },
  productImagePlaceholder: {
    width: '100%',
    height: 100,
    backgroundColor: '#F6F7FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF7A59',
  },
  unavailableText: {
    fontSize: 10,
    color: '#FF4444',
    fontWeight: '600',
    marginTop: 2,
  },
  addButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#FF7A59',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cartTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  emptyCart: {
    padding: 40,
    alignItems: 'center',
  },
  emptyCartText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  cartList: {
    maxHeight: 200,
    padding: 16,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F6F7FB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  cartItemSize: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  cartItemPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF7A59',
    marginTop: 2,
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF7A59',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  specialInstructionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  specialInstructionsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    marginBottom: 6,
  },
  specialInstructionsInput: {
    backgroundColor: '#F6F7FB',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#1A1A2E',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  cartTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1A1A2E',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF7A59',
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  submitBtnDisabled: {
    backgroundColor: '#ccc',
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  bottomCartSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  bottomCartInfo: {
    flex: 1,
  },
  bottomCartCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
  },
  bottomCartTotal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1A1A2E',
    marginTop: 2,
  },
  viewCartBtn: {
    backgroundColor: '#FF7A59',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  viewCartBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
});
