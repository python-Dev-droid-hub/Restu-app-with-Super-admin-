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
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../components/api/client';

interface Branch {
  _id: string;
  branchName: string;
  branchCode: string;
}

interface Product {
  _id: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

const DISCOUNT_TYPES = [
  { value: 'PERCENTAGE', label: 'Percentage (%)' },
  { value: 'FIXED_AMOUNT', label: 'Fixed Amount (PKR)' },
];

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

export default function AddDealScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  // Deal details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [discountType, setDiscountType] = useState('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [excludeCoupons, setExcludeCoupons] = useState(true);

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

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadBranches();
    loadProducts();
  }, []);

  const loadBranches = async () => {
    try {
      const response = await api.get('/branches');
      if (response.success) {
        setBranches(response.data.branches || []);
      }
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await api.get('/products');
      if (response.success) {
        setProducts(response.data.products || []);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Deal title is required';
    }

    if (!discountType) {
      newErrors.discountType = 'Discount type is required';
    }

    if (!discountValue.trim()) {
      newErrors.discountValue = 'Discount value is required';
    } else {
      const value = parseFloat(discountValue);
      if (isNaN(value) || value <= 0) {
        newErrors.discountValue = 'Discount value must be a positive number';
      } else if (discountType === 'PERCENTAGE' && value > 100) {
        newErrors.discountValue = 'Percentage discount cannot exceed 100%';
      }
    }

    if (selectedProducts.length === 0) {
      newErrors.products = 'Please select at least one product for this deal';
    }

    if (minOrderAmount && parseFloat(minOrderAmount) < 0) {
      newErrors.minOrderAmount = 'Minimum order amount cannot be negative';
    }

    if (maxDiscountAmount && parseFloat(maxDiscountAmount) < 0) {
      newErrors.maxDiscountAmount = 'Maximum discount amount cannot be negative';
    }

    if (!startDate.trim()) {
      newErrors.startDate = 'Start date is required';
    }

    if (!expiryDate.trim()) {
      newErrors.expiryDate = 'Expiry date is required';
    }

    if (startDate && expiryDate && new Date(startDate) >= new Date(expiryDate)) {
      newErrors.expiryDate = 'Expiry date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
    if (errors.products) {
      setErrors({ ...errors, products: '' });
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      // Upload image first if selected
      let imageUrl = null;
      if (image) {
        const formData = new FormData();
        formData.append('image', {
          uri: image,
          type: 'image/jpeg',
          name: 'deal.jpg',
        } as any);
        
        const uploadResponse = await api.post('/upload', formData);
        
        if (uploadResponse.success) {
          imageUrl = uploadResponse.data.url;
        }
      }

      const dealData: any = {
        title,
        description: description || undefined,
        branchId: selectedBranch || undefined,
        discountType,
        discountValue: parseFloat(discountValue),
        maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : undefined,
        minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : 0,
        startDate,
        expiryDate,
        imageUrl: imageUrl || undefined,
        isActive,
        excludeCoupons,
        productIds: selectedProducts,
      };

      const response = await api.post('/deals', dealData);

      if (response.success) {
        Alert.alert('Success', 'Deal created successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', response.message || 'Failed to create deal');
      }
    } catch (error: any) {
      console.log('Deal creation error:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.message
        || error.response?.data?.error
        || error.message
        || 'Failed to create deal. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderBranchSelector = () => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>Branch (Optional - Leave empty for all branches)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.branchContainer}>
        <TouchableOpacity
          style={[
            styles.branchChip,
            !selectedBranch && styles.branchChipSelected,
          ]}
          onPress={() => setSelectedBranch('')}
        >
          <Text style={[
            styles.branchChipText,
            !selectedBranch && styles.branchChipTextSelected,
          ]}>
            All Branches
          </Text>
        </TouchableOpacity>
        {branches.map((branch) => (
          <TouchableOpacity
            key={branch._id}
            style={[
              styles.branchChip,
              selectedBranch === branch._id && styles.branchChipSelected,
            ]}
            onPress={() => setSelectedBranch(branch._id)}
          >
            <Text style={[
              styles.branchChipText,
              selectedBranch === branch._id && styles.branchChipTextSelected,
            ]}>
              {branch.branchCode} - {branch.branchName}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderProductSelector = () => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>Select Products ({selectedProducts.length} selected)</Text>
      {errors.products && <Text style={styles.errorText}>{errors.products}</Text>}
      <ScrollView style={styles.productList} showsVerticalScrollIndicator={false}>
        {products.filter(p => p.isAvailable).map((product) => (
          <TouchableOpacity
            key={product._id}
            style={[
              styles.productItem,
              selectedProducts.includes(product._id) && styles.productItemSelected,
            ]}
            onPress={() => toggleProductSelection(product._id)}
          >
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productPrice}>PKR {product.price.toFixed(2)}</Text>
            </View>
            <View style={[
              styles.checkbox,
              selectedProducts.includes(product._id) && styles.checkboxSelected,
            ]}>
              {selectedProducts.includes(product._id) && (
                <Ionicons name="checkmark" size={16} color="#fff" />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
        <Text style={styles.headerTitle}>Add New Deal</Text>
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
          {/* Deal Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Deal Title</Text>
            <TextInput
              style={[styles.input, errors.title && styles.inputError]}
              placeholder="e.g., Weekend Special 20% Off"
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
            <Text style={styles.inputLabel}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe the deal..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Branch Selection */}
          {renderBranchSelector()}

          {/* Discount Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Discount Type</Text>
            <View style={styles.discountTypeContainer}>
              {DISCOUNT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.discountTypeOption,
                    discountType === type.value && styles.discountTypeOptionSelected,
                  ]}
                  onPress={() => setDiscountType(type.value)}
                >
                  <Text style={[
                    styles.discountTypeText,
                    discountType === type.value && styles.discountTypeTextSelected,
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Discount Value */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Discount Value ({discountType === 'PERCENTAGE' ? '%' : 'PKR'})
            </Text>
            <TextInput
              style={[styles.input, errors.discountValue && styles.inputError]}
              placeholder={discountType === 'PERCENTAGE' ? "20" : "500"}
              value={discountValue}
              onChangeText={(text) => {
                setDiscountValue(text);
                if (errors.discountValue) setErrors({ ...errors, discountValue: '' });
              }}
              keyboardType="decimal-pad"
            />
            {errors.discountValue && <Text style={styles.errorText}>{errors.discountValue}</Text>}
          </View>

          {/* Discount Conditions */}
          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, styles.halfInput]}>
              <Text style={styles.inputLabel}>Min Order Amount (PKR)</Text>
              <TextInput
                style={[styles.input, errors.minOrderAmount && styles.inputError]}
                placeholder="0"
                value={minOrderAmount}
                onChangeText={(text) => {
                  setMinOrderAmount(text);
                  if (errors.minOrderAmount) setErrors({ ...errors, minOrderAmount: '' });
                }}
                keyboardType="decimal-pad"
              />
              {errors.minOrderAmount && <Text style={styles.errorText}>{errors.minOrderAmount}</Text>}
            </View>
            <View style={[styles.inputGroup, styles.halfInput]}>
              <Text style={styles.inputLabel}>Max Discount (PKR)</Text>
              <TextInput
                style={[styles.input, errors.maxDiscountAmount && styles.inputError]}
                placeholder="Optional"
                value={maxDiscountAmount}
                onChangeText={(text) => {
                  setMaxDiscountAmount(text);
                  if (errors.maxDiscountAmount) setErrors({ ...errors, maxDiscountAmount: '' });
                }}
                keyboardType="decimal-pad"
              />
              {errors.maxDiscountAmount && <Text style={styles.errorText}>{errors.maxDiscountAmount}</Text>}
            </View>
          </View>

          {/* Date Range */}
          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, styles.halfInput]}>
              <Text style={styles.inputLabel}>Start Date</Text>
              <TextInput
                style={[styles.input, errors.startDate && styles.inputError]}
                placeholder="YYYY-MM-DD"
                value={startDate}
                onChangeText={(text) => {
                  setStartDate(text);
                  if (errors.startDate) setErrors({ ...errors, startDate: '' });
                }}
              />
              {errors.startDate && <Text style={styles.errorText}>{errors.startDate}</Text>}
            </View>
            <View style={[styles.inputGroup, styles.halfInput]}>
              <Text style={styles.inputLabel}>Expiry Date</Text>
              <TextInput
                style={[styles.input, errors.expiryDate && styles.inputError]}
                placeholder="YYYY-MM-DD"
                value={expiryDate}
                onChangeText={(text) => {
                  setExpiryDate(text);
                  if (errors.expiryDate) setErrors({ ...errors, expiryDate: '' });
                }}
              />
              {errors.expiryDate && <Text style={styles.errorText}>{errors.expiryDate}</Text>}
            </View>
          </View>

          {/* Image Upload */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Deal Image (Optional)</Text>
            <TouchableOpacity style={styles.imageUploadBox} onPress={handleImageUpload}>
              {image ? (
                <Image source={{ uri: image }} style={styles.uploadedImage} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="camera" size={48} color="#ccc" />
                  <Text style={styles.uploadText}>Tap to upload deal image</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Product Selection */}
          {renderProductSelector()}

          {/* Switches */}
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Active</Text>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: '#ddd', true: '#E87E35' }}
              thumbColor={isActive ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Exclude Coupons</Text>
              <Text style={styles.switchDescription}>
                Cannot combine with coupon discounts
              </Text>
            </View>
            <Switch
              value={excludeCoupons}
              onValueChange={setExcludeCoupons}
              trackColor={{ false: '#ddd', true: '#E87E35' }}
              thumbColor={excludeCoupons ? '#fff' : '#f4f3f4'}
            />
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
              {loading ? 'Creating...' : 'Create Deal'}
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
  keyboardView: {
    flex: 1,
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
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  branchContainer: {
    maxHeight: 100,
  },
  branchChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  branchChipSelected: {
    backgroundColor: '#E87E35',
    borderColor: '#E87E35',
  },
  branchChipText: {
    fontSize: 14,
    color: '#666',
  },
  branchChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  discountTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  discountTypeOption: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  discountTypeOptionSelected: {
    backgroundColor: '#E87E35',
    borderColor: '#E87E35',
  },
  discountTypeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  discountTypeTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  productList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 8,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#fafafa',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  productItemSelected: {
    backgroundColor: '#fff5f0',
    borderColor: '#E87E35',
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
    fontSize: 14,
    color: '#666',
    marginTop: 2,
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
