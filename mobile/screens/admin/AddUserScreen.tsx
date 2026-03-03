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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../components/api/client';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

// All available roles
const ALL_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'customer', label: 'Customer' },
  { value: 'rider', label: 'Rider' },
  { value: 'waiter', label: 'Waiter' },
  { value: 'chef', label: 'Chef' },
  { value: 'branch_manager', label: 'Branch Manager' },
];

// Manager can only add these roles
const MANAGER_ROLES = [
  { value: 'rider', label: 'Rider' },
  { value: 'waiter', label: 'Waiter' },
  { value: 'chef', label: 'Chef' },
];

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

export default function AddUserScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [branches, setBranches] = useState<{_id: string; branchName: string; branchCode: string}[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [managerBranchId, setManagerBranchId] = useState<string>('');
  
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'customer',
    branchId: '',
    phoneNumber: '',
    avatar: null as string | null,
    // Role-specific fields
    vehicleNumber: '',
    vehicleType: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadUserData();
    loadBranches();
  }, []);

  const loadUserData = async () => {
    try {
      const stored = await AsyncStorage.getItem('userData');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUserRole(parsed.role || '');
        if (parsed.assignedBranch?._id || parsed.branch?._id || parsed.branchId) {
          setManagerBranchId(parsed.assignedBranch?._id || parsed.branch?._id || parsed.branchId);
          // For managers, auto-set branchId
          if (parsed.role === 'BRANCH_MANAGER') {
            setFormData(prev => ({
              ...prev,
              branchId: parsed.assignedBranch?._id || parsed.branch?._id || parsed.branchId
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Full name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    // Role-specific validation
    if (formData.role === 'rider') {
      if (!formData.vehicleNumber.trim()) {
        newErrors.vehicleNumber = 'Vehicle number is required for riders';
      }
      if (!formData.vehicleType.trim()) {
        newErrors.vehicleType = 'Vehicle type is required for riders';
      }
    }

    // Branch assignment for staff members
    if (['waiter', 'chef', 'branch_manager'].includes(formData.role) && !formData.branchId.trim()) {
      newErrors.branchId = 'Branch assignment is required for staff members';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateUser = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/register', {
        name: formData.displayName,
        email: formData.email,
        password: formData.password,
        role: formData.role.toUpperCase(),
        phoneNumber: formData.phoneNumber || undefined,
        profileImage: formData.avatar || undefined,
        // Role-specific fields
        vehicleNumber: formData.vehicleNumber || undefined,
        vehicleType: formData.vehicleType || undefined,
        assignedBranchId: formData.branchId || undefined,
      });

      console.log('API Response:', response);

      if (response.success) {
        Alert.alert(
          'Success',
          'User created successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                // @ts-ignore
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to create user. Please try again.');
      }
    } catch (error: any) {
      console.log('Registration error:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.message 
        || error.response?.data?.error 
        || error.message 
        || 'Failed to create user. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // @ts-ignore
    navigation.goBack();
  };

  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access photos');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        updateField('avatar', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const removeAvatar = () => {
    updateField('avatar', null);
  };

  const updateField = (field: string, value: string | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const selectRole = (roleValue: string) => {
    updateField('role', roleValue);
    setShowRoleDropdown(false);
  };

  const getAvailableRoles = () => {
    if (userRole === 'BRANCH_MANAGER') {
      return MANAGER_ROLES;
    }
    return ALL_ROLES;
  };

  const getRoleLabel = (value: string) => {
    const allRoles = getAvailableRoles();
    return allRoles.find((r: {value: string; label: string}) => r.value === value)?.label || value;
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: STATUSBAR_HEIGHT }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1a1a2e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New User</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        <View style={styles.formContainer}>
          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={[styles.input, errors.displayName && styles.inputError]}
              placeholder="Enter full name"
              value={formData.displayName}
              onChangeText={(text) => updateField('displayName', text)}
              autoCapitalize="words"
            />
            {errors.displayName && (
              <Text style={styles.errorText}>{errors.displayName}</Text>
            )}
          </View>

          {/* Avatar Upload */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Profile Image (Optional)</Text>
            <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
              {formData.avatar ? (
                <View style={styles.avatarWrapper}>
                  <Image source={{ uri: formData.avatar }} style={styles.avatar} />
                  <TouchableOpacity
                    style={styles.removeAvatarButton}
                    onPress={removeAvatar}
                  >
                    <Ionicons name="close-circle" size={20} color="#f44336" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="camera" size={32} color="#999" />
                  <Text style={styles.avatarPlaceholderText}>Tap to select image</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="Enter email address"
              value={formData.email}
              onChangeText={(text) => updateField('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              placeholder="Enter password"
              value={formData.password}
              onChangeText={(text) => updateField('password', text)}
              secureTextEntry={true}
              autoCapitalize="none"
            />
            {errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <TextInput
              style={[styles.input, errors.confirmPassword && styles.inputError]}
              placeholder="Confirm password"
              value={formData.confirmPassword}
              onChangeText={(text) => updateField('confirmPassword', text)}
              secureTextEntry={true}
              autoCapitalize="none"
            />
            {errors.confirmPassword && (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            )}
          </View>

          {/* Role Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Role</Text>
            <TouchableOpacity
              style={[styles.input, errors.role && styles.inputError]}
              onPress={() => setShowRoleDropdown(true)}
            >
              <Text style={styles.dropdownText}>
                {getAvailableRoles().find((r: {value: string; label: string}) => r.value === formData.role)?.label || 'Select Role'}
              </Text>
            </TouchableOpacity>
            {errors.role && (
              <Text style={styles.errorText}>{errors.role}</Text>
            )}
          </View>

          {/* Rider-specific fields */}
          {formData.role === 'rider' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Vehicle Number</Text>
                <TextInput
                  style={[styles.input, errors.vehicleNumber && styles.inputError]}
                  placeholder="Enter vehicle number (e.g., ABC-123)"
                  value={formData.vehicleNumber}
                  onChangeText={(text) => updateField('vehicleNumber', text)}
                  autoCapitalize="characters"
                />
                {errors.vehicleNumber && (
                  <Text style={styles.errorText}>{errors.vehicleNumber}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Vehicle Type</Text>
                <TextInput
                  style={[styles.input, errors.vehicleType && styles.inputError]}
                  placeholder="Enter vehicle type (e.g., Motorcycle, Car)"
                  value={formData.vehicleType}
                  onChangeText={(text) => updateField('vehicleType', text)}
                  autoCapitalize="words"
                />
                {errors.vehicleType && (
                  <Text style={styles.errorText}>{errors.vehicleType}</Text>
                )}
              </View>
            </>
          )}

          {/* Branch assignment for staff members */}
          {['waiter', 'chef', 'branch_manager'].includes(formData.role) && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Assigned Branch</Text>
              <TouchableOpacity 
                style={[styles.dropdown, errors.branchId && styles.inputError]}
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
                  {formData.branchId 
                    ? branches.find(b => b._id === formData.branchId)?.branchName || 'Select Branch'
                    : 'Select Branch'}
                </Text>
                {branches.find(b => b._id === formData.branchId)?.branchCode && (
                  <View style={styles.branchCodeBadge}>
                    <Text style={styles.branchCodeText}>
                      {branches.find(b => b._id === formData.branchId)?.branchCode}
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
                        formData.branchId === branch._id && styles.dropdownItemActive
                      ]}
                      onPress={() => {
                        updateField('branchId', branch._id);
                        setShowBranchDropdown(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        formData.branchId === branch._id && styles.dropdownItemTextActive
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
              
              {errors.branchId && (
                <Text style={styles.errorText}>{errors.branchId}</Text>
              )}
            </View>
          )}

          {/* Phone Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter phone number"
              value={formData.phoneNumber}
              onChangeText={(text) => updateField('phoneNumber', text)}
              keyboardType="phone-pad"
            />
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.createButton, loading && styles.createButtonDisabled]}
              onPress={handleCreateUser}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.createButtonText}>Create User</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>

        </View>
        <View style={styles.bottomSpacer} />

        {/* Footer with buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleCreateUser}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Create User</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Role Selection Modal */}
      <Modal
        visible={showRoleDropdown}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRoleDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRoleDropdown(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Role</Text>
              <TouchableOpacity onPress={() => setShowRoleDropdown(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            {getAvailableRoles().map((role: {value: string; label: string}) => (
              <TouchableOpacity
                key={role.value}
                style={styles.roleOption}
                onPress={() => selectRole(role.value)}
              >
                <View style={styles.radioButton}>
                  {formData.role === role.value && (
                    <View style={styles.radioButtonSelected} />
                  )}
                </View>
                <Text style={styles.roleOptionText}>{role.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  headerRight: {
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
  inputError: {
    borderColor: '#f44336',
  },
  errorText: {
    fontSize: 12,
    color: '#f44336',
    marginTop: 4,
  },
  avatarContainer: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fafafa',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  removeAvatarButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  dropdownText: {
    fontSize: 15,
    color: '#333',
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
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  createButton: {
    flex: 1,
    backgroundColor: '#E87E35',
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E87E35',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E87E35',
  },
  roleOptionText: {
    fontSize: 16,
    color: '#1a1a2e',
    fontWeight: '500',
  },
});
