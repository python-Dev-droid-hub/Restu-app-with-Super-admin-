import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  ScrollView,
  Alert,
  Image,
  KeyboardAvoidingView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../components/api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

const getFullImageUrl = (url?: string) => {
  if (!url) return '';
  const normalized = url.replace(/\\/g, '/');
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
  const baseUrl = api.getBaseURL().replace(/\/?api\/?$/, '');
  if (normalized.startsWith('/')) return `${baseUrl}${normalized}`;
  return `${baseUrl}/${normalized.replace(/^\/+/, '')}`;
};

interface Product {
  _id: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

interface MenuCategory {
  _id: string;
  name: string;
  isActive?: boolean;
}

export default function AddDealItemScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const campaignId = (route.params as any)?.campaignId;
  const dealId = (route.params as any)?.dealId;
  const isEditing = !!dealId;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductPicker, setShowProductPicker] = useState(false);

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Deal item details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [displayOrder, setDisplayOrder] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Included items
  const [includedItems, setIncludedItems] = useState<
    Array<{ productId?: string; productName: string; quantity: number; price?: number }>
  >([]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadProducts();
    loadCategories();
    if (isEditing) {
      loadDealItem();
    }
  }, [campaignId, dealId]);

  const loadProducts = async () => {
    try {
      const response = await api.get('/menu/admin/products?limit=100');
      if (response.success && response.data?.products) {
        setProducts(response.data.products);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response: any = await api.get('/menu/admin/categories');
      const list = response?.data?.categories || response?.data || [];
      if (response.success && Array.isArray(list)) {
        setCategories(list);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadDealItem = async () => {
    try {
      setInitialLoading(true);
      const response = await api.get(`/deals/campaigns/${campaignId}`);
      if (response.success && response.data?.campaign) {
        const deal = response.data.campaign.deals?.find((d: any) => d._id === dealId);
        if (deal) {
          setTitle(deal.title || '');
          setDescription(deal.description || '');
          setImageUrl(deal.imageUrl || '');
          setPrice(deal.price?.toString() || '');
          setOriginalPrice(deal.originalPrice?.toString() || '');
          setDisplayOrder(deal.displayOrder?.toString() || '');
          setIsActive(deal.isActive !== false);
          setIncludedItems(deal.items || []);
          setSelectedCategoryIds(
            Array.isArray(deal.categories)
              ? deal.categories.map((c: any) => String(c?._id || c))
              : []
          );
        }
      }
    } catch (error) {
      console.error('Error loading deal item:', error);
      Alert.alert('Error', 'Failed to load deal item');
    } finally {
      setInitialLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setLoading(true);
      const response = await fetch(uri);
      const blob = await response.blob();

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1] || result;
          resolve(base64Data);
        };
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(blob);
      });

      const uploadResponse = await api.post('/upload', {
        image: base64,
        filename: 'deal.jpg',
        mimeType: 'image/jpeg',
      });

      if (uploadResponse.success && uploadResponse.data?.url) {
        setImageUrl(uploadResponse.data.url);
      } else {
        Alert.alert('Error', uploadResponse.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const addIncludedItem = (product: Product) => {
    const existing = includedItems.find((item) => item.productId === product._id);
    if (existing) {
      setIncludedItems(
        includedItems.map((item) =>
          item.productId === product._id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setIncludedItems([
        ...includedItems,
        { productId: product._id, productName: product.name, quantity: 1, price: product.price },
      ]);
    }
    setShowProductPicker(false);
  };

  const removeIncludedItem = (productId: string) => {
    setIncludedItems(includedItems.filter((item) => item.productId !== productId));
  };

  const updateIncludedItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeIncludedItem(productId);
    } else {
      setIncludedItems(
        includedItems.map((item) =>
          item.productId === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Deal title is required';
    }

    if (!price.trim()) {
      newErrors.price = 'Price is required';
    } else if (parseFloat(price) <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }

    if (originalPrice && parseFloat(originalPrice) <= parseFloat(price)) {
      newErrors.originalPrice = 'Original price should be higher than sale price';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const dealData: any = {
        title,
        description: description || undefined,
        imageUrl: imageUrl || undefined,
        price: parseFloat(price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
        displayOrder: parseInt(displayOrder) || 0,
        isActive,
        items: includedItems.length > 0 ? includedItems : undefined,
        categories: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
      };

      let response;
      if (isEditing) {
        response = await api.patch(`/deals/campaigns/${campaignId}/deals/${dealId}`, dealData);
      } else {
        response = await api.post(`/deals/campaigns/${campaignId}/deals`, dealData);
      }

      if (response.success) {
        Alert.alert('Success', `Deal ${isEditing ? 'updated' : 'added'} successfully`, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', response.message || 'Failed to save deal');
      }
    } catch (error: any) {
      console.error('Error saving deal:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save deal';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const discountPercent = originalPrice && parseFloat(originalPrice) > parseFloat(price)
    ? Math.round(((parseFloat(originalPrice) - parseFloat(price)) / parseFloat(originalPrice)) * 100)
    : 0;

  if (initialLoading) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: STATUSBAR_HEIGHT }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1a1a2e" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Deal</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E87E35" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: STATUSBAR_HEIGHT }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1a1a2e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Deal' : 'Add Deal'}</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
          <View style={styles.formContainer}>
            {/* Image */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Product Image</Text>
              <TouchableOpacity style={styles.imageUploadBox} onPress={pickImage}>
                {imageUrl ? (
                  <Image
                    source={{ uri: getFullImageUrl(imageUrl) }}
                    style={styles.uploadedImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Ionicons name="camera" size={48} color="#ccc" />
                    <Text style={styles.uploadText}>Tap to upload product image</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Deal Title *</Text>
              <TextInput
                style={[styles.input, errors.title && styles.inputError]}
                placeholder="e.g., Chick N Crunch Burger"
                value={title}
                onChangeText={(text) => {
                  setTitle(text);
                  if (errors.title) setErrors({ ...errors, title: '' });
                }}
              />
              {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Crispy goodness, made of chest chicken meat..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Categories */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Categories</Text>
              <TouchableOpacity style={styles.pickerButton} onPress={() => setShowCategoryPicker(true)}>
                <Text style={styles.pickerButtonText} numberOfLines={1}>
                  {selectedCategoryIds.length > 0 ? `${selectedCategoryIds.length} selected` : 'Select categories'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Pricing */}
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, styles.halfInput]}>
                <Text style={styles.inputLabel}>Original Price</Text>
                <TextInput
                  style={[styles.input, errors.originalPrice && styles.inputError]}
                  placeholder="500"
                  value={originalPrice}
                  onChangeText={(text) => {
                    setOriginalPrice(text);
                    if (errors.originalPrice) setErrors({ ...errors, originalPrice: '' });
                  }}
                  keyboardType="decimal-pad"
                />
                {errors.originalPrice && (
                  <Text style={styles.errorText}>{errors.originalPrice}</Text>
                )}
              </View>
              <View style={[styles.inputGroup, styles.halfInput]}>
                <Text style={styles.inputLabel}>Sale Price * {discountPercent > 0 ? `(${discountPercent}% OFF)` : ''}</Text>
                <TextInput
                  style={[styles.input, errors.price && styles.inputError]}
                  placeholder="310"
                  value={price}
                  onChangeText={(text) => {
                    setPrice(text);
                    if (errors.price) setErrors({ ...errors, price: '' });
                  }}
                  keyboardType="decimal-pad"
                />
                {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
              </View>
            </View>

            {/* Display Order */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Display Order</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={displayOrder}
                onChangeText={setDisplayOrder}
                keyboardType="number-pad"
              />
              <Text style={styles.hintText}>Lower numbers appear first</Text>
            </View>

            {/* Included Items Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>What's Included</Text>
              <TouchableOpacity
                style={styles.addItemBtn}
                onPress={() => setShowProductPicker(true)}
              >
                <Ionicons name="add" size={20} color="#E87E35" />
                <Text style={styles.addItemBtnText}>Add Item</Text>
              </TouchableOpacity>
            </View>

            {includedItems.length > 0 ? (
              includedItems.map((item, index) => (
                <View key={item.productId || index} style={styles.includedItemCard}>
                  <View style={styles.includedItemInfo}>
                    <Text style={styles.includedItemName}>{item.productName}</Text>
                    {item.price && (
                      <Text style={styles.includedItemPrice}>PKR {item.price}</Text>
                    )}
                  </View>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.quantityBtn}
                      onPress={() => updateIncludedItemQuantity(item.productId!, item.quantity - 1)}
                    >
                      <Ionicons name="remove" size={18} color="#666" />
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.quantityBtn}
                      onPress={() => updateIncludedItemQuantity(item.productId!, item.quantity + 1)}
                    >
                      <Ionicons name="add" size={18} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noItemsText}>No items added yet</Text>
            )}

            {/* Active Toggle */}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Active</Text>
              <TouchableOpacity
                style={[styles.toggleBtn, isActive && styles.toggleBtnActive]}
                onPress={() => setIsActive(!isActive)}
              >
                <Text style={[styles.toggleText, isActive && styles.toggleTextActive]}>
                  {isActive ? 'Active' : 'Inactive'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.bottomSpacer} />

          {/* Save Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Saving...' : isEditing ? 'Update Deal' : 'Add Deal'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <View style={styles.categoryModalOverlay}>
          <View style={[styles.categoryModalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.categoryModalHeader}>
              <Text style={styles.categoryModalTitle}>Select Categories</Text>
              <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {categories
                .filter((c) => c?.isActive !== false)
                .map((c) => (
                  <TouchableOpacity
                    key={c._id}
                    style={styles.categoryRow}
                    onPress={() => toggleCategory(c._id)}
                  >
                    <Text style={styles.categoryRowText}>{c.name}</Text>
                    <View style={[styles.checkbox, selectedCategoryIds.includes(c._id) && styles.checkboxSelected]}>
                      {selectedCategoryIds.includes(c._id) && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowCategoryPicker(false)}>
              <Text style={styles.primaryBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Product Picker Modal */}
      <Modal
        visible={showProductPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProductPicker(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.productModalOverlay}
        >
          <View style={[styles.productModalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.productModalHeader}>
              <Text style={styles.productModalTitle}>Select Product</Text>
              <TouchableOpacity onPress={() => setShowProductPicker(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.productList}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {products
                .filter((p) => p.isAvailable)
                .map((product) => (
                  <TouchableOpacity
                    key={product._id}
                    style={styles.productItem}
                    onPress={() => addIncludedItem(product)}
                  >
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{product.name}</Text>
                      <Text style={styles.productPrice}>PKR {product.price}</Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={24} color="#E87E35" />
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addItemBtnText: {
    fontSize: 14,
    color: '#E87E35',
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fafafa',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    paddingBottom: 12,
  },
  inputError: {
    borderColor: '#f44336',
  },
  errorText: {
    fontSize: 12,
    color: '#f44336',
    marginTop: 4,
  },
  hintText: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  imageUploadBox: {
    width: '100%',
    height: 180,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#fafafa',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
  },
  uploadPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadText: {
    marginTop: 12,
    fontSize: 14,
    color: '#888',
  },
  includedItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  includedItemInfo: {
    flex: 1,
  },
  includedItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  includedItemPrice: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    minWidth: 20,
    textAlign: 'center',
  },
  noItemsText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    paddingVertical: 20,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginTop: 8,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  toggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  toggleBtnActive: {
    backgroundColor: '#E87E35',
    borderColor: '#E87E35',
  },
  toggleText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#fff',
  },
  bottomSpacer: {
    height: 100,
  },
  footer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 'auto',
  },
  saveButton: {
    backgroundColor: '#E87E35',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  categoryModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  categoryModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  categoryRowText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#E87E35',
    borderColor: '#E87E35',
  },
  primaryBtn: {
    marginTop: 12,
    backgroundColor: '#E87E35',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  // Product Modal styles (bottom sheet with keyboard support)
  productModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  productModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  productModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  productList: {
    maxHeight: 400,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  productPrice: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
});
