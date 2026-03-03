import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Modal,
  FlatList,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../components/api/client';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { getSpacing } from '../../utils/responsive';
import { isSuperAdmin, getRoleDisplayName } from '../../utils/permissionHelpers';

// Theme mapping
const theme = {
  primary: COLORS.orange,
  text: COLORS.darkText,
  textSecondary: COLORS.lightText,
  background: COLORS.lightGray,
  white: COLORS.white,
  border: COLORS.border,
  success: COLORS.success,
  error: COLORS.error,
};

interface Manager {
  _id: string;
  displayName: string;
  email: string;
}

interface OperatingHours {
  [day: string]: { open: string; close: string; isClosed: boolean };
}

export default function CreateBranchScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Form state
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [deliveryRadius, setDeliveryRadius] = useState('5');
  const [isActive, setIsActive] = useState(true);
  const [acceptsDelivery, setAcceptsDelivery] = useState(true);
  const [acceptsDineIn, setAcceptsDineIn] = useState(true);
  const [acceptsTakeaway, setAcceptsTakeaway] = useState(true);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  // Operating hours
  const [operatingHours, setOperatingHours] = useState<OperatingHours>({
    monday: { open: '09:00', close: '22:00', isClosed: false },
    tuesday: { open: '09:00', close: '22:00', isClosed: false },
    wednesday: { open: '09:00', close: '22:00', isClosed: false },
    thursday: { open: '09:00', close: '22:00', isClosed: false },
    friday: { open: '09:00', close: '22:00', isClosed: false },
    saturday: { open: '09:00', close: '22:00', isClosed: false },
    sunday: { open: '09:00', close: '22:00', isClosed: true },
  });

  // Manager assignment
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [availableManagers, setAvailableManagers] = useState<Manager[]>([]);
  const [showManagerModal, setShowManagerModal] = useState(false);

  // Validation and submission
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  useEffect(() => {
    loadUserRole();
    loadAvailableManagers();
  }, []);

  const loadUserRole = async () => {
    try {
      const storedRole = await AsyncStorage.getItem('userRole');
      if (storedRole) {
        setUserRole(storedRole);
        if (!isSuperAdmin(storedRole)) {
          Alert.alert('Access Denied', 'Only Super Admin can create branches.');
          navigation.goBack();
        }
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    }
  };

  const loadAvailableManagers = async () => {
    try {
      const response = await api.get('/users?role=BRANCH_MANAGER&unassigned=true');
      if (response.success && response.data) {
        setAvailableManagers(response.data);
      }
    } catch (error) {
      console.error('Error loading managers:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!branchName.trim() || branchName.length < 3) {
      newErrors.branchName = 'Branch name must be at least 3 characters';
    }

    if (!addressLine.trim() || addressLine.length < 10) {
      newErrors.addressLine = 'Address must be at least 10 characters';
    }

    if (!city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    }

    if (email && !email.includes('@')) {
      newErrors.email = 'Valid email is required';
    }

    if (!deliveryRadius || parseInt(deliveryRadius) <= 0) {
      newErrors.deliveryRadius = 'Delivery radius must be greater than 0';
    }

    if (!selectedManager) {
      newErrors.manager = 'Please assign a manager';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before submitting.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        branch_name: branchName,
        branch_code: branchCode,
        address_line: addressLine,
        city,
        postal_code: postalCode,
        phone_number: phoneNumber,
        email,
        delivery_radius: parseInt(deliveryRadius),
        is_active: isActive,
        accepts_delivery: acceptsDelivery,
        accepts_dine_in: acceptsDineIn,
        accepts_takeaway: acceptsTakeaway,
        manager_id: selectedManager?._id,
        lat: latitude ? parseFloat(latitude) : null,
        lng: longitude ? parseFloat(longitude) : null,
        operating_hours: operatingHours,
      };

      const response = await api.post('', payload);

      if (response.success) {
        Alert.alert('Success', 'Branch created successfully!', [
          {
            text: 'OK',
            onPress: () => {
              // @ts-ignore
              navigation.navigate('BranchManagement');
            },
          },
        ]);
      } else {
        Alert.alert('Error', response.message || 'Failed to create branch');
      }
    } catch (error: any) {
      console.error('Error creating branch:', error);
      Alert.alert('Error', error?.message || 'Failed to create branch');
    } finally {
      setSubmitting(false);
    }
  };

  const updateOperatingHours = (day: string, field: string, value: string | boolean) => {
    setOperatingHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    error?: string,
    options?: { multiline?: boolean; keyboardType?: 'default' | 'numeric' | 'email-address' }
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>
        {label} <Text style={styles.requiredStar}>*</Text>
      </Text>
      <TextInput
        style={[styles.input, options?.multiline && styles.multilineInput, error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        multiline={options?.multiline}
        keyboardType={options?.keyboardType || 'default'}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.white} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + getSpacing(1) }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color={theme.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create New Branch</Text>
          <View style={{ width: 28 }} />
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Branch Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Branch Information</Text>

          {renderInput(
            'Branch Name',
            branchName,
            setBranchName,
            'Enter branch name (e.g., Main Branch)',
            errors.branchName
          )}

          {renderInput(
            'Branch Code',
            branchCode,
            setBranchCode,
            'Enter unique branch code (optional)',
            errors.branchCode
          )}

          {renderInput(
            'Address',
            addressLine,
            setAddressLine,
            'Full address with city/postal code',
            errors.addressLine,
            { multiline: true }
          )}

          {renderInput('City', city, setCity, 'Enter city', errors.city)}

          {renderInput('Postal Code', postalCode, setPostalCode, 'Enter postal code')}

          {renderInput(
            'Phone Number',
            phoneNumber,
            setPhoneNumber,
            '+92-300-1234567',
            errors.phoneNumber
          )}

          {renderInput(
            'Email',
            email,
            setEmail,
            'branch@restaurant.com',
            errors.email,
            { keyboardType: 'email-address' }
          )}
        </View>

        {/* Delivery Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Settings</Text>

          {renderInput(
            'Delivery Radius (km)',
            deliveryRadius,
            setDeliveryRadius,
            '5',
            errors.deliveryRadius,
            { keyboardType: 'numeric' }
          )}

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Accepts Delivery</Text>
            <Switch value={acceptsDelivery} onValueChange={setAcceptsDelivery} trackColor={{ false: '#767577', true: theme.primary }} />
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Accepts Dine-in</Text>
            <Switch value={acceptsDineIn} onValueChange={setAcceptsDineIn} trackColor={{ false: '#767577', true: theme.primary }} />
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Accepts Takeaway</Text>
            <Switch value={acceptsTakeaway} onValueChange={setAcceptsTakeaway} trackColor={{ false: '#767577', true: theme.primary }} />
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Branch Active</Text>
            <Switch value={isActive} onValueChange={setIsActive} trackColor={{ false: '#767577', true: theme.primary }} />
          </View>
        </View>

        {/* Operating Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Operating Hours</Text>
          {days.map((day) => (
            <View key={day} style={styles.dayRow}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayName}>{day.charAt(0).toUpperCase() + day.slice(1)}</Text>
                <View style={styles.dayToggle}>
                  <Text style={styles.closedLabel}>Closed</Text>
                  <Switch
                    value={operatingHours[day].isClosed}
                    onValueChange={(value) => updateOperatingHours(day, 'isClosed', value)}
                    trackColor={{ false: '#767577', true: theme.error }}
                  />
                </View>
              </View>
              {!operatingHours[day].isClosed && (
                <View style={styles.hoursRow}>
                  <TextInput
                    style={styles.timeInput}
                    value={operatingHours[day].open}
                    onChangeText={(value) => updateOperatingHours(day, 'open', value)}
                    placeholder="09:00"
                  />
                  <Text style={styles.timeSeparator}>to</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={operatingHours[day].close}
                    onChangeText={(value) => updateOperatingHours(day, 'close', value)}
                    placeholder="22:00"
                  />
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Manager Assignment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manager Assignment</Text>

          <TouchableOpacity
            style={[styles.managerSelector, errors.manager && styles.inputError]}
            onPress={() => setShowManagerModal(true)}
          >
            {selectedManager ? (
              <View style={styles.selectedManager}>
                <Ionicons name="person" size={24} color={theme.primary} />
                <View style={styles.managerDetails}>
                  <Text style={styles.managerName}>{selectedManager.displayName}</Text>
                  <Text style={styles.managerEmail}>{selectedManager.email}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={24} color={theme.success} />
              </View>
            ) : (
              <View style={styles.selectManagerPrompt}>
                <Ionicons name="person-add" size={24} color={theme.textSecondary} />
                <Text style={styles.selectManagerText}>Select a manager</Text>
              </View>
            )}
          </TouchableOpacity>

          {errors.manager && <Text style={styles.errorText}>{errors.manager}</Text>}

          <Text style={styles.hintText}>
            Only unassigned Branch Managers are shown. Assigning a manager will link them to this branch.
          </Text>
        </View>

        {/* Location (Optional) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location (Optional)</Text>
          {renderInput('Latitude', latitude, setLatitude, 'e.g., 24.8607', undefined, { keyboardType: 'numeric' })}
          {renderInput('Longitude', longitude, setLongitude, 'e.g., 67.0011', undefined, { keyboardType: 'numeric' })}
        </View>

        {/* Submit Button */}
        <View style={styles.submitSection}>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={theme.white} />
            ) : (
              <Text style={styles.submitButtonText}>Create Branch</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: getSpacing(4) }} />
      </ScrollView>

      {/* Manager Selection Modal */}
      <Modal visible={showManagerModal} transparent animationType="slide" onRequestClose={() => setShowManagerModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Manager</Text>
              <TouchableOpacity onPress={() => setShowManagerModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {availableManagers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="person-outline" size={48} color={theme.textSecondary} />
                <Text style={styles.emptyTitle}>No Available Managers</Text>
                <Text style={styles.emptySubtitle}>
                  All managers are currently assigned. Create a new BRANCH_MANAGER user first.
                </Text>
              </View>
            ) : (
              <FlatList
                data={availableManagers}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.managerItem}
                    onPress={() => {
                      setSelectedManager(item);
                      setShowManagerModal(false);
                      setErrors((prev) => ({ ...prev, manager: '' }));
                    }}
                  >
                    <View style={styles.managerAvatar}>
                      <Ionicons name="person" size={24} color={theme.primary} />
                    </View>
                    <View style={styles.managerInfo}>
                      <Text style={styles.managerName}>{item.displayName}</Text>
                      <Text style={styles.managerEmail}>{item.email}</Text>
                    </View>
                    {selectedManager?._id === item._id && (
                      <Ionicons name="checkmark-circle" size={24} color={theme.success} />
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    backgroundColor: '#2C3E50',
    paddingHorizontal: getSpacing(2),
    paddingBottom: getSpacing(2),
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.white,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: theme.white,
    margin: getSpacing(2),
    marginBottom: getSpacing(1),
    padding: getSpacing(2),
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: getSpacing(2),
  },
  inputContainer: {
    marginBottom: getSpacing(2),
  },
  inputLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 4,
  },
  requiredStar: {
    color: theme.error,
  },
  input: {
    backgroundColor: theme.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: theme.error,
  },
  errorText: {
    fontSize: 12,
    color: theme.error,
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: getSpacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  toggleLabel: {
    fontSize: 14,
    color: theme.text,
  },
  dayRow: {
    marginBottom: getSpacing(2),
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
    textTransform: 'capitalize',
  },
  dayToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closedLabel: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: getSpacing(1),
    gap: getSpacing(1),
  },
  timeInput: {
    backgroundColor: theme.background,
    borderRadius: 8,
    padding: 10,
    width: 80,
    textAlign: 'center',
    fontSize: 14,
    color: theme.text,
  },
  timeSeparator: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  managerSelector: {
    backgroundColor: theme.background,
    borderRadius: 8,
    padding: getSpacing(2),
    borderWidth: 1,
    borderColor: theme.border,
  },
  selectedManager: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  managerDetails: {
    flex: 1,
    marginLeft: getSpacing(1.5),
  },
  managerName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
  },
  managerEmail: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },
  selectManagerPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: getSpacing(1),
  },
  selectManagerText: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  hintText: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: getSpacing(2),
    fontStyle: 'italic',
  },
  submitSection: {
    margin: getSpacing(2),
    gap: getSpacing(1),
  },
  submitButton: {
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: theme.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: theme.border,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: getSpacing(2),
    paddingBottom: getSpacing(4),
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getSpacing(2),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.text,
  },
  managerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: getSpacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  managerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  managerInfo: {
    flex: 1,
    marginLeft: getSpacing(1.5),
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: getSpacing(8),
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginTop: getSpacing(2),
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: getSpacing(1),
    textAlign: 'center',
  },
});
