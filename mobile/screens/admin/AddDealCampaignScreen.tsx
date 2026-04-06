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
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

const getFullImageUrl = (url?: string) => {
  if (!url) return '';
  const normalized = url.replace(/\\/g, '/');
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
  const baseUrl = api.getBaseURL().replace(/\/?api\/?$/, '');
  if (normalized.startsWith('/')) return `${baseUrl}${normalized}`;
  return `${baseUrl}/${normalized.replace(/^\/+/, '')}`;
};

interface MenuCategory {
  _id: string;
  name: string;
  isActive?: boolean;
}

export default function AddDealCampaignScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const campaignId = (route.params as any)?.campaignId;
  const isEditing = !!campaignId;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [userRole, setUserRole] = useState<string>('');
  const [managerBranchId, setManagerBranchId] = useState<string>('');

  // Campaign details
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'SCHEDULED'>('ACTIVE');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date>(new Date());
  const [tempEndDate, setTempEndDate] = useState<Date>(new Date());
  const [displayOrder, setDisplayOrder] = useState('0');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadUserData();
    loadCategories();
    if (isEditing) {
      loadCampaign();
    }
  }, [campaignId]);

  const loadCategories = async () => {
    try {
      const response = await api.get('/menu/admin/categories');
      const list = response?.data?.categories || response?.data || [];
      if (response.success && Array.isArray(list)) {
        setCategories(list);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadUserData = async () => {
    try {
      const stored = await AsyncStorage.getItem('userData');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUserRole(parsed.role || '');

        if (parsed.role === 'BRANCH_MANAGER') {
          const branchData = parsed.assignedBranch || parsed.branch;
          if (branchData) {
            setManagerBranchId(branchData._id || branchData.branchId || parsed.branchId);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadCampaign = async () => {
    try {
      setInitialLoading(true);
      const response = await api.get(`/deals/campaigns/${campaignId}`);
      if (response.success && response.data?.campaign) {
        const campaign = response.data.campaign;
        setName(campaign.name || '');
        setDescription(campaign.description || '');
        setHeroImageUrl(campaign.heroBanner?.imageUrl || '');
        setHeroTitle(campaign.heroBanner?.title || '');
        setHeroSubtitle(campaign.heroBanner?.subtitle || '');
        setStatus(campaign.status || 'ACTIVE');
        setStartDate(campaign.startDate ? campaign.startDate.split('T')[0] : '');
        setEndDate(campaign.endDate ? campaign.endDate.split('T')[0] : '');
        setDisplayOrder(campaign.displayOrder?.toString() || '0');
        setCategory(campaign.category || '');
        setSelectedCategoryIds(Array.isArray(campaign.categories) ? campaign.categories.map((c: any) => String(c?._id || c)) : []);
      }
    } catch (error) {
      console.error('Error loading campaign:', error);
      Alert.alert('Error', 'Failed to load campaign');
    } finally {
      setInitialLoading(false);
    }
  };

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
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
        filename: 'hero.jpg',
        mimeType: 'image/jpeg',
      });

      if (uploadResponse.success && uploadResponse.data?.url) {
        setHeroImageUrl(uploadResponse.data.url);
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Campaign name is required';
    }

    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      newErrors.endDate = 'End date must be after start date';
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

      const campaignData: any = {
        name,
        description: description || undefined,
        heroBanner: {
          imageUrl: heroImageUrl || undefined,
          title: heroTitle || undefined,
          subtitle: heroSubtitle || undefined,
        },
        status,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        displayOrder: parseInt(displayOrder) || 0,
        category: category || undefined,
        categories: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
      };

      // Branch managers can only create for their branch
      if (userRole === 'BRANCH_MANAGER' && managerBranchId && !isEditing) {
        campaignData.branch = managerBranchId;
      }

      let response;
      if (isEditing) {
        response = await api.patch(`/deals/campaigns/${campaignId}`, campaignData);
      } else {
        response = await api.post('/deals/campaigns', campaignData);
      }

      if (response.success) {
        Alert.alert('Success', `Campaign ${isEditing ? 'updated' : 'created'} successfully`, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', response.message || 'Failed to save campaign');
      }
    } catch (error: any) {
      console.error('Error saving campaign:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save campaign';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: STATUSBAR_HEIGHT }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1a1a2e" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Campaign</Text>
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
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Campaign' : 'New Campaign'}
        </Text>
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
            {/* Campaign Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Campaign Name *</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="e.g., BURGERS & DEALS"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Burger Cravings? We've Got The Perfect Deal!"
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
                  {selectedCategoryIds.length > 0
                    ? `${selectedCategoryIds.length} selected`
                    : 'Select categories'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Hero Banner Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Hero Banner</Text>
            </View>

            {/* Hero Image */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Banner Image</Text>
              <TouchableOpacity style={styles.imageUploadBox} onPress={pickImage}>
                {heroImageUrl ? (
                  <Image
                    source={{ uri: getFullImageUrl(heroImageUrl) }}
                    style={styles.uploadedImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Ionicons name="image" size={48} color="#ccc" />
                    <Text style={styles.uploadText}>Tap to upload banner image</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Hero Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Banner Title</Text>
              <TextInput
                style={styles.input}
                placeholder="BURGERS & DEALS"
                value={heroTitle}
                onChangeText={setHeroTitle}
              />
            </View>

            {/* Hero Subtitle */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Banner Subtitle</Text>
              <TextInput
                style={styles.input}
                placeholder="Burger Cravings? We've Got The Perfect Deal!"
                value={heroSubtitle}
                onChangeText={setHeroSubtitle}
              />
            </View>

            {/* Status */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.statusContainer}>
                {['ACTIVE', 'INACTIVE', 'SCHEDULED'].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.statusOption,
                      status === s && styles.statusOptionSelected,
                    ]}
                    onPress={() => setStatus(s as any)}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        status === s && styles.statusOptionTextSelected,
                      ]}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Date Range */}
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, styles.halfInput]}>
                <Text style={styles.inputLabel}>Start Date</Text>
                <TouchableOpacity
                  style={[styles.input, errors.startDate && styles.inputError, styles.dateInputButton]}
                  onPress={() => {
                    setTempStartDate(startDate ? new Date(startDate) : new Date());
                    setShowStartDatePicker(true);
                  }}
                >
                  <Text style={[styles.dateInputText, !startDate && styles.dateInputPlaceholder]}>
                    {startDate || 'Select date'}
                  </Text>
                  <Ionicons name="calendar-outline" size={18} color="#666" />
                </TouchableOpacity>
                {errors.startDate && <Text style={styles.errorText}>{errors.startDate}</Text>}
              </View>
              <View style={[styles.inputGroup, styles.halfInput]}>
                <Text style={styles.inputLabel}>End Date</Text>
                <TouchableOpacity
                  style={[styles.input, errors.endDate && styles.inputError, styles.dateInputButton]}
                  onPress={() => {
                    setTempEndDate(endDate ? new Date(endDate) : new Date());
                    setShowEndDatePicker(true);
                  }}
                >
                  <Text style={[styles.dateInputText, !endDate && styles.dateInputPlaceholder]}>
                    {endDate || 'Select date'}
                  </Text>
                  <Ionicons name="calendar-outline" size={18} color="#666" />
                </TouchableOpacity>
                {errors.endDate && <Text style={styles.errorText}>{errors.endDate}</Text>}
              </View>
            </View>

            {Platform.OS !== 'ios' && showStartDatePicker && (
              <DateTimePicker
                value={tempStartDate}
                mode="date"
                display="default"
                onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                  setShowStartDatePicker(false);
                  if (event.type === 'set' && selectedDate) {
                    const next = selectedDate.toISOString().split('T')[0];
                    setStartDate(next);
                    if (errors.startDate) setErrors({ ...errors, startDate: '' });
                  }
                }}
              />
            )}

            {Platform.OS !== 'ios' && showEndDatePicker && (
              <DateTimePicker
                value={tempEndDate}
                mode="date"
                display="default"
                onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                  setShowEndDatePicker(false);
                  if (event.type === 'set' && selectedDate) {
                    const next = selectedDate.toISOString().split('T')[0];
                    setEndDate(next);
                    if (errors.endDate) setErrors({ ...errors, endDate: '' });
                  }
                }}
              />
            )}

            {Platform.OS === 'ios' && (
              <Modal
                visible={showStartDatePicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowStartDatePicker(false)}
              >
                <View style={styles.iosPickerOverlay}>
                  <View style={styles.iosPickerContainer}>
                    <View style={styles.iosPickerHeader}>
                      <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                        <Text style={styles.iosPickerAction}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          const next = tempStartDate.toISOString().split('T')[0];
                          setStartDate(next);
                          if (errors.startDate) setErrors({ ...errors, startDate: '' });
                          setShowStartDatePicker(false);
                        }}
                      >
                        <Text style={[styles.iosPickerAction, styles.iosPickerActionPrimary]}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={tempStartDate}
                      mode="date"
                      display="spinner"
                      onChange={(_, selectedDate) => {
                        if (selectedDate) setTempStartDate(selectedDate);
                      }}
                    />
                  </View>
                </View>
              </Modal>
            )}

            {Platform.OS === 'ios' && (
              <Modal
                visible={showEndDatePicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowEndDatePicker(false)}
              >
                <View style={styles.iosPickerOverlay}>
                  <View style={styles.iosPickerContainer}>
                    <View style={styles.iosPickerHeader}>
                      <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                        <Text style={styles.iosPickerAction}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          const next = tempEndDate.toISOString().split('T')[0];
                          setEndDate(next);
                          if (errors.endDate) setErrors({ ...errors, endDate: '' });
                          setShowEndDatePicker(false);
                        }}
                      >
                        <Text style={[styles.iosPickerAction, styles.iosPickerActionPrimary]}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={tempEndDate}
                      mode="date"
                      display="spinner"
                      onChange={(_, selectedDate) => {
                        if (selectedDate) setTempEndDate(selectedDate);
                      }}
                    />
                  </View>
                </View>
              </Modal>
            )}

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
                {loading ? 'Saving...' : isEditing ? 'Update Campaign' : 'Create Campaign'}
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
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Categories</Text>
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

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => setShowCategoryPicker(false)}
            >
              <Text style={styles.primaryBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    marginTop: 8,
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
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
  dateInputButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInputText: {
    fontSize: 15,
    color: '#333',
  },
  dateInputPlaceholder: {
    color: '#999',
  },
  iosPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  iosPickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  iosPickerAction: {
    fontSize: 15,
    color: '#666',
    fontWeight: '600',
  },
  iosPickerActionPrimary: {
    color: '#E87E35',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
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
  statusContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  statusOptionSelected: {
    backgroundColor: '#E87E35',
    borderColor: '#E87E35',
  },
  statusOptionText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  statusOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  imageUploadBox: {
    width: '100%',
    height: 150,
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
