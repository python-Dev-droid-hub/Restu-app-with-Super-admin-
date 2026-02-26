import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  Switch,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../components/api/client';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

interface Branch {
  _id: string;
  branchName: string;
  branchCode: string;
}

const DISCOUNT_TYPES = [
  { value: 'PERCENTAGE', label: 'Percentage (%)' },
  { value: 'FIXED_AMOUNT', label: 'Fixed Amount (PKR)' },
];

export default function AddCouponScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Coupon details
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [discountType, setDiscountType] = useState('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [maxUsage, setMaxUsage] = useState('1');
  const [maxUsagePerCustomer, setMaxUsagePerCustomer] = useState('1');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [excludeDealProducts, setExcludeDealProducts] = useState(true);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadBranches();
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!code.trim()) {
      newErrors.code = 'Coupon code is required';
    } else if (code.length > 50) {
      newErrors.code = 'Coupon code cannot exceed 50 characters';
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

    if (maxUsage && parseInt(maxUsage) <= 0) {
      newErrors.maxUsage = 'Maximum usage must be greater than 0';
    }

    if (maxUsagePerCustomer && parseInt(maxUsagePerCustomer) <= 0) {
      newErrors.maxUsagePerCustomer = 'Maximum usage per customer must be greater than 0';
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

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const couponData: any = {
        code: code.toUpperCase(),
        description: description || undefined,
        branchId: selectedBranch || undefined,
        discountType,
        discountValue: parseFloat(discountValue),
        maxUsage: maxUsage ? parseInt(maxUsage) : 1,
        maxUsagePerCustomer: maxUsagePerCustomer ? parseInt(maxUsagePerCustomer) : 1,
        minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : 0,
        maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : undefined,
        startDate,
        expiryDate,
        isActive,
        excludeDealProducts,
      };

      const response = await api.post('/coupons', couponData);

      if (response.success) {
        Alert.alert('Success', 'Coupon created successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', response.message || 'Failed to create coupon');
      }
    } catch (error: any) {
      console.log('Coupon creation error:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.message
        || error.response?.data?.error
        || error.message
        || 'Failed to create coupon. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatDateForInput = (dateString: string) => {
    // Convert to YYYY-MM-DD format for HTML date input
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
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

  return (
    <SafeAreaView style={[styles.container, { paddingTop: STATUSBAR_HEIGHT }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1a1a2e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Coupon</Text>
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
          {/* Coupon Code */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Coupon Code</Text>
            <TextInput
              style={[styles.input, errors.code && styles.inputError]}
              placeholder="e.g., WELCOME10"
              value={code}
              onChangeText={(text) => {
                setCode(text.toUpperCase());
                if (errors.code) setErrors({ ...errors, code: '' });
              }}
              autoCapitalize="characters"
              maxLength={50}
            />
            {errors.code && <Text style={styles.errorText}>{errors.code}</Text>}
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe the coupon..."
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
              placeholder={discountType === 'PERCENTAGE' ? "10" : "100"}
              value={discountValue}
              onChangeText={(text) => {
                setDiscountValue(text);
                if (errors.discountValue) setErrors({ ...errors, discountValue: '' });
              }}
              keyboardType="decimal-pad"
            />
            {errors.discountValue && <Text style={styles.errorText}>{errors.discountValue}</Text>}
          </View>

          {/* Usage Limits */}
          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, styles.halfInput]}>
              <Text style={styles.inputLabel}>Max Total Usage</Text>
              <TextInput
                style={[styles.input, errors.maxUsage && styles.inputError]}
                placeholder="1"
                value={maxUsage}
                onChangeText={(text) => {
                  setMaxUsage(text);
                  if (errors.maxUsage) setErrors({ ...errors, maxUsage: '' });
                }}
                keyboardType="numeric"
              />
              {errors.maxUsage && <Text style={styles.errorText}>{errors.maxUsage}</Text>}
            </View>
            <View style={[styles.inputGroup, styles.halfInput]}>
              <Text style={styles.inputLabel}>Max Per Customer</Text>
              <TextInput
                style={[styles.input, errors.maxUsagePerCustomer && styles.inputError]}
                placeholder="1"
                value={maxUsagePerCustomer}
                onChangeText={(text) => {
                  setMaxUsagePerCustomer(text);
                  if (errors.maxUsagePerCustomer) setErrors({ ...errors, maxUsagePerCustomer: '' });
                }}
                keyboardType="numeric"
              />
              {errors.maxUsagePerCustomer && <Text style={styles.errorText}>{errors.maxUsagePerCustomer}</Text>}
            </View>
          </View>

          {/* Order Amount Conditions */}
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
              <Text style={styles.switchLabel}>Exclude Deal Products</Text>
              <Text style={styles.switchDescription}>
                Cannot apply coupon to products with active deals
              </Text>
            </View>
            <Switch
              value={excludeDealProducts}
              onValueChange={setExcludeDealProducts}
              trackColor={{ false: '#ddd', true: '#E87E35' }}
              thumbColor={excludeDealProducts ? '#fff' : '#f4f3f4'}
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
              {loading ? 'Creating...' : 'Create Coupon'}
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
  scrollView: {
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
