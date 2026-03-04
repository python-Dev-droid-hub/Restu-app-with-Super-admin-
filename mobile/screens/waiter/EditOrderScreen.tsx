import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../../components/api/client';
import { SafeAreaView } from 'react-native-safe-area-context';

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  image?: string;
  customizations?: any[];
}

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  description?: string;
  category?: string;
  isAvailable?: boolean;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  tableNumber?: string;
  specialInstructions?: string;
  items: OrderItem[];
  totalAmount: number;
}

export default function EditOrderScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId } = route.params as { orderId: string };

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>(['all']);

  useEffect(() => {
    loadOrder();
    loadProducts();
  }, []);

  const loadOrder = async () => {
    try {
      const response = await api.get(`/orders/${orderId}`);
      if (response.success && response.data) {
        const orderData = response.data;
        setOrder(orderData);
        setSpecialInstructions(orderData.specialInstructions || '');
        
        // Format items
        const formattedItems = (orderData.items || []).map((item: any) => ({
          id: item.id || item._id || `${Date.now()}-${Math.random()}`,
          productId: item.product?._id || item.product || item.menuItemId,
          productName: item.productName || item.product?.name || 'Unknown Item',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || item.price || 0,
          totalPrice: item.totalPrice || (item.unitPrice * item.quantity) || 0,
          image: item.product?.imageUrl || item.product?.image,
          customizations: item.customizations || [],
        }));
        setItems(formattedItems);
      }
    } catch (error) {
      console.error('Error loading order:', error);
      Alert.alert('Error', 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await api.get('/menu/items');
      if (response.success && response.data) {
        const prods = response.data.items || response.data || [];
        setProducts(prods.filter((p: Product) => p.isAvailable !== false));
        
        // Extract unique categories
        const cats: string[] = [...new Set(prods.map((p: Product) => p.category).filter(Boolean)) as Set<string>];
        setCategories(['all', ...cats]);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const calculateTotal = useCallback(() => {
    return items.reduce((sum, item) => sum + (item.totalPrice || item.unitPrice * item.quantity), 0);
  }, [items]);

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      // Remove item
      setItems(prev => prev.filter(item => item.id !== itemId));
    } else {
      setItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, quantity: newQuantity, totalPrice: item.unitPrice * newQuantity }
          : item
      ));
    }
  };

  const addProductToOrder = (product: Product) => {
    const existingIndex = items.findIndex(item => item.productId === product.id);
    
    if (existingIndex >= 0) {
      // Update existing item
      setItems(prev => prev.map((item, idx) => 
        idx === existingIndex
          ? { ...item, quantity: item.quantity + 1, totalPrice: item.unitPrice * (item.quantity + 1) }
          : item
      ));
    } else {
      // Add new item
      const newItem: OrderItem = {
        id: `${Date.now()}-${Math.random()}`,
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.price,
        totalPrice: product.price,
        image: product.imageUrl,
        customizations: [],
      };
      setItems(prev => [...prev, newItem]);
    }
  };

  const saveOrder = async () => {
    if (items.length === 0) {
      Alert.alert('Error', 'Order must have at least one item');
      return;
    }

    setSaving(true);
    try {
      // Calculate items to add and remove
      const originalItemIds = (order?.items || []).map(i => i.id);
      const currentItemIds = items.map(i => i.id);
      
      // Items to remove (were in original but not in current)
      const removeItems = originalItemIds.filter(id => !currentItemIds.includes(id));
      
      // Items to add (new items that weren't in original)
      const addItems = items
        .filter(item => !originalItemIds.includes(item.id))
        .map(item => ({
          menuItemId: item.productId,
          quantity: item.quantity,
          customizations: item.customizations || [],
        }));

      const response = await api.put(`/orders/${orderId}`, {
        specialInstructions: specialInstructions.trim(),
        addItems: addItems.length > 0 ? addItems : undefined,
        removeItems: removeItems.length > 0 ? removeItems : undefined,
      });

      if (response.success) {
        Alert.alert('Success', 'Order updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', response.message || 'Failed to update order');
      }
    } catch (error: any) {
      console.error('Error saving order:', error);
      Alert.alert('Error', error?.message || 'Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF7A59" />
          <Text style={styles.loadingText}>Loading order...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalAmount = calculateTotal();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Order #{order?.orderNumber}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Table Info */}
        {order?.tableNumber && (
          <View style={styles.tableBadge}>
            <Ionicons name="restaurant" size={16} color="#FF7A59" />
            <Text style={styles.tableText}>Table {order.tableNumber}</Text>
          </View>
        )}

        {/* Special Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Special Instructions</Text>
          <TextInput
            style={styles.instructionsInput}
            value={specialInstructions}
            onChangeText={setSpecialInstructions}
            placeholder="Add special instructions..."
            placeholderTextColor="#8E8E93"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Order Items ({items.length})</Text>
            <TouchableOpacity 
              style={styles.addItemBtn}
              onPress={() => setShowAddItem(true)}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addItemText}>Add Item</Text>
            </TouchableOpacity>
          </View>

          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No items in order</Text>
              <Text style={styles.emptySubtext}>Tap "Add Item" to add products</Text>
            </View>
          ) : (
            items.map((item, index) => (
              <View key={item.id} style={[styles.itemCard, index === items.length - 1 && styles.itemCardLast]}>
                {/* Product Image */}
                <View style={styles.itemImageContainer}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.itemImage} />
                  ) : (
                    <View style={styles.itemImagePlaceholder}>
                      <Ionicons name="restaurant" size={28} color="#FF7A59" />
                    </View>
                  )}
                </View>
                
                {/* Product Info */}
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName} numberOfLines={1} ellipsizeMode="tail">
                    {item.productName}
                  </Text>
                  <Text style={styles.itemPrice}>${item.unitPrice.toFixed(2)} each</Text>
                </View>

                {/* Quantity Controls */}
                <View style={styles.quantitySection}>
                  <TouchableOpacity 
                    style={styles.quantityBtn}
                    onPress={() => updateQuantity(item.id, item.quantity - 1)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.quantityBtnText}>−</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                  
                  <TouchableOpacity 
                    style={styles.quantityBtn}
                    onPress={() => updateQuantity(item.id, item.quantity + 1)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.quantityBtnText}>+</Text>
                  </TouchableOpacity>
                </View>

                {/* Total Price */}
                <Text style={styles.itemTotal}>${(item.unitPrice * item.quantity).toFixed(2)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Total */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>${totalAmount.toFixed(2)}</Text>
        </View>

        {/* Bottom padding */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity 
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
          disabled={saving}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={saveOrder}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Add Item Modal */}
      <Modal
        visible={showAddItem}
        animationType="slide"
        onRequestClose={() => setShowAddItem(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddItem(false)}>
              <Ionicons name="close" size={28} color="#1A1A2E" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Items</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Category Filter */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryContainer}
          >
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryBtn,
                  selectedCategory === cat && styles.categoryBtnActive
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[
                  styles.categoryText,
                  selectedCategory === cat && styles.categoryTextActive
                ]}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Products List */}
          <ScrollView style={styles.productsList}>
            <View style={styles.productsGrid}>
              {filteredProducts.map(product => {
                const inOrder = items.some(item => item.productId === product.id);
                const orderQty = items.find(item => item.productId === product.id)?.quantity || 0;
                
                return (
                  <TouchableOpacity
                    key={product.id}
                    style={[styles.productCard, inOrder && styles.productCardActive]}
                    onPress={() => addProductToOrder(product)}
                  >
                    {product.imageUrl ? (
                      <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
                    ) : (
                      <View style={styles.productImagePlaceholder}>
                        <Ionicons name="restaurant" size={32} color="#FF7A59" />
                      </View>
                    )}
                    
                    <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                    <Text style={styles.productPrice}>${product.price.toFixed(2)}</Text>
                    
                    {inOrder && (
                      <View style={styles.inOrderBadge}>
                        <Text style={styles.inOrderText}>In Order ({orderQty})</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Done Button */}
          <TouchableOpacity 
            style={styles.doneBtn}
            onPress={() => setShowAddItem(false)}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8E8E93',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  tableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF7A59',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  tableText: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: 6,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  instructionsInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#1A1A2E',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2BC48A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addItemText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  itemImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFE5DE',
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
  },
  itemImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#FFE5DE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemCardLast: {
    marginBottom: 0,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 4,
    flexShrink: 1,
  },
  itemPrice: {
    fontSize: 13,
    color: '#8E8E93',
  },
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 4,
  },
  quantityBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quantityBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF7A59',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    marginHorizontal: 12,
    minWidth: 24,
    textAlign: 'center',
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
    minWidth: 70,
    textAlign: 'right',
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2BC48A',
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FF7A59',
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  categoryScroll: {
    maxHeight: 60,
    backgroundColor: '#fff',
  },
  categoryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  categoryBtnActive: {
    backgroundColor: '#FF7A59',
    borderColor: '#FF7A59',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  categoryTextActive: {
    color: '#fff',
  },
  productsList: {
    flex: 1,
    padding: 16,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  productCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  productCardActive: {
    borderWidth: 2,
    borderColor: '#2BC48A',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginBottom: 12,
  },
  productImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#FFE5DE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF7A59',
  },
  inOrderBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#2BC48A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  inOrderText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  doneBtn: {
    backgroundColor: '#FF7A59',
    margin: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
