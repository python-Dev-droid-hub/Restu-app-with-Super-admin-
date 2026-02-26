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
  ActivityIndicator,
  Switch,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../components/api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

interface Category {
  _id: string;
  name: string;
}

interface Size {
  id: string;
  size_name: string;
  display_order: number;
  is_active: boolean;
}

interface ProductSize {
  size_id: string;
  size_name: string;
  price: number;
}

interface Product {
  _id: string;
  name: string;
  description?: string;
  category: string;
  price?: number;
  hasSizes: boolean;
  imageUrl?: string;
  isAvailable: boolean;
  preparationTime?: number;
  isVegetarian: boolean;
  spiceLevel?: string;
  availableForDelivery: boolean;
  availableForDineIn: boolean;
  availableForTakeaway: boolean;
}

export default function AddProductScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'details' | 'sizes'>('details');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableSizes, setAvailableSizes] = useState<Size[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [managerBranchId, setManagerBranchId] = useState<string | null>(null);
  const [managerBranchName, setManagerBranchName] = useState<string>('');
  const [branches, setBranches] = useState<{_id: string; branchName: string; branchCode: string}[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  
  // Product details - updated to match SQL schema
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [price, setPrice] = useState('');
  const [hasSizes, setHasSizes] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [preparationTime, setPreparationTime] = useState('');
  const [isVegetarian, setIsVegetarian] = useState(false);
  const [spiceLevel, setSpiceLevel] = useState('');
  const [availableForDelivery, setAvailableForDelivery] = useState(true);
  const [availableForDineIn, setAvailableForDineIn] = useState(true);
  const [availableForTakeaway, setAvailableForTakeaway] = useState(true);
  
  // Product sizes (selected from available sizes)
  const [selectedSizes, setSelectedSizes] = useState<ProductSize[]>([]);

  useEffect(() => {
    loadManagerBranch();
    loadBranches();
    loadCategories();
    loadSizes();
    // Check if editing an existing product
    const route = navigation.getState()?.routes?.find(r => r.name === 'AddProduct');
    if (route?.params?.product) {
      const product = route.params.product as Product;
      setEditingProduct(product);
      populateFormWithProduct(product);
    }
  }, [navigation]);

  const loadManagerBranch = async () => {
    try {
      const stored = await AsyncStorage.getItem('userData');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUserRole(parsed.role || '');
        
        // For managers, get their assigned branch
        if (parsed.assignedBranch) {
          const branchData = parsed.assignedBranch;
          setManagerBranchId(branchData._id || branchData);
          setManagerBranchName(branchData.branchName || branchData.name || '');
          setSelectedBranchId(branchData._id || branchData);
        } else if (parsed.branch) {
          setManagerBranchId(parsed.branch._id || parsed.branchId || parsed.assigned_branch_id);
          setManagerBranchName(parsed.branch.name || parsed.branch.branchName || '');
          setSelectedBranchId(parsed.branch._id || parsed.branchId);
        } else if (parsed.assigned_branch_id || parsed.branchId) {
          setManagerBranchId(parsed.assigned_branch_id || parsed.branchId);
          setSelectedBranchId(parsed.assigned_branch_id || parsed.branchId);
        }
      }
    } catch (error) {
      console.error('Error loading manager branch:', error);
    }
  };

  const loadBranches = async () => {
    try {
      const response = await api.get('/restaurants');
      if (response.success && response.data) {
        const branchList = Array.isArray(response.data) 
          ? response.data 
          : response.data.restaurants || response.data.branches || [];
        setBranches(branchList.map((b: any) => ({
          _id: b._id,
          branchName: b.branchName || b.name,
          branchCode: b.branchCode || b.code || ''
        })));
      }
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const populateFormWithProduct = (product: Product) => {
    setProductName(product.name);
    setDescription(product.description || '');
    setSelectedCategory(product.category);
    setPrice(product.price ? product.price.toString() : '');
    setHasSizes(product.hasSizes);
    setImage(product.imageUrl || null);
    setIsAvailable(product.isAvailable);
    setPreparationTime(product.preparationTime ? product.preparationTime.toString() : '');
    setIsVegetarian(product.isVegetarian || false);
    setSpiceLevel(product.spiceLevel || '');
    setAvailableForDelivery(product.availableForDelivery !== false);
    setAvailableForDineIn(product.availableForDineIn !== false);
    setAvailableForTakeaway(product.availableForTakeaway !== false);
  };

  const loadCategories = async () => {
    try {
      const response = await api.get('/menu/admin/categories');
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
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
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
    }
  };

  const handleImageUpload = () => {
    Alert.alert(
      'Upload Image',
      'Choose an option',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Photo Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const loadSizes = async () => {
    try {
      const response = await api.get('/sizes');
      if (response.success && response.data) {
        setAvailableSizes(response.data.sizes || response.data || []);
      }
    } catch (error) {
      console.error('Error loading sizes:', error);
    }
  };

  const toggleSizeSelection = (size: Size) => {
    const existingIndex = selectedSizes.findIndex(s => s.size_id === size.id);
    if (existingIndex >= 0) {
      // Remove size
      setSelectedSizes(selectedSizes.filter((_, i) => i !== existingIndex));
    } else {
      // Add size with default price
      setSelectedSizes([...selectedSizes, {
        size_id: size.id,
        size_name: size.size_name,
        price: 0
      }]);
    }
  };

  const updateSizePrice = (sizeId: string, price: number) => {
    setSelectedSizes(selectedSizes.map(s => 
      s.size_id === sizeId ? { ...s, price } : s
    ));
  };

  const isSizeSelected = (sizeId: string) => {
    return selectedSizes.some(s => s.size_id === sizeId);
  };

  const handleSave = async () => {
    if (!productName.trim()) {
      Alert.alert('Error', 'Product name is required');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    if (hasSizes && selectedSizes.length === 0) {
      Alert.alert('Error', 'Products with sizes must have at least one size selected');
      return;
    }

    try {
      setLoading(true);

      // Upload image first if selected
      let imageUrl = image;
      if (image && !image.startsWith('http')) {
        console.log('🔍 [PRODUCT DEBUG] Uploading image...');
        
        try {
          // Read image as base64 for more reliable upload
          const response = await fetch(image);
          const blob = await response.blob();
          
          // Convert to base64
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              // Remove data:image/jpeg;base64, prefix if present
              const base64Data = result.split(',')[1] || result;
              resolve(base64Data);
            };
            reader.readAsDataURL(blob);
          });
          
          console.log('🔍 [PRODUCT DEBUG] Image converted to base64, length:', base64.length);
          
          // Upload as base64
          const uploadResponse = await api.post('/upload', {
            image: base64,
            filename: 'product.jpg',
            mimeType: 'image/jpeg'
          });
          
          console.log('🔍 [PRODUCT DEBUG] Base64 upload response:', uploadResponse);
          
          if (uploadResponse.success) {
            imageUrl = uploadResponse.data.url;
            console.log('🔍 [PRODUCT DEBUG] New imageUrl:', imageUrl);
          } else {
            console.log('🔍 [PRODUCT DEBUG] Upload failed, proceeding without image');
            imageUrl = null;
          }
        } catch (uploadError) {
          console.log('🔍 [PRODUCT DEBUG] Base64 conversion/upload failed:', uploadError);
          imageUrl = null;
        }
      }

      const productData: any = {
        name: productName,
        description: description || undefined,
        category: selectedCategory,
        hasSizes,
        imageUrl: imageUrl || undefined,
        isAvailable,
        preparationTime: preparationTime ? parseInt(preparationTime) : undefined,
        isVegetarian,
        spiceLevel: spiceLevel || undefined,
        availableForDelivery,
        availableForDineIn,
        availableForTakeaway,
        branchId: selectedBranchId || managerBranchId || undefined,
      };

      // Add price for products without sizes
      if (!hasSizes) {
        productData.price = parseFloat(price);
      }

      let response;
      if (editingProduct) {
        // Update existing product
        response = await api.put(`/menu/admin/products/${editingProduct._id}`, productData);
      } else {
        // Create new product
        response = await api.post('/menu/admin/products', productData);
      }

      if (response.success) {
        Alert.alert(
          'Success', 
          editingProduct ? 'Product updated successfully' : 'Product added successfully',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to save product');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert('Error', 'Failed to save product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderDetailsTab = () => (
    <View style={styles.formContainer}>
      {/* Branch Selector */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Branch</Text>
        <TouchableOpacity 
          style={styles.dropdown}
          onPress={() => {
            // For managers, don't allow changing branch
            if (userRole === 'BRANCH_MANAGER') {
              return;
            }
            setShowBranchDropdown(!showBranchDropdown);
          }}
        >
          <Ionicons name="business-outline" size={18} color="#E87E35" />
          <Text style={styles.dropdownText}>
            {selectedBranchId 
              ? branches.find(b => b._id === selectedBranchId)?.branchName || 'Select Branch'
              : managerBranchName || 'Select Branch'}
          </Text>
          {branches.find(b => b._id === selectedBranchId)?.branchCode && (
            <View style={styles.branchCodeBadge}>
              <Text style={styles.branchCodeText}>
                {branches.find(b => b._id === selectedBranchId)?.branchCode}
              </Text>
            </View>
          )}
          {userRole !== 'BRANCH_MANAGER' && (
            <Ionicons name={showBranchDropdown ? "chevron-up" : "chevron-down"} size={16} color="#999" />
          )}
        </TouchableOpacity>
        
        {showBranchDropdown && userRole !== 'BRANCH_MANAGER' && (
          <View style={styles.dropdownList}>
            {branches.map(branch => (
              <TouchableOpacity
                key={branch._id}
                style={[
                  styles.dropdownItem,
                  selectedBranchId === branch._id && styles.dropdownItemActive
                ]}
                onPress={() => {
                  setSelectedBranchId(branch._id);
                  setShowBranchDropdown(false);
                }}
              >
                <Text style={[
                  styles.dropdownItemText,
                  selectedBranchId === branch._id && styles.dropdownItemTextActive
                ]}>
                  {branch.branchName}
                </Text>
                {branch.branchCode && (
                  <Text style={styles.dropdownItemCode}>{branch.branchCode}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Product Name</Text>
        <TextInput
          style={styles.input}
          value={productName}
          onChangeText={setProductName}
          placeholder="Enter product name"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter product description"
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Category</Text>
        <View style={styles.categoryContainer}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category._id}
              style={[
                styles.categoryChip,
                selectedCategory === category._id && styles.categoryChipSelected,
              ]}
              onPress={() => setSelectedCategory(category._id)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === category._id && styles.categoryChipTextSelected,
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Base Price (for products without sizes)</Text>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          placeholder="0.00"
          placeholderTextColor="#999"
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Has Multiple Sizes</Text>
        <Switch
          value={hasSizes}
          onValueChange={setHasSizes}
          trackColor={{ false: '#ddd', true: '#E87E35' }}
          thumbColor={hasSizes ? '#fff' : '#f4f3f4'}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Product Image (Optional)</Text>
        <TouchableOpacity style={styles.imageUploadBox} onPress={handleImageUpload}>
          {image ? (
            <Image source={{ uri: image }} style={styles.uploadedImage} />
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Ionicons name="camera" size={48} color="#ccc" />
              <Text style={styles.uploadText}>Tap to upload product image</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Preparation Time (minutes)</Text>
        <TextInput
          style={styles.input}
          value={preparationTime}
          onChangeText={setPreparationTime}
          placeholder="e.g., 15"
          placeholderTextColor="#999"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Vegetarian</Text>
        <Switch
          value={isVegetarian}
          onValueChange={setIsVegetarian}
          trackColor={{ false: '#ddd', true: '#E87E35' }}
          thumbColor={isVegetarian ? '#fff' : '#f4f3f4'}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Spice Level (Optional)</Text>
        <TextInput
          style={styles.input}
          value={spiceLevel}
          onChangeText={setSpiceLevel}
          placeholder="e.g., Mild, Medium, Hot"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Available for Delivery</Text>
        <Switch
          value={availableForDelivery}
          onValueChange={setAvailableForDelivery}
          trackColor={{ false: '#ddd', true: '#E87E35' }}
          thumbColor={availableForDelivery ? '#fff' : '#f4f3f4'}
        />
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Available for Dine-in</Text>
        <Switch
          value={availableForDineIn}
          onValueChange={setAvailableForDineIn}
          trackColor={{ false: '#ddd', true: '#E87E35' }}
          thumbColor={availableForDineIn ? '#fff' : '#f4f3f4'}
        />
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Available for Takeaway</Text>
        <Switch
          value={availableForTakeaway}
          onValueChange={setAvailableForTakeaway}
          trackColor={{ false: '#ddd', true: '#E87E35' }}
          thumbColor={availableForTakeaway ? '#fff' : '#f4f3f4'}
        />
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Available</Text>
        <Switch
          value={isAvailable}
          onValueChange={setIsAvailable}
          trackColor={{ false: '#ddd', true: '#E87E35' }}
          thumbColor={isAvailable ? '#fff' : '#f4f3f4'}
        />
      </View>
    </View>
  );

  const renderSizesTab = () => (
    <View style={styles.formContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Available Sizes</Text>
        <Text style={styles.sectionDescription}>
          Select sizes and set prices for this product
        </Text>
      </View>

      {availableSizes.filter(s => s.is_active).length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="resize-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No sizes available</Text>
          <Text style={styles.emptySubtext}>Create sizes in Product Sizes first</Text>
        </View>
      ) : (
        <>
          {/* Select All / Deselect All */}
          <View style={styles.selectionButtons}>
            <TouchableOpacity 
              style={styles.selectBtn}
              onPress={() => {
                const allActiveSizes = availableSizes.filter(s => s.is_active);
                setSelectedSizes(allActiveSizes.map(s => ({
                  size_id: s.id,
                  size_name: s.size_name,
                  price: 0
                })));
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

          {/* Size List */}
          {availableSizes.filter(s => s.is_active).map((size) => {
            const isSelected = isSizeSelected(size.id);
            const selectedSize = selectedSizes.find(s => s.size_id === size.id);
            
            return (
              <View key={size.id} style={styles.sizeItem}>
                <TouchableOpacity 
                  style={styles.sizeSelectRow}
                  onPress={() => toggleSizeSelection(size)}
                >
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                  <Text style={styles.sizeName}>{size.size_name}</Text>
                </TouchableOpacity>
                
                {isSelected && (
                  <View style={styles.priceInputRow}>
                    <Text style={styles.priceLabel}>Price:</Text>
                    <TextInput
                      style={styles.priceInput}
                      value={selectedSize?.price.toString() || '0'}
                      onChangeText={(text) => updateSizePrice(size.id, parseFloat(text) || 0)}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor="#999"
                    />
                  </View>
                )}
              </View>
            );
          })}
        </>
      )}

      {/* Selected Sizes Summary */}
      {selectedSizes.length > 0 && (
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Selected Sizes ({selectedSizes.length})</Text>
          {selectedSizes.map((s) => (
            <View key={s.size_id} style={styles.summaryItem}>
              <Text style={styles.summaryName}>{s.size_name}</Text>
              <Text style={styles.summaryPrice}>${s.price.toFixed(2)}</Text>
            </View>
          ))}
        </View>
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
          {editingProduct ? 'Edit Product' : 'Add New Product'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'details' && styles.activeTab]}
          onPress={() => setActiveTab('details')}
        >
          <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>
            Details
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sizes' && styles.activeTab]}
          onPress={() => setActiveTab('sizes')}
        >
          <Text style={[styles.tabText, activeTab === 'sizes' && styles.activeTabText]}>
            Sizes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
          {activeTab === 'details' ? renderDetailsTab() : renderSizesTab()}
          <View style={styles.bottomSpacer} />

          {/* Save Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Saving...' : 'Save Product'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
    gap: 8,
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  branchCodeBadge: {
    backgroundColor: '#E87E35',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  branchCodeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },
  dropdownList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#fff',
    maxHeight: 200,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemActive: {
    backgroundColor: '#FFF3E0',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
  },
  dropdownItemTextActive: {
    color: '#E87E35',
    fontWeight: '600',
  },
  dropdownItemCode: {
    fontSize: 12,
    color: '#E87E35',
    fontWeight: '600',
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
  textArea: {
    height: 100,
    paddingTop: 12,
    paddingBottom: 12,
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
    resizeMode: 'cover',
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
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryChipSelected: {
    backgroundColor: '#E87E35',
    borderColor: '#E87E35',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
  },
  categoryChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
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
  switchDescription: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  selectionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
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
  sizeItem: {
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  sizeSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#E87E35',
    borderColor: '#E87E35',
  },
  sizeName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingLeft: 36,
    gap: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  summarySection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  summaryName: {
    fontSize: 14,
    color: '#333',
  },
  summaryPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E87E35',
  },
  addOptionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  optionInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  optionNameInput: {
    flex: 1,
  },
  optionPriceInput: {
    width: 80,
  },
  addOptionButton: {
    backgroundColor: '#E87E35',
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsList: {
    marginTop: 8,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fafafa',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  optionPrice: {
    fontSize: 14,
    color: '#E87E35',
    fontWeight: '600',
  },
  removeOptionButton: {
    padding: 8,
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
});
