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
  _id?: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  image?: string;
  customizations?: any[];
  specialInstructions?: string;
  selectedSize?: ProductSize;
}

interface ProductSize {
  id: string;
  size_id: string;
  size_name: string;
  price: number;
  isDefault?: boolean;
}

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  image_url?: string;
  description?: string;
  category?: string;
  category_id?: string;
  isAvailable?: boolean;
  is_available?: boolean;
  has_sizes?: boolean;
  effectivePrice?: number;
  productSizes?: ProductSize[];
  sizes?: ProductSize[];
}

interface Category {
  id: string;
  name: string;
  products?: Product[];
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showItemEditor, setShowItemEditor] = useState<string | null>(null);
  const [editingItemNote, setEditingItemNote] = useState('');

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
        
        // Format items
        const formattedItems = (orderData.items || []).map((item: any) => {
          const imageUrl = item.product?.imageUrl || item.product?.image;
          // Use MongoDB _id as the stable identifier
          const itemId = item._id || item.id || `${Date.now()}-${Math.random()}`;
          return {
            id: itemId,
            _id: item._id, // Keep original MongoDB _id for API calls
            productId: item.product?._id || item.product || item.menuItemId,
            productName: item.productName || item.product?.name || 'Unknown Item',
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || item.price || 0,
            totalPrice: item.totalPrice || (item.unitPrice * item.quantity) || 0,
            image: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `${api.getBaseURL()}${imageUrl}`) : undefined,
            customizations: item.customizations || [],
            specialInstructions: item.specialInstructions || '',
          };
        });
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
      const response = await api.get('/menu');
      if (response.success && response.data) {
        const rawCategories = response.data.categories || response.data || [];
        const allProducts: Product[] = [];
        
        const formattedCategories: Category[] = rawCategories.map((cat: any) => {
          const catProducts = (cat.products || cat.items || []).map((p: any) => {
            const product: Product = {
              id: String(p._id || p.id),
              name: p.name,
              price: p.price,
              imageUrl: p.imageUrl ? `${api.getBaseURL()}${p.imageUrl}` : (p.image_url || p.images?.[0]),
              image_url: p.imageUrl ? `${api.getBaseURL()}${p.imageUrl}` : (p.image_url || p.images?.[0]),
              description: p.description,
              category: cat.name,
              category_id: String(cat._id || cat.id),
              isAvailable: p.is_available ?? p.isAvailable ?? true,
              is_available: p.is_available ?? p.isAvailable ?? true,
              has_sizes: p.has_sizes ?? p.hasSizes ?? false,
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

  const updateItemNote = (itemId: string, note: string) => {
    setItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, specialInstructions: note }
        : item
    ));
  };

  const openItemNoteEditor = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    setEditingItemNote(item?.specialInstructions || '');
    setShowItemEditor(itemId);
  };

  const saveItemNote = () => {
    if (showItemEditor) {
      updateItemNote(showItemEditor, editingItemNote);
    }
    setShowItemEditor(null);
    setEditingItemNote('');
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
      const unitPrice = getDisplayPrice(product);
      const newItem: OrderItem = {
        id: `${Date.now()}-${Math.random()}`,
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: unitPrice,
        totalPrice: unitPrice,
        image: product.imageUrl || product.image_url,
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
      // Get original item IDs (use _id from MongoDB)
      const originalItemIds = (order?.items || []).map(i => i._id || i.id);
      const currentItemIds = items.map(i => i._id || i.id);
      
      console.log('[EDIT ORDER] Original items:', originalItemIds);
      console.log('[EDIT ORDER] Current items:', currentItemIds);
      
      // Items to remove (were in original but not in current) - send MongoDB _id
      const removeItems = originalItemIds.filter(id => !currentItemIds.includes(id));
      console.log('[EDIT ORDER] Items to remove:', removeItems);
      
      // Items to add (new items that weren't in original - no _id)
      const addItems = items
        .filter(item => !item._id || !originalItemIds.includes(item._id))
        .map(item => ({
          menuItemId: item.productId,
          quantity: item.quantity,
          customizations: item.customizations || [],
          specialInstructions: item.specialInstructions || '',
        }));
      console.log('[EDIT ORDER] Items to add:', addItems.length);
      
      // Items to update (changed quantity or notes - have _id)
      const updateItems = items
        .filter(item => item._id && originalItemIds.includes(item._id))
        .filter(item => {
          const orig = order?.items?.find(i => (i._id || i.id) === item._id);
          return orig && (orig.quantity !== item.quantity || orig.specialInstructions !== item.specialInstructions);
        })
        .map(item => ({
          itemId: item._id,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions || '',
        }));
      console.log('[EDIT ORDER] Items to update:', updateItems.length);

      const payload = {
        addItems: addItems.length > 0 ? addItems : undefined,
        removeItems: removeItems.length > 0 ? removeItems : undefined,
        updateItems: updateItems.length > 0 ? updateItems : undefined,
      };
      console.log('[EDIT ORDER] Sending payload:', JSON.stringify(payload, null, 2));

      const response = await api.put(`/orders/${orderId}`, payload);

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

  // Helper to get display price for products with sizes
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

  const filteredProducts = selectedCategory 
    ? products.filter(p => p.category_id === selectedCategory)
    : products;

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

        {/* Current Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Items ({items.length})</Text>
          
          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No items in order</Text>
              <Text style={styles.emptySubtext}>Add products from categories below</Text>
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
                      <Ionicons name="restaurant" size={24} color="#FF7A59" />
                    </View>
                  )}
                </View>
                
                {/* Product Info */}
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName} numberOfLines={1} ellipsizeMode="tail">
                    {item.productName}
                  </Text>
                  <Text style={styles.itemPrice}>${Number(item.unitPrice || 0).toFixed(2)} each</Text>
                  
                  {/* Per-item special instructions */}
                  <TouchableOpacity 
                    style={styles.noteBtn}
                    onPress={() => openItemNoteEditor(item.id)}
                  >
                    <Ionicons 
                      name={item.specialInstructions ? "document-text" : "create-outline"} 
                      size={14} 
                      color={item.specialInstructions ? "#FF7A59" : "#8E8E93"} 
                    />
                    <Text style={[styles.noteBtnText, item.specialInstructions && styles.noteBtnTextActive]}>
                      {item.specialInstructions ? 'Edit Note' : 'Add Note'}
                    </Text>
                  </TouchableOpacity>
                  
                  {item.specialInstructions ? (
                    <Text style={styles.itemNote} numberOfLines={1}>{item.specialInstructions}</Text>
                  ) : null}
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
                <Text style={styles.itemTotal}>${Number((item.unitPrice || 0) * (item.quantity || 1)).toFixed(2)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Total */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>${Number(totalAmount || 0).toFixed(2)}</Text>
        </View>

        {/* Category Tabs */}
        <View style={styles.categoriesSection}>
          <Text style={styles.categoriesTitle}>Add More Items</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryContainer}
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
        </View>

        {/* Products Grid */}
        <View style={styles.productsSection}>
          <View style={styles.productsGrid}>
            {filteredProducts.filter(p => p.is_available !== false && p.isAvailable !== false).map(product => {
              const inOrder = items.some(item => item.productId === product.id);
              const orderQty = items.find(item => item.productId === product.id)?.quantity || 0;
              
              return (
                <TouchableOpacity
                  key={product.id}
                  style={[styles.productCard, inOrder && styles.productCardActive]}
                  onPress={() => addProductToOrder(product)}
                  activeOpacity={0.7}
                >
                  {(product.imageUrl || product.image_url) ? (
                    <Image source={{ uri: product.imageUrl || product.image_url }} style={styles.productImage} />
                  ) : (
                    <View style={styles.productImagePlaceholder}>
                      <Ionicons name="restaurant" size={28} color="#FF7A59" />
                    </View>
                  )}
                  
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                    <Text style={styles.productPrice}>${getDisplayPrice(product).toFixed(2)}</Text>
                  </View>
                  
                  {inOrder && (
                    <View style={styles.inOrderBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#34C759" />
                      <Text style={styles.inOrderText}>{orderQty}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Bottom padding */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Item Note Editor Modal */}
      <Modal
        visible={showItemEditor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShowItemEditor(null)}
      >
        <View style={styles.noteModalOverlay}>
          <View style={styles.noteModal}>
            <Text style={styles.noteModalTitle}>Special Instructions</Text>
            <Text style={styles.noteModalSubtitle}>
              {items.find(i => i.id === showItemEditor)?.productName}
            </Text>
            <TextInput
              style={styles.noteInput}
              value={editingItemNote}
              onChangeText={setEditingItemNote}
              placeholder="e.g., No onions, extra spicy..."
              placeholderTextColor="#8E8E93"
              multiline
              numberOfLines={3}
              autoFocus
            />
            <View style={styles.noteModalButtons}>
              <TouchableOpacity 
                style={styles.noteCancelBtn}
                onPress={() => {
                  setShowItemEditor(null);
                  setEditingItemNote('');
                }}
              >
                <Text style={styles.noteCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.noteSaveBtn} onPress={saveItemNote}>
                <Text style={styles.noteSaveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  // Per-item note styles
  noteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  noteBtnText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  noteBtnTextActive: {
    color: '#FF7A59',
    fontWeight: '600',
  },
  itemNote: {
    fontSize: 11,
    color: '#8E8E93',
    fontStyle: 'italic',
    marginTop: 4,
  },
  // Categories section styles
  categoriesSection: {
    marginTop: 20,
    backgroundColor: '#fff',
    paddingVertical: 12,
  },
  categoriesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginRight: 8,
  },
  categoryTabActive: {
    backgroundColor: '#FF7A59',
    borderColor: '#FF7A59',
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  categoryTabTextActive: {
    color: '#fff',
  },
  // Products section styles
  productsSection: {
    padding: 16,
  },
  productInfo: {
    width: '100%',
    alignItems: 'center',
  },
  // Note modal styles
  noteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxWidth: 400,
  },
  noteModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  noteModalSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
  },
  noteInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1A1A2E',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  noteModalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  noteCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  noteCancelBtnText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
  },
  noteSaveBtn: {
    backgroundColor: '#FF7A59',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  noteSaveBtnText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});
