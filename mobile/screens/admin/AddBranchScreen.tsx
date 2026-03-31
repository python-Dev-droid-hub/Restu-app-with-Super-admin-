import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Switch,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../components/api/client';
import * as Location from 'expo-location';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

export default function AddBranchScreen() {
  const navigation = useNavigation();
  const route = useRoute() as any;
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'details' | 'hours'>('details');
  const [loading, setLoading] = useState(false);

  const branchId: string | undefined = route?.params?.branchId;
  const isEditMode = !!branchId;
  
  // Branch details
  const [branchCode, setBranchCode] = useState('');
  const [branchName, setBranchName] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('Pakistan');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [deliveryRadius, setDeliveryRadius] = useState('5000');
  const [isActive, setIsActive] = useState(true);
  const [acceptsDelivery, setAcceptsDelivery] = useState(true);
  const [acceptsDineIn, setAcceptsDineIn] = useState(true);
  const [acceptsTakeaway, setAcceptsTakeaway] = useState(true);
  
  // Location
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  
  // Operating hours
  const [operatingHours, setOperatingHours] = useState({
    monday: { open: '09:00', close: '22:00', isOpen: true },
    tuesday: { open: '09:00', close: '22:00', isOpen: true },
    wednesday: { open: '09:00', close: '22:00', isOpen: true },
    thursday: { open: '09:00', close: '22:00', isOpen: true },
    friday: { open: '09:00', close: '23:00', isOpen: true },
    saturday: { open: '10:00', close: '23:00', isOpen: true },
    sunday: { open: '10:00', close: '22:00', isOpen: true },
  });

  useEffect(() => {
    const loadBranchForEdit = async () => {
      if (!branchId) return;

      try {
        setLoading(true);
        const response: any = await api.get(`/branches/${branchId}`);
        if (!response?.success || !response?.data) {
          Alert.alert('Error', response?.message || 'Failed to load branch');
          return;
        }

        const b = response.data;

        setBranchCode(b.branchCode || '');
        setBranchName(b.branchName || '');
        setAddressLine(b.addressLine || b.address || '');
        setCity(b.city || '');
        setState(b.state || '');
        setPostalCode(b.postalCode || '');
        setCountry(b.country || 'Pakistan');
        setPhoneNumber(b.phoneNumber || b.phone || '');
        setEmail(b.email || '');
        setDeliveryRadius(String(b.deliveryRadius ?? 5000));
        setIsActive(b.isActive !== false);
        setAcceptsDelivery(b.acceptsDelivery !== false);
        setAcceptsDineIn(b.acceptsDineIn !== false);
        setAcceptsTakeaway(b.acceptsTakeaway !== false);

        if (b.lat !== undefined && b.lat !== null) setLatitude(String(b.lat));
        if (b.lng !== undefined && b.lng !== null) setLongitude(String(b.lng));

        if (b.operatingHours) {
          setOperatingHours(b.operatingHours);
        }
      } catch (error: any) {
        console.error('[AddBranch] Failed to load branch:', error?.message || error);
        Alert.alert('Error', 'Failed to load branch');
      } finally {
        setLoading(false);
      }
    };

    void loadBranchForEdit();
  }, [branchId]);

  const handleSetLocation = async () => {
    try {
      setLoading(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is required to set branch location.');
        return;
      }

      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        Alert.alert('Location Disabled', 'Please enable location services on your device and try again.');
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const lat = current?.coords?.latitude;
      const lng = current?.coords?.longitude;

      if (typeof lat !== 'number' || typeof lng !== 'number') {
        Alert.alert('Error', 'Could not determine your current location.');
        return;
      }

      setLatitude(String(lat));
      setLongitude(String(lng));
      Alert.alert('Location Set', `Latitude: ${lat.toFixed(6)}\nLongitude: ${lng.toFixed(6)}`);
    } catch (error: any) {
      console.error('[AddBranch] Set location error:', error?.message || error);
      Alert.alert('Error', error?.message || 'Failed to get current location');
    } finally {
      setLoading(false);
    }
  };

  const updateOperatingHours = (day: string, field: string, value: string | boolean) => {
    setOperatingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day as keyof typeof prev],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!branchCode.trim()) {
      Alert.alert('Error', 'Branch code is required');
      return;
    }
    if (!branchName.trim()) {
      Alert.alert('Error', 'Branch name is required');
      return;
    }
    if (!addressLine.trim()) {
      Alert.alert('Error', 'Address is required');
      return;
    }
    if (!city.trim()) {
      Alert.alert('Error', 'City is required');
      return;
    }
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Phone number is required');
      return;
    }

    try {
      setLoading(true);
      
      const payload = {
        branchCode: branchCode.toUpperCase(),
        branchName,
        addressLine,
        city,
        state: state || undefined,
        postalCode: postalCode || undefined,
        country: country || 'Pakistan',
        lat: latitude ? parseFloat(latitude) : undefined,
        lng: longitude ? parseFloat(longitude) : undefined,
        deliveryRadius: parseInt(deliveryRadius) || 5000,
        phoneNumber: phoneNumber.replace(/\s/g, ''), // Remove spaces
        email: email || undefined,
        operatingHours,
        isActive,
        acceptsDelivery,
        acceptsDineIn,
        acceptsTakeaway,
        currency: 'PKR', // Add missing currency field
      };
      
      console.log('[AddBranch] Sending payload:', JSON.stringify(payload, null, 2));
      
      const response = isEditMode
        ? await api.put(`/branches/${branchId}`, payload)
        : await api.post('/branches', payload);

      if (response.success) {
        Alert.alert('Success', isEditMode ? 'Branch updated successfully' : 'Branch added successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', response.message || (isEditMode ? 'Failed to update branch' : 'Failed to add branch'));
      }
    } catch (error: any) {
      console.error('[AddBranch] Error:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to save branch. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderDetailsTab = () => (
    <View style={styles.formContainer}>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Branch Code</Text>
        <TextInput
          style={styles.input}
          value={branchCode}
          onChangeText={setBranchCode}
          placeholder="Enter branch code (e.g., BR001)"
          placeholderTextColor="#999"
          autoCapitalize="characters"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Branch Name</Text>
        <TextInput
          style={styles.input}
          value={branchName}
          onChangeText={setBranchName}
          placeholder="Enter branch name"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Address</Text>
        <TextInput
          style={styles.input}
          value={addressLine}
          onChangeText={setAddressLine}
          placeholder="Enter complete address"
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.rowInputs}>
        <View style={[styles.inputGroup, styles.halfInput]}>
          <Text style={styles.inputLabel}>City</Text>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="City"
            placeholderTextColor="#999"
          />
        </View>
        <View style={[styles.inputGroup, styles.halfInput]}>
          <Text style={styles.inputLabel}>State</Text>
          <TextInput
            style={styles.input}
            value={state}
            onChangeText={setState}
            placeholder="State"
            placeholderTextColor="#999"
          />
        </View>
      </View>

      <View style={styles.rowInputs}>
        <View style={[styles.inputGroup, styles.halfInput]}>
          <Text style={styles.inputLabel}>Postal Code</Text>
          <TextInput
            style={styles.input}
            value={postalCode}
            onChangeText={setPostalCode}
            placeholder="Postal code"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>
        <View style={[styles.inputGroup, styles.halfInput]}>
          <Text style={styles.inputLabel}>Country</Text>
          <TextInput
            style={styles.input}
            value={country}
            onChangeText={setCountry}
            placeholder="Country"
            placeholderTextColor="#999"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Phone Number</Text>
        <TextInput
          style={styles.input}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="Enter phone number"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Enter email (optional)"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.rowInputs}>
        <View style={[styles.inputGroup, styles.halfInput]}>
          <Text style={styles.inputLabel}>Latitude</Text>
          <TextInput
            style={styles.input}
            value={latitude}
            onChangeText={setLatitude}
            placeholder="Latitude"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>
        <View style={[styles.inputGroup, styles.halfInput]}>
          <Text style={styles.inputLabel}>Longitude</Text>
          <TextInput
            style={styles.input}
            value={longitude}
            onChangeText={setLongitude}
            placeholder="Longitude"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Delivery Radius (meters)</Text>
        <TextInput
          style={styles.input}
          value={deliveryRadius}
          onChangeText={setDeliveryRadius}
          placeholder="5000"
          placeholderTextColor="#999"
          keyboardType="numeric"
        />
      </View>

      <TouchableOpacity style={styles.locationButton} onPress={handleSetLocation}>
        <MaterialIcons name="location-on" size={20} color="#E87E35" />
        <Text style={styles.locationButtonText}>Set Location</Text>
      </TouchableOpacity>

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
        <Text style={styles.switchLabel}>Accepts Delivery</Text>
        <Switch
          value={acceptsDelivery}
          onValueChange={setAcceptsDelivery}
          trackColor={{ false: '#ddd', true: '#E87E35' }}
          thumbColor={acceptsDelivery ? '#fff' : '#f4f3f4'}
        />
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Accepts Dine-in</Text>
        <Switch
          value={acceptsDineIn}
          onValueChange={setAcceptsDineIn}
          trackColor={{ false: '#ddd', true: '#E87E35' }}
          thumbColor={acceptsDineIn ? '#fff' : '#f4f3f4'}
        />
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Accepts Takeaway</Text>
        <Switch
          value={acceptsTakeaway}
          onValueChange={setAcceptsTakeaway}
          trackColor={{ false: '#ddd', true: '#E87E35' }}
          thumbColor={acceptsTakeaway ? '#fff' : '#f4f3f4'}
        />
      </View>
    </View>
  );

  const renderHoursTab = () => (
    <View style={styles.formContainer}>
      {Object.entries(operatingHours).map(([day, hours]) => (
        <View key={day} style={styles.dayRow}>
          <View style={styles.dayHeader}>
            <Text style={styles.dayName}>{day.charAt(0).toUpperCase() + day.slice(1)}</Text>
            <Switch
              value={hours.isOpen}
              onValueChange={(value) => updateOperatingHours(day, 'isOpen', value)}
              trackColor={{ false: '#ddd', true: '#E87E35' }}
              thumbColor={hours.isOpen ? '#fff' : '#f4f3f4'}
            />
          </View>
          {hours.isOpen && (
            <View style={styles.hoursRow}>
              <View style={styles.timeInputContainer}>
                <Text style={styles.timeLabel}>Open</Text>
                <TextInput
                  style={styles.timeInput}
                  value={hours.open}
                  onChangeText={(value) => updateOperatingHours(day, 'open', value)}
                  placeholder="09:00"
                />
              </View>
              <View style={styles.timeInputContainer}>
                <Text style={styles.timeLabel}>Close</Text>
                <TextInput
                  style={styles.timeInput}
                  value={hours.close}
                  onChangeText={(value) => updateOperatingHours(day, 'close', value)}
                  placeholder="22:00"
                />
              </View>
            </View>
          )}
        </View>
      ))}
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
        <Text style={styles.headerTitle}>{isEditMode ? 'Edit Branch' : 'Add New Branch'}</Text>
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
          style={[styles.tab, activeTab === 'hours' && styles.activeTab]}
          onPress={() => setActiveTab('hours')}
        >
          <Text style={[styles.tabText, activeTab === 'hours' && styles.activeTabText]}>
            Operating Hours
          </Text>
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
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
        {activeTab === 'details' ? renderDetailsTab() : renderHoursTab()}
        <View style={styles.bottomSpacer} />

        {/* Save Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : 'Save Branch'}
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
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff5f0',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E87E35',
    borderStyle: 'dashed',
  },
  locationButtonText: {
    color: '#E87E35',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  dayRow: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  hoursRow: {
    flexDirection: 'row',
    gap: 16,
  },
  timeInputContainer: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fafafa',
    textAlign: 'center',
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
