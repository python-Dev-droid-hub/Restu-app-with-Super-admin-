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
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../components/api/client';
import { useLocalization } from '../../context/LocalizationContext';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

interface Product {
  _id: string;
  name: string;
  hasSizes: boolean;
  isAvailable: boolean;
}

interface Size {
  id: string;
  size_name: string;
  display_order: number;
  is_active: boolean;
}

export default function AddProductSizeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useLocalization();
  const [activeTab, setActiveTab] = useState<'sizes' | 'assign'>('sizes');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [editingSize, setEditingSize] = useState<Size | null>(null);

  // Size creation
  const [sizeName, setSizeName] = useState('');
  const [displayOrder, setDisplayOrder] = useState('');
  const [isSizeActive, setIsSizeActive] = useState(true);

  // Size assignment
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadProducts();
    loadSizes();
    // Check if editing an existing size
    const route = navigation.getState()?.routes?.find(r => r.name === 'AddProductSize');
    if (route && 'params' in route && (route.params as any)?.size) {
      const size = (route.params as any).size as Size;
      setEditingSize(size);
      populateFormWithSize(size);
    }
  }, [navigation]);

  const populateFormWithSize = (size: Size) => {
    setSizeName(size.size_name);
    setDisplayOrder(size.display_order.toString());
    setIsSizeActive(size.is_active);
  };

  const loadProducts = async () => {
    try {
      console.log('🔍 [ADD PRODUCT SIZE] Loading products...');
      const response = await api.get('/menu/admin/products');
      console.log('🔍 [ADD PRODUCT SIZE] API Response:', response);
      console.log('🔍 [ADD PRODUCT SIZE] Response success:', response.success);
      
      if (response.success) {
        const productsData = response.data.products || [];
        console.log('🔍 [ADD PRODUCT SIZE] Loaded products:', productsData.length);
        setProducts(productsData);
      } else {
        console.log('🔍 [ADD PRODUCT SIZE] API call failed');
      }
    } catch (error) {
      console.error('🔍 [ADD PRODUCT SIZE] Error loading products:', error);
    }
  };

  const loadSizes = async () => {
    try {
      const response = await api.get('/sizes');
      if (response.success) {
        setSizes(response.data.sizes || response.data || []);
      }
    } catch (error) {
      console.error('Error loading sizes:', error);
    }
  };

  const validateSizeForm = () => {
    const newErrors: Record<string, string> = {};

    if (!sizeName.trim()) {
      newErrors.sizeName = 'Size name is required';
    } else if (sizeName.length > 50) {
      newErrors.sizeName = 'Size name cannot exceed 50 characters';
    }

    if (displayOrder && parseInt(displayOrder) < 0) {
      newErrors.displayOrder = 'Display order cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateAssignmentForm = () => {
    const newErrors: Record<string, string> = {};

    if (!selectedProduct) {
      newErrors.product = 'Please select a product';
    }

    if (selectedSizes.length === 0) {
      newErrors.sizes = 'Please select at least one size';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateSize = async () => {
    if (!validateSizeForm()) {
      console.log('🔴 [CREATE SIZE] Validation failed');
      return;
    }

    try {
      setLoading(true);
      const sizeData = {
        size_name: sizeName.trim(),
        display_order: displayOrder ? parseInt(displayOrder) : 0,
        is_active: isSizeActive,
      };

      console.log('🔵 [CREATE SIZE] Starting size creation/update');
      console.log('🔵 [CREATE SIZE] Size data:', JSON.stringify(sizeData, null, 2));
      console.log('🔵 [CREATE SIZE] Editing size:', editingSize ? JSON.stringify(editingSize, null, 2) : 'null');

      let response;
      if (editingSize) {
        // Update existing size
        console.log('🔵 [CREATE SIZE] Updating existing size, ID:', editingSize.id);
        response = await api.put(`/sizes/${editingSize.id}`, sizeData);
      } else {
        // Create new size
        console.log('🔵 [CREATE SIZE] Creating new size via POST /sizes');
        response = await api.post('/sizes', sizeData);
      }

      console.log('🔵 [CREATE SIZE] Response:', JSON.stringify(response, null, 2));

      if (response.success) {
        console.log('✅ [CREATE SIZE] Size saved successfully');
        Alert.alert(t('common.success'), editingSize ? 'Size updated successfully' : 'Size created successfully', [
          { text: 'OK', onPress: () => {
            if (!editingSize) {
              setSizeName('');
              setDisplayOrder('');
              setIsSizeActive(true);
            }
            loadSizes();
            if (editingSize) {
              navigation.goBack();
            }
          }},
        ]);
      } else {
        console.log('🔴 [CREATE SIZE] Response not successful:', response.message);
        Alert.alert(t('common.error'), response.message || 'Failed to save size');
      }
    } catch (error: any) {
      console.log('❌ [CREATE SIZE] Error:', error);
      console.log('❌ [CREATE SIZE] Error response:', error.response?.data);
      console.log('❌ [CREATE SIZE] Error message:', error.message);
      const errorMessage = error.response?.data?.message
        || error.response?.data?.error
        || error.message
        || 'Failed to save size. Please try again.';
      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSizes = async () => {
    if (!validateAssignmentForm()) {
      return;
    }

    try {
      setLoading(true);
      const assignmentData = {
        product: selectedProduct,
        sizeIds: selectedSizes,
        price: 0,
        isDefault: false,
        isAvailable: true,
      };

      const response = await api.post('/product-sizes', assignmentData);

      if (response.success) {
        Alert.alert('Success', 'Sizes assigned to product successfully', [
          { text: 'OK', onPress: () => {
            setSelectedProduct('');
            setSelectedSizes([]);
            loadProducts();
          }},
        ]);
      } else {
        Alert.alert('Error', response.message || 'Failed to assign sizes');
      }
    } catch (error: any) {
      console.log('Size assignment error:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.message
        || error.response?.data?.error
        || error.message
        || 'Failed to assign sizes. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleSizeSelection = (sizeId: string) => {
    setSelectedSizes(prev =>
      prev.includes(sizeId)
        ? prev.filter(id => id !== sizeId)
        : [...prev, sizeId]
    );
    if (errors.sizes) {
      setErrors({ ...errors, sizes: '' });
    }
  };

  const renderSizesTab = () => (
    <View style={styles.formContainer}>
      <View style={styles.sectionTitle}>
        <Text style={styles.sectionTitleText}>Create New Size</Text>
        <Text style={styles.sectionDescription}>
          Add sizes like Small, Medium, Large, Extra Large, Family Size, etc.
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Size Name</Text>
        <TextInput
          style={[styles.input, errors.sizeName && styles.inputError]}
          placeholder="e.g., Large, Extra Large, Family Size"
          value={sizeName}
          onChangeText={(text) => {
            setSizeName(text);
            if (errors.sizeName) setErrors({ ...errors, sizeName: '' });
          }}
          autoCapitalize="words"
        />
        {errors.sizeName && <Text style={styles.errorText}>{errors.sizeName}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Display Order</Text>
        <TextInput
          style={[styles.input, errors.displayOrder && styles.inputError]}
          placeholder="e.g., 1 (for Small), 2 (for Medium)"
          value={displayOrder}
          onChangeText={(text) => {
            setDisplayOrder(text);
            if (errors.displayOrder) setErrors({ ...errors, displayOrder: '' });
          }}
          keyboardType="numeric"
        />
        {errors.displayOrder && <Text style={styles.errorText}>{errors.displayOrder}</Text>}
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Active</Text>
        <Switch
          value={isSizeActive}
          onValueChange={setIsSizeActive}
          trackColor={{ false: '#ddd', true: '#E87E35' }}
          thumbColor={isSizeActive ? '#fff' : '#f4f3f4'}
        />
      </View>

      <TouchableOpacity
        style={[styles.actionButton, loading && styles.actionButtonDisabled]}
        onPress={handleCreateSize}
        disabled={loading}
      >
        <Text style={styles.actionButtonText}>
          {loading ? (editingSize ? 'Updating...' : 'Creating...') : (editingSize ? 'Update Size' : 'Create Size')}
        </Text>
      </TouchableOpacity>

      {/* Existing Sizes */}
      <View style={styles.existingItems}>
        <Text style={styles.existingTitle}>Existing Sizes</Text>
        <ScrollView style={styles.sizeList} showsVerticalScrollIndicator={false}>
          {sizes.map((size) => (
            <View key={size.id} style={styles.sizeItem}>
              <View style={styles.sizeInfo}>
                <Text style={styles.sizeName}>{size.size_name}</Text>
                <Text style={styles.sizeOrder}>Order: {size.display_order}</Text>
              </View>
              <View style={[styles.statusBadge, size.is_active ? styles.activeBadge : styles.inactiveBadge]}>
                <Text style={[styles.statusText, size.is_active ? styles.activeText : styles.inactiveText]}>
                  {size.is_active ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  const renderAssignTab = () => (
    <View style={styles.formContainer}>
      <View style={styles.sectionTitle}>
        <Text style={styles.sectionTitleText}>Assign Sizes to Products</Text>
        <Text style={styles.sectionDescription}>
          Select a product and assign available sizes to it.
        </Text>
      </View>

      {/* Product Selection */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Select Product</Text>
        {errors.product && <Text style={styles.errorText}>{errors.product}</Text>}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productContainer}>
          {products.filter(p => p.isAvailable).map((product) => (
            <TouchableOpacity
              key={product._id}
              style={[
                styles.productChip,
                selectedProduct === product._id && styles.productChipSelected,
              ]}
              onPress={() => {
                setSelectedProduct(product._id);
                if (errors.product) setErrors({ ...errors, product: '' });
              }}
            >
              <Text style={[
                styles.productChipText,
                selectedProduct === product._id && styles.productChipTextSelected,
              ]}>
                {product.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Size Selection */}
      {selectedProduct && (
        <View style={styles.inputGroup}>
          <View style={styles.selectionHeader}>
            <Text style={styles.inputLabel}>Select Sizes ({selectedSizes.length} selected)</Text>
            <View style={styles.selectionButtons}>
              <TouchableOpacity 
                style={styles.selectBtn}
                onPress={() => {
                  const allActiveSizeIds = sizes.filter(s => s.is_active).map(s => s.id);
                  setSelectedSizes(allActiveSizeIds);
                  if (errors.sizes) setErrors({ ...errors, sizes: '' });
                }}
              >
                <Text style={styles.selectBtnText}>Select All</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.selectBtn}
                onPress={() => setSelectedSizes([])}
              >
                <Text style={styles.selectBtnText}>Deselect All</Text>
              </TouchableOpacity>
            </View>
          </View>
          {errors.sizes && <Text style={styles.errorText}>{errors.sizes}</Text>}
          <View style={styles.sizeGrid}>
            {sizes.filter(s => s.is_active).map((size) => (
              <TouchableOpacity
                key={size.id}
                style={[
                  styles.sizeChip,
                  selectedSizes.includes(size.id) && styles.sizeChipSelected,
                ]}
                onPress={() => toggleSizeSelection(size.id)}
              >
                <Text style={[
                  styles.sizeChipText,
                  selectedSizes.includes(size.id) && styles.sizeChipTextSelected,
                ]}>
                  {size.size_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {selectedProduct && selectedSizes.length > 0 && (
        <TouchableOpacity
          style={[styles.actionButton, loading && styles.actionButtonDisabled]}
          onPress={handleAssignSizes}
          disabled={loading}
        >
          <Text style={styles.actionButtonText}>
            {loading ? 'Assigning...' : 'Assign Sizes to Product'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { paddingTop: STATUSBAR_HEIGHT }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1a1a2e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {editingSize ? 'Edit Size' : 'Product Sizes'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sizes' && styles.activeTab]}
          onPress={() => setActiveTab('sizes')}
        >
          <Text style={[styles.tabText, activeTab === 'sizes' && styles.activeTabText]}>
            Manage Sizes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'assign' && styles.activeTab]}
          onPress={() => setActiveTab('assign')}
        >
          <Text style={[styles.tabText, activeTab === 'assign' && styles.activeTabText]}>
            Assign to Products
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {activeTab === 'sizes' ? renderSizesTab() : renderAssignTab()}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 16,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#E87E35',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#E87E35',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 20,
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
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
  inputError: {
    borderColor: '#f44336',
  },
  errorText: {
    fontSize: 12,
    color: '#f44336',
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  actionButton: {
    backgroundColor: '#E87E35',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  existingItems: {
    marginTop: 16,
  },
  existingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  sizeList: {
    maxHeight: 200,
  },
  sizeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fafafa',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  sizeInfo: {
    flex: 1,
  },
  sizeName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  sizeOrder: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#e8f5e8',
  },
  inactiveBadge: {
    backgroundColor: '#ffeaea',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeText: {
    color: '#4caf50',
  },
  inactiveText: {
    color: '#f44336',
  },
  productContainer: {
    maxHeight: 100,
  },
  productChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  productChipSelected: {
    backgroundColor: '#E87E35',
    borderColor: '#E87E35',
  },
  productChipText: {
    fontSize: 14,
    color: '#666',
  },
  productChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  sizeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  selectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E87E35',
  },
  selectBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  sizeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sizeChipSelected: {
    backgroundColor: '#E87E35',
    borderColor: '#E87E35',
  },
  sizeChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  sizeChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 100,
  },
});
