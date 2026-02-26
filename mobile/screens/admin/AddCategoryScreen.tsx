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
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../components/api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

export default function AddCategoryScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [managerBranchId, setManagerBranchId] = useState<string | null>(null);
  const [managerBranchName, setManagerBranchName] = useState<string>('');
  const [branches, setBranches] = useState<{_id: string; branchName: string; branchCode: string}[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  
  // Category details
  const [categoryName, setCategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState('');

  // Check if editing
  const categoryToEdit = (route.params as any)?.category;
  const isEditing = !!categoryToEdit;

  // Load manager's branch and all branches on mount
  useEffect(() => {
    loadManagerBranch();
    loadBranches();
  }, []);

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

  // Pre-populate form if editing
  useEffect(() => {
    if (isEditing && categoryToEdit) {
      setCategoryName(categoryToEdit.name || '');
      setDescription(categoryToEdit.description || '');
      setImage(categoryToEdit.imageUrl || null);
      setIsActive(categoryToEdit.isActive !== false);
      setDisplayOrder(categoryToEdit.displayOrder?.toString() || categoryToEdit.sortOrder?.toString() || '0');
    }
  }, [isEditing, categoryToEdit]);

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
      aspect: [1, 1],
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

  const handleSave = async () => {
    if (!categoryName.trim()) {
      Alert.alert('Error', 'Category name is required');
      return;
    }

    console.log('🔍 [EDIT DEBUG] Starting save process');
    console.log('🔍 [EDIT DEBUG] isEditing:', isEditing);
    console.log('🔍 [EDIT DEBUG] image state:', image);
    console.log('🔍 [EDIT DEBUG] categoryToEdit?.imageUrl:', categoryToEdit?.imageUrl);

    try {
      setLoading(true);
      
      // Upload image first if selected and different from existing
      let imageUrl = image;
      const shouldUploadImage = image && (!isEditing || image !== categoryToEdit?.imageUrl);
      
      console.log('🔍 [EDIT DEBUG] shouldUploadImage:', shouldUploadImage);
      
      if (shouldUploadImage) {
        console.log('🔍 [EDIT DEBUG] Uploading image...');
        
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
          
          console.log('🔍 [EDIT DEBUG] Image converted to base64, length:', base64.length);
          
          // Upload as base64
          const uploadResponse = await api.post('/upload', {
            image: base64,
            filename: 'category.jpg',
            mimeType: 'image/jpeg'
          });
          
          console.log('🔍 [EDIT DEBUG] Base64 upload response:', uploadResponse);
        } catch (uploadError) {
          console.log('🔍 [EDIT DEBUG] Base64 conversion/upload failed:', uploadError);
          // If base64 upload fails, keep existing image for editing
          imageUrl = isEditing ? categoryToEdit.imageUrl : null;
          console.log('🔍 [EDIT DEBUG] Upload failed, keeping existing:', imageUrl);
        }
      } else {
        console.log('🔍 [EDIT DEBUG] Skipping image upload');
      }

      const categoryData = {
        name: categoryName,
        description: description || undefined,
        imageUrl: imageUrl || undefined,
        displayOrder: displayOrder ? parseInt(displayOrder) : 0,
        isActive,
        branchId: selectedBranchId || managerBranchId || undefined,
      };

      let response;
      if (isEditing) {
        // Update existing category
        response = await api.put(`/menu/admin/categories/${categoryToEdit._id || categoryToEdit.id}`, categoryData);
      } else {
        // Create new category
        response = await api.post('/menu/admin/categories', categoryData);
      }

      if (response.success) {
        Alert.alert('Success', `Category ${isEditing ? 'updated' : 'added'} successfully`, [
          { text: 'OK', onPress: () => {
            // @ts-ignore
            navigation.navigate('AdminCategories', { refresh: true });
          }},
        ]);
      } else {
        Alert.alert('Error', response.message || `Failed to ${isEditing ? 'update' : 'add'} category`);
      }
    } catch (error) {
      console.error('Error saving category:', error);
      Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'save'} category. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: STATUSBAR_HEIGHT }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1a1a2e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Category' : 'Add New Category'}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#1a1a2e" />
        </TouchableOpacity>
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
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        >
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

          {/* Image Upload */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Upload Category icon/Image</Text>
            <TouchableOpacity style={styles.imageUploadBox} onPress={handleImageUpload}>
              {image ? (
                <Image source={{ uri: image }} style={styles.uploadedImage} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="camera" size={48} color="#ccc" />
                  <Text style={styles.uploadText}>Tap to upload image</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Category Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Category Name</Text>
            <TextInput
              style={styles.input}
              value={categoryName}
              onChangeText={setCategoryName}
              placeholder="Enter category name"
              placeholderTextColor="#999"
            />
          </View>

          {/* Display Order */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Display Order</Text>
            <TextInput
              style={styles.input}
              value={displayOrder}
              onChangeText={setDisplayOrder}
              placeholder="Enter display order (e.g., 1, 2, 3)"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter category description"
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Settings */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Settings</Text>
            
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Active</Text>
                <Text style={styles.switchDescription}>Show this category on menu</Text>
              </View>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: '#ddd', true: '#E87E35' }}
                thumbColor={isActive ? '#fff' : '#f4f3f4'}
              />
            </View>
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
              {loading ? 'Saving...' : 'Save Option'}
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
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
  closeButton: {
    padding: 8,
  },
  formContainer: {
    padding: 16,
  },
  branchInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    marginBottom: 16,
  },
  branchInfoText: {
    fontSize: 14,
    color: '#E87E35',
    fontWeight: '600',
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
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10,
  },
  imageUploadBox: {
    width: '100%',
    height: 200,
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
  settingsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
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
