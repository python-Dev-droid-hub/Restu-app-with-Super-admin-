import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  RefreshControl,
  Switch,
  StatusBar,
  Image,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../components/api/client';
import { useSettings } from '../../context/SettingsContext';
import { useLocalization } from '../../context/LocalizationContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { getSpacing } from '../../utils/responsive';
import { useUserData } from '../../hooks/useUserData';
import { isAdminRole as checkAdminRole } from '../../utils/permissionHelpers';
import { navigateOnRootStack } from '../../utils/navigationHelpers';

// Components
import ResponsiveHeader from '../../components/layout/ResponsiveHeader';
import AdminBottomNavigation from '../../components/navigation/AdminBottomNavigation';

interface Settings {
  appName: string;
  appVersion: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  defaultCurrency: string;
  defaultLanguage: string;
  taxRate: number;
  businessHours: {
    monday: { open: string; close: string; closed: boolean };
    tuesday: { open: string; close: string; closed: boolean };
    wednesday: { open: string; close: string; closed: boolean };
    thursday: { open: string; close: string; closed: boolean };
    friday: { open: string; close: string; closed: boolean };
    saturday: { open: string; close: string; closed: boolean };
    sunday: { open: string; close: string; closed: boolean };
  };
}

export default function AdminSettingsScreen() {
  const navigation = useNavigation() as any;
  const insets = useSafeAreaInsets();
  const { t, language, setLanguage } = useLocalization();
  const { profileImage } = useUserData();
  const { defaultCurrency, taxRate, appName, refreshSettings } = useSettings();
  const [settingsState, setSettingsState] = useState<Settings>({
    appName: 'Restaurant App',
    appVersion: '1.0.0',
    maintenanceMode: false,
    allowRegistration: true,
    defaultCurrency: 'USD',
    defaultLanguage: 'en',
    taxRate: 8.5,
    businessHours: {
      monday: { open: '09:00', close: '22:00', closed: false },
      tuesday: { open: '09:00', close: '22:00', closed: false },
      wednesday: { open: '09:00', close: '22:00', closed: false },
      thursday: { open: '09:00', close: '22:00', closed: false },
      friday: { open: '09:00', close: '22:00', closed: false },
      saturday: { open: '09:00', close: '22:00', closed: false },
      sunday: { open: '09:00', close: '22:00', closed: true },
    },
  });
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Get parent tab navigation for bottom nav (undefined for stack screens)
  const tabNavigation = navigation.getParent();

  // Get userData first to determine menu items
  const getMenuItems = () => {
    return [
      { name: 'Notifications', icon: 'notifications-outline', screen: 'AdminNotifications' },
      ...(userData.role !== 'BRANCH_MANAGER' ? [{ name: 'Branches', icon: 'business-outline', screen: 'AdminBranches' }] : []),
      { name: 'Deals', icon: 'pricetag-outline', screen: 'AdminDealCampaigns' },
      { name: 'Coupons', icon: 'ticket-outline', screen: 'AdminCoupons' },
      { name: 'Product Size', icon: 'resize-outline', screen: 'AdminProductSizes' },
      { name: 'Categories', icon: 'grid-outline', screen: 'AdminCategories' },
      { name: 'Printers', icon: 'print-outline', screen: 'PrinterSettings' },
      { name: 'Reports', icon: 'bar-chart-outline', screen: 'AdminReports' },
      { name: 'Settings', icon: 'settings-outline', screen: 'AdminSettings' },
    ];
  };

  const [editModal, setEditModal] = useState<{
    visible: boolean;
    key: string;
    title: string;
    value: string;
    type: 'text' | 'number';
  }>({
    visible: false,
    key: '',
    title: '',
    value: '',
    type: 'text',
  });

  const [businessHoursModal, setBusinessHoursModal] = useState<{
    visible: boolean;
    day: string;
    open: string;
    close: string;
    closed: boolean;
  }>({
    visible: false,
    day: '',
    open: '09:00',
    close: '22:00',
    closed: false,
  });

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState<{ name: string; email: string; image: string | null; role?: string; branch?: any }>({
    name: 'Admin User',
    email: 'admin@example.com',
    image: null,
  });
  const [branchData, setBranchData] = useState<{ _id: string; branchName: string; currency: string; language: string } | null>(null);
  const [showChangeNameModal, setShowChangeNameModal] = useState(false);
  const [showChangeImageModal, setShowChangeImageModal] = useState(false);
  const [newName, setNewName] = useState('');

  // Only functional currencies supported by backend with proper flag emojis
  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$', flag: '\u{1F1FA}\u{1F1F8}' }, // 🇺🇸 US
    { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', flag: '\u{1F1F5}\u{1F1F0}' }, // 🇵🇰 PK
    { code: 'EUR', name: 'Euro', symbol: '€', flag: '\u{1F1EA}\u{1F1FA}' }, // 🇪🇺 EU
    { code: 'GBP', name: 'British Pound', symbol: '£', flag: '\u{1F1EC}\u{1F1E7}' }, // 🇬🇧 GB
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '\u{1F1E6}\u{1F1EA}' }, // 🇦🇪 AE
    { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', flag: '\u{1F1F8}\u{1F1E6}' }, // 🇸🇦 SA
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '\u{1F1EE}\u{1F1F3}' }, // 🇮🇳 IN
  ];

  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  // Languages supported by backend API - only these can be saved
  const languages = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '\u{1F1FA}\u{1F1F8}' }, // 🇺🇸 US
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '\u{1F1F8}\u{1F1E6}' }, // 🇸🇦 SA
    { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '\u{1F1F5}\u{1F1F0}' }, // 🇵🇰 PK
  ];

  const openCurrencyModal = () => {
    console.log('[SETTINGS] Opening currency modal');
    console.log('[SETTINGS] Current branchData:', branchData);
    setCurrencyModalVisible(true);
  };

  const openLanguageModal = () => {
    console.log('[SETTINGS] Opening language modal');
    console.log('[SETTINGS] Current branchData:', branchData);
    setLanguageModalVisible(true);
  };

  useEffect(() => {
    loadSettings();
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const stored = await AsyncStorage.getItem('userData');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUserData({
          name: parsed.name || parsed.displayName || 'Admin User',
          email: parsed.email || 'admin@example.com',
          image: parsed.image || parsed.profileImage || null,
          role: parsed.role,
          branch: parsed.branch || parsed.assignedBranch,
        });
        // Load branch settings for managers
        const branchId = parsed.assignedBranch?._id || parsed.branch?._id || parsed.branchId;
        if (parsed.role === 'BRANCH_MANAGER' && branchId) {
          await loadBranchSettings(branchId);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadBranchSettings = async (branchId: string) => {
    try {
      const response = await api.get(`/restaurants/${branchId}`);
      if (response.success && response.data) {
        setBranchData({
          _id: response.data._id,
          branchName: response.data.branchName || response.data.name,
          currency: response.data.currency || 'PKR',
          language: response.data.language || 'en',
        });

        setSettingsState((prev) => ({
          ...prev,
          taxRate: response.data?.taxRate ?? prev.taxRate,
          deliveryFee: response.data?.deliveryFee ?? (prev as any).deliveryFee,
        }));
      }
    } catch (error) {
      console.error('Error loading branch settings:', error);
    }
  };

  const selectCurrency = async (currencyCode: string) => {
    console.log('[SETTINGS] Selecting currency:', currencyCode);
    console.log('[SETTINGS] User role:', userData.role);
    console.log('[SETTINGS] Branch data:', branchData);
    // For branch managers, update branch currency
    if (userData.role === 'BRANCH_MANAGER' && branchData) {
      try {
        console.log('[SETTINGS] Updating branch currency via API:', `/restaurants/${branchData._id}`);
        const response = await api.put(`/restaurants/${branchData._id}`, { currency: currencyCode });
        console.log('[SETTINGS] API response:', response);
        if (response.success) {
          setBranchData(prev => prev ? { ...prev, currency: currencyCode } : null);
          // Keep local userData in sync so other screens can read branch currency immediately
          const stored = await AsyncStorage.getItem('userData');
          if (stored) {
            const parsed = JSON.parse(stored);
            const next = {
              ...parsed,
              assignedBranch: parsed.assignedBranch
                ? { ...parsed.assignedBranch, currency: currencyCode }
                : parsed.assignedBranch,
            };
            await AsyncStorage.setItem('userData', JSON.stringify(next));
          }

          // Clear cached settings to force fresh load
          await AsyncStorage.removeItem('appSettings');
          
          await loadBranchSettings(branchData._id);
          
          // Force refresh settings context
          await refreshSettings();
          
          // Also update local state to reflect immediately
          setSettingsState(prev => ({ ...prev, defaultCurrency: currencyCode }));
          
          Alert.alert('Success', 'Branch currency updated successfully');
        } else {
          Alert.alert('Error', response.message || 'Failed to update currency');
        }
      } catch (error) {
        console.error('[SETTINGS] Error updating branch currency:', error);
        Alert.alert('Error', 'Failed to update branch currency');
      }
    } else {
      // For super admin, update global settings
      console.log('[SETTINGS] Updating global currency setting');
      await updateSetting('defaultCurrency', currencyCode);
      await loadSettings();
      await refreshSettings();
    }
    setCurrencyModalVisible(false);
  };

  const selectLanguage = async (languageCode: string) => {
    console.log('[SETTINGS] Selecting language:', languageCode);
    console.log('[SETTINGS] User role:', userData.role);
    console.log('[SETTINGS] Branch data:', branchData);
    // For branch managers, update branch language
    if (userData.role === 'BRANCH_MANAGER' && branchData) {
      try {
        console.log('[SETTINGS] Updating branch language via API:', `/restaurants/${branchData._id}`);
        const response = await api.put(`/restaurants/${branchData._id}`, { language: languageCode });
        console.log('[SETTINGS] API response:', response);
        if (response.success) {
          setBranchData(prev => prev ? { ...prev, language: languageCode } : null);
          const stored = await AsyncStorage.getItem('userData');
          if (stored) {
            const parsed = JSON.parse(stored);
            const next = {
              ...parsed,
              assignedBranch: parsed.assignedBranch
                ? { ...parsed.assignedBranch, language: languageCode }
                : parsed.assignedBranch,
            };
            await AsyncStorage.setItem('userData', JSON.stringify(next));
          }

          await loadBranchSettings(branchData._id);
          await refreshSettings();
          await setLanguage(languageCode as any);
          Alert.alert('Success', 'Branch language updated successfully');
        } else {
          Alert.alert('Error', response.message || 'Failed to update language');
        }
      } catch (error) {
        console.error('[SETTINGS] Error updating branch language:', error);
        Alert.alert('Error', 'Failed to update branch language');
      }
    } else {
      // For super admin, update global settings
      console.log('[SETTINGS] Updating global language setting');
      await updateSetting('defaultLanguage', languageCode);
      await setLanguage(languageCode as any);
      await loadSettings();
    }
    setLanguageModalVisible(false);
  };

  const loadSettings = async () => {
    try {
      const response = await api.get('/settings');
      if (response.success && response.data) {
        setSettingsState(prev => ({ ...prev, ...response.data }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSettings();
    setRefreshing(false);
  };

  const updateSetting = async (key: string, value: any) => {
    try {
      setLoading(true);
      console.log(`Updating setting: ${key} = ${value}`);
      
      const response = await api.put('/settings', { [key]: value });
      console.log('Update response:', JSON.stringify(response, null, 2));

      if (response.success) {
        setSettingsState(prev => ({ ...prev, [key]: value }));
        Alert.alert('Success', 'Settings updated successfully');
      } else {
        console.log('Update failed:', response.message);
        Alert.alert('Error', response.message || 'Failed to update settings');
      }
    } catch (error: any) {
      console.error('Error updating settings:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error message:', error.message);
      Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (key: string, title: string, value: any, type: 'text' | 'number' = 'text') => {
    setEditModal({
      visible: true,
      key,
      title,
      value: String(value),
      type,
    });
  };

  const saveEditModal = async () => {
    const { key, value, type } = editModal;
    const parsedValue = type === 'number' ? parseFloat(value) || 0 : value;

    const normalizedRole = String((userData as any)?.role || '').toUpperCase();
    const userIsAdmin = checkAdminRole(normalizedRole);
    const shouldUpdateBranch = !userIsAdmin;
    const isBranchSettingKey = key === 'taxRate' || key === 'deliveryFee';

    if (shouldUpdateBranch && isBranchSettingKey) {
      const targetBranchId =
        branchData?._id ||
        (userData as any)?.branch?._id ||
        (userData as any)?.branchId ||
        (userData as any)?.assignedBranch?._id ||
        (userData as any)?.assignedBranchId;

      if (!targetBranchId) {
        Alert.alert('Error', 'Branch not found for this account. Please re-login and try again.');
        return;
      }

      try {
        const response = await api.put(`/restaurants/${targetBranchId}`, { [key]: parsedValue });
        if (response.success) {
          await loadBranchSettings(String(targetBranchId));
          await refreshSettings();
          Alert.alert('Success', 'Settings updated successfully');
          setEditModal({ ...editModal, visible: false });
        } else {
          Alert.alert('Error', response.message || 'Failed to update settings');
        }
      } catch (error: any) {
        Alert.alert('Error', error?.response?.data?.message || error?.message || 'Failed to update settings');
      }
      return;
    }

    await updateSetting(key, parsedValue);
    setEditModal({ ...editModal, visible: false });
  };

  const handleChangeName = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Please enter a valid name');
      return;
    }
    try {
      setLoading(true);
      const response = await api.put('/users/profile', { name: newName });
      if (response.success) {
        const updatedUserData = { ...userData, name: newName };
        setUserData(updatedUserData);
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
        Alert.alert('Success', 'Name updated successfully');
        setShowChangeNameModal(false);
        setNewName('');
      } else {
        Alert.alert('Error', response.message || 'Failed to update name');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update name');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeImage = async (imageUrl: string) => {
    try {
      setLoading(true);
      // Backend expects 'avatar' field, not 'image'
      const response = await api.put('/users/profile', { avatar: imageUrl });
      if (response.success) {
        // Store with profileImage field to match backend response format
        const updatedUserData = { 
          ...userData, 
          image: imageUrl,
          profileImage: imageUrl,
          avatar: imageUrl 
        };
        setUserData(updatedUserData);
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
        
        // Also refresh useUserData hook
        await loadUserData();
        
        Alert.alert('Success', 'Profile image updated successfully');
        setShowChangeImageModal(false);
      } else {
        Alert.alert('Error', response.message || 'Failed to update image');
      }
    } catch (error) {
      console.error('[Settings] Error updating image:', error);
      Alert.alert('Error', 'Failed to update image');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library to upload an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert('Error', 'Failed to read image data. Please try again.');
        return;
      }

      setLoading(true);
      const mimeType = asset.mimeType || 'image/jpeg';
      const dataUrl = `data:${mimeType};base64,${asset.base64}`;
      const uploadRes: any = await api.post('/upload', {
        image: dataUrl,
        filename: `profile-${Date.now()}.jpg`,
        mimeType,
      });
      const uploadedUrl = uploadRes?.data?.url || uploadRes?.data?.fileUrl || uploadRes?.data?.path;
      if (!uploadRes?.success || !uploadedUrl) {
        Alert.alert('Error', uploadRes?.message || 'Failed to upload image');
        setLoading(false);
        return;
      }
      setLoading(false);

      await handleChangeImage(uploadedUrl);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your camera to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert('Error', 'Failed to read image data. Please try again.');
        return;
      }

      setLoading(true);
      const mimeType = asset.mimeType || 'image/jpeg';
      const dataUrl = `data:${mimeType};base64,${asset.base64}`;
      const uploadRes: any = await api.post('/upload', {
        image: dataUrl,
        filename: `profile-${Date.now()}.jpg`,
        mimeType,
      });
      const uploadedUrl = uploadRes?.data?.url || uploadRes?.data?.fileUrl || uploadRes?.data?.path;
      if (!uploadRes?.success || !uploadedUrl) {
        Alert.alert('Error', uploadRes?.message || 'Failed to upload image');
        setLoading(false);
        return;
      }
      setLoading(false);

      await handleChangeImage(uploadedUrl);
    }
  };

  const openBusinessHoursModal = (day: string, hours: any) => {
    setBusinessHoursModal({
      visible: true,
      day,
      open: hours.open,
      close: hours.close,
      closed: hours.closed,
    });
  };

  const saveBusinessHours = async () => {
    const { day, open, close, closed } = businessHoursModal;
    const updatedHours = {
      ...settingsState.businessHours,
      [day]: { open, close, closed },
    };
    await updateSetting('businessHours', updatedHours);
    setSettingsState(prev => ({ ...prev, businessHours: updatedHours }));
    setBusinessHoursModal({ ...businessHoursModal, visible: false });
  };

  const handleSendTestEmail = async () => {
    try {
      setLoading(true);
      const response = await api.post('/settings/test-email');
      if (response.success) {
        Alert.alert('Success', 'Test email sent successfully!');
      } else {
        Alert.alert('Error', response.message || 'Failed to send test email');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send test email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    Alert.alert(
      'Export Data',
      'This will export all your restaurant data. The export file will be sent to your email.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await api.post('/settings/export-data');
              if (response.success) {
                Alert.alert('Success', 'Data export has been initiated. You will receive an email when it\'s ready.');
              } else {
                Alert.alert('Error', response.message || 'Failed to export data');
              }
            } catch (error) {
              Alert.alert('Error', 'Export feature is not available. Please contact support.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear the app cache? This will not delete any important data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                'cachedProducts',
                'cachedOrders',
                'cachedCategories',
              ]);
              Alert.alert('Success', 'Cache cleared successfully!');
            } catch (error) {
              Alert.alert('Success', 'Cache cleared!');
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    setShowProfileMenu(false);
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['authToken', 'userRole', 'userData']);
              // @ts-ignore
              (navigation as any).reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Error during logout:', error);
            }
          },
        },
      ]
    );
  };

  const SettingItem = ({
    title,
    subtitle,
    value,
    type,
    onValueChange,
    settingKey,
  }: {
    title: string;
    subtitle?: string;
    value: any;
    type: 'toggle' | 'text' | 'number' | 'currency' | 'language';
    onValueChange: (value: any) => void;
    settingKey?: string;
  }) => {
    // For currency and language, make entire row clickable
    const isSelectable = type === 'currency' || type === 'language';
    const Container = isSelectable ? TouchableOpacity : View;
    const containerProps = isSelectable ? { onPress: () => type === 'currency' ? openCurrencyModal() : openLanguageModal(), activeOpacity: 0.7 } : {};
    
    return (
      <Container style={styles.settingItem} {...containerProps}>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
        {type === 'toggle' ? (
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: '#ddd', true: '#E87E35' }}
            thumbColor={value ? '#fff' : '#f4f3f4'}
          />
        ) : type === 'currency' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, marginRight: 4 }}>
              {currencies.find(c => c.code === value)?.flag || '🌍'}
            </Text>
            <Text style={styles.settingValue}>
              {value} ({currencies.find(c => c.code === value)?.symbol || '$'})
            </Text>
            <Ionicons name="chevron-down" size={16} color="#E87E35" style={{ marginLeft: 4 }} />
          </View>
        ) : type === 'language' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, marginRight: 4 }}>
              {languages.find(l => l.code === value)?.flag || '🌐'}
            </Text>
            <Text style={styles.settingValue}>
              {languages.find(l => l.code === value)?.name || value}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#E87E35" style={{ marginLeft: 4 }} />
          </View>
        ) : (
          <TouchableOpacity onPress={() => {
              const key = settingKey || (title ? title.toLowerCase().replace(/\s+/g, '') : 'unknown');
              openEditModal(key, title || 'Unknown', value, type === 'number' ? 'number' : 'text');
            }}>
            <Text style={styles.settingValue}>
              {type === 'number' && settingKey === 'taxRate'
                ? `${value}%`
                : type === 'number' && settingKey === 'deliveryFee'
                  ? `${value}`
                  : value}
            </Text>
          </TouchableOpacity>
        )}
      </Container>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Responsive Header */}
      <ResponsiveHeader
        title={t('settings.title')}
        notificationCount={unreadCount}
        profileImage={profileImage}
        onNotificationPress={() => {
          // @ts-ignore
          navigation.navigate('AdminNotifications');
        }}
        onProfilePress={() => setShowProfileMenu(true)}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Branch Info */}
        <View style={styles.branchInfoContainer}>
          <View style={styles.branchInfo}>
            <Ionicons name="business-outline" size={18} color="#E87E35" />
            <Text style={styles.branchInfoText}>
              {checkAdminRole(userData.role || '')
                ? 'All Branches'
                : (branchData?.branchName || userData.branch?.name || 'Loading Branch...')}
            </Text>
            {!checkAdminRole(userData.role || '') && userData.branch?.code && (
              <View style={styles.branchCodeBadge}>
                <Text style={styles.branchCodeText}>{userData.branch.code}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.general')}</Text>

          <SettingItem
            title={t('settings.appName')}
            subtitle="Display name of the application"
            value={settingsState.appName}
            type="text"
            onValueChange={(value) => updateSetting('appName', value)}
          />

          <SettingItem
            title={t('settings.appVersion')}
            subtitle="Current version of the application"
            value={settingsState.appVersion}
            type="text"
            onValueChange={(value) => updateSetting('appVersion', value)}
          />

          <SettingItem
            title={userData.role === 'BRANCH_MANAGER' ? 'Branch Currency' : t('settings.defaultCurrency')}
            subtitle={userData.role === 'BRANCH_MANAGER' ? `Currency for ${branchData?.branchName || 'your branch'}` : 'Primary currency for transactions'}
            value={userData.role === 'BRANCH_MANAGER' && branchData ? branchData.currency : settingsState.defaultCurrency}
            type="currency"
            settingKey="defaultCurrency"
            onValueChange={(value) => updateSetting('defaultCurrency', value)}
          />

          <SettingItem
            title={userData.role === 'BRANCH_MANAGER' ? 'Branch Language' : t('settings.defaultLanguage')}
            subtitle={userData.role === 'BRANCH_MANAGER' ? `Language for ${branchData?.branchName || 'your branch'}` : 'Primary language for the application'}
            value={userData.role === 'BRANCH_MANAGER' && branchData ? branchData.language : settingsState.defaultLanguage}
            type="language"
            settingKey="defaultLanguage"
            onValueChange={(value) => updateSetting('defaultLanguage', value)}
          />

          <SettingItem
            title={t('settings.taxRate')}
            subtitle="Default tax rate for orders"
            value={settingsState.taxRate}
            type="number"
            settingKey="taxRate"
            onValueChange={async (value) => {
              const targetBranchId =
                branchData?._id ||
                (userData as any)?.branch?._id ||
                (userData as any)?.branchId ||
                (userData as any)?.assignedBranch?._id ||
                (userData as any)?.assignedBranchId;

              const normalizedRole = String((userData as any)?.role || '').toUpperCase();
              const userIsAdmin = checkAdminRole(normalizedRole);
              const shouldUpdateBranch = !userIsAdmin;

              if (shouldUpdateBranch) {
                if (!targetBranchId) {
                  Alert.alert('Error', 'Branch not found for this account. Please re-login and try again.');
                  return;
                }
                try {
                  const response = await api.put(`/restaurants/${targetBranchId}`, { taxRate: value });
                  if (response.success) {
                    await loadBranchSettings(String(targetBranchId));
                    await refreshSettings();
                    Alert.alert('Success', 'Tax rate updated successfully');
                  } else {
                    Alert.alert('Error', response.message || 'Failed to update tax rate');
                  }
                } catch (error: any) {
                  Alert.alert('Error', error?.message || 'Failed to update tax rate');
                }
              } else {
                await updateSetting('taxRate', value);
                await loadSettings();
                await refreshSettings();
              }
            }}
          />

          <SettingItem
            title="Delivery Charges"
            subtitle="Default delivery fee for orders"
            value={(settingsState as any).deliveryFee || 0}
            type="number"
            settingKey="deliveryFee"
            onValueChange={async (value) => {
              const targetBranchId =
                branchData?._id ||
                (userData as any)?.branch?._id ||
                (userData as any)?.branchId ||
                (userData as any)?.assignedBranch?._id ||
                (userData as any)?.assignedBranchId;

              const normalizedRole = String((userData as any)?.role || '').toUpperCase();
              const userIsAdmin = checkAdminRole(normalizedRole);
              const shouldUpdateBranch = !userIsAdmin;

              if (shouldUpdateBranch) {
                if (!targetBranchId) {
                  Alert.alert('Error', 'Branch not found for this account. Please re-login and try again.');
                  return;
                }
                try {
                  const response = await api.put(`/restaurants/${targetBranchId}`, { deliveryFee: value });
                  if (response.success) {
                    await loadBranchSettings(String(targetBranchId));
                    await refreshSettings();
                    Alert.alert('Success', 'Delivery charges updated successfully');
                  } else {
                    Alert.alert('Error', response.message || 'Failed to update delivery charges');
                  }
                } catch (error: any) {
                  Alert.alert('Error', error?.message || 'Failed to update delivery charges');
                }
              } else {
                await updateSetting('deliveryFee', value);
                await loadSettings();
                await refreshSettings();
              }
            }}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Settings</Text>

          <SettingItem
            title="Maintenance Mode"
            subtitle="Put the app in maintenance mode"
            value={settingsState.maintenanceMode}
            type="toggle"
            onValueChange={(value) => updateSetting('maintenanceMode', value)}
          />

          <SettingItem
            title="Allow Registration"
            subtitle="Allow new users to register"
            value={settingsState.allowRegistration}
            type="toggle"
            onValueChange={(value) => updateSetting('allowRegistration', value)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Hours</Text>
          <Text style={styles.sectionSubtitle}>Configure operating hours for each day</Text>

          {Object.entries(settingsState.businessHours).map(([day, hours]) => (
            <View key={day} style={styles.businessHourItem}>
              <Text style={styles.dayName}>
                {day.charAt(0).toUpperCase() + day.slice(1)}
              </Text>
              {hours.closed ? (
                <Text style={styles.closedText}>Closed</Text>
              ) : (
                <Text style={styles.hoursText}>
                  {hours.open} - {hours.close}
                </Text>
              )}
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => openBusinessHoursModal(day, hours)}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Actions</Text>

          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#E87E35' }]}
            onPress={handleSendTestEmail}
          >
            <View style={styles.actionButtonContent}>
              <Ionicons name="mail-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Send Test Email</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#E87E35' }]}
            onPress={handleExportData}
          >
            <View style={styles.actionButtonContent}>
              <Ionicons name="download-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Export Data</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#ff4444' }]}
            onPress={handleClearCache}
          >
            <View style={styles.actionButtonContent}>
              <Ionicons name="trash-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Clear Cache</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version {settingsState.appVersion}</Text>
          <Text style={styles.versionSubtitle}>Restaurant Management System</Text>
        </View>
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom Navigation */}
      <AdminBottomNavigation onMorePress={() => setShowMoreMenu(true)} tabNavigation={tabNavigation} />

      {/* Profile Menu Modal */}
      <Modal
        visible={showProfileMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowProfileMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowProfileMenu(false)}
        >
          <View style={styles.profileMenu}>
            <View style={styles.profileMenuHeader}>
              <Image
                source={{ uri: userData.image || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop' }}
                style={styles.profileMenuImage}
              />
              <View>
                <Text style={styles.profileMenuName}>{userData.name}</Text>
                <Text style={styles.profileMenuRole}>{t('profile.administrator')}</Text>
              </View>
            </View>
            <View style={styles.profileMenuDivider} />
            <TouchableOpacity
              style={styles.profileMenuItem}
              onPress={() => {
                setShowProfileMenu(false);
                navigateOnRootStack(navigation, 'ProfileEdit');
              }}
            >
              <Ionicons name="image-outline" size={20} color="#E87E35" />
              <Text style={styles.profileMenuItemText}>{t('profile.changeImage')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileMenuItem}
              onPress={() => {
                setShowProfileMenu(false);
                navigateOnRootStack(navigation, 'ProfileEdit');
              }}
            >
              <Ionicons name="create-outline" size={20} color="#E87E35" />
              <Text style={styles.profileMenuItemText}>{t('profile.changeName')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileMenuItem}
              onPress={() => {
                setShowProfileMenu(false);
                navigateOnRootStack(navigation, 'ChangePassword');
              }}
            >
              <Ionicons name="key-outline" size={20} color="#E87E35" />
              <Text style={styles.profileMenuItemText}>{t('profile.changePassword')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileMenuItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#E87E35" />
              <Text style={styles.profileMenuItemText}>{t('profile.logout')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* More Menu Modal */}
      <Modal
        visible={showMoreMenu}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMoreMenu(false)}
      >
        <TouchableOpacity 
          style={styles.moreMenuOverlay}
          activeOpacity={1}
          onPress={() => setShowMoreMenu(false)}
        >
          <View style={styles.moreMenuContainer}>
            <View style={styles.moreMenuHeader}>
              <Text style={styles.moreMenuTitle}>More Options</Text>
              <TouchableOpacity onPress={() => setShowMoreMenu(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            {getMenuItems().map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.moreMenuItem}
                onPress={() => {
                  setShowMoreMenu(false);
                  const branchId =
                    (userData as any)?.assignedBranch?._id ||
                    (userData as any)?.branchId ||
                    (userData as any)?.assignedBranch;
                  if (item.screen === 'PrinterSettings') {
                    // @ts-ignore
                    navigation.navigate('PrinterSettings', { branchId: String(branchId || '') });
                  } else {
                    // @ts-ignore
                    navigation.navigate(item.screen);
                  }
                }}
              >
                <View style={styles.moreMenuIconContainer}>
                  <Ionicons name={item.icon as any} size={20} color="#E87E35" />
                </View>
                <Text style={styles.moreMenuItemText}>{item.name}</Text>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Setting Modal */}
      <Modal
        visible={editModal.visible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditModal({ ...editModal, visible: false })}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.editModalOverlay}
        >
          <View style={styles.editModalContainer}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Edit {editModal.title}</Text>
              <TouchableOpacity onPress={() => setEditModal({ ...editModal, visible: false })}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.editModalInput}
              value={editModal.value}
              onChangeText={(text) => setEditModal({ ...editModal, value: text })}
              keyboardType={editModal.type === 'number' ? 'decimal-pad' : 'default'}
              autoFocus
            />
            <TouchableOpacity style={styles.editModalButton} onPress={saveEditModal}>
              <Text style={styles.editModalButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Business Hours Edit Modal */}
      <Modal
        visible={businessHoursModal.visible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setBusinessHoursModal({ ...businessHoursModal, visible: false })}
      >
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalContainer}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>
                {businessHoursModal.day.charAt(0).toUpperCase() + businessHoursModal.day.slice(1)} Hours
              </Text>
              <TouchableOpacity onPress={() => setBusinessHoursModal({ ...businessHoursModal, visible: false })}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.closedToggle}>
              <Text style={styles.closedToggleText}>Closed</Text>
              <Switch
                value={businessHoursModal.closed}
                onValueChange={(closed) => setBusinessHoursModal({ ...businessHoursModal, closed })}
                trackColor={{ false: '#ddd', true: '#E87E35' }}
                thumbColor={businessHoursModal.closed ? '#fff' : '#f4f3f4'}
              />
            </View>

            {!businessHoursModal.closed && (
              <>
                <View style={styles.timeInputContainer}>
                  <Text style={styles.timeLabel}>Open Time</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={businessHoursModal.open}
                    onChangeText={(open) => setBusinessHoursModal({ ...businessHoursModal, open })}
                    placeholder="09:00"
                  />
                </View>
                <View style={styles.timeInputContainer}>
                  <Text style={styles.timeLabel}>Close Time</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={businessHoursModal.close}
                    onChangeText={(close) => setBusinessHoursModal({ ...businessHoursModal, close })}
                    placeholder="22:00"
                  />
                </View>
              </>
            )}

            <TouchableOpacity style={styles.editModalButton} onPress={saveBusinessHours}>
              <Text style={styles.editModalButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Currency Selection Modal */}
      <Modal
        visible={currencyModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCurrencyModalVisible(false)}
      >
        <View style={styles.editModalOverlay}>
          <View style={[styles.editModalContainer, { maxHeight: '80%' }]}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Select Currency</Text>
              <TouchableOpacity onPress={() => setCurrencyModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ maxHeight: 400 }}>
              {currencies.map((currency) => {
                // For managers, check branchData; otherwise check settingsState
                const currentCurrency = (userData.role === 'BRANCH_MANAGER' && branchData) 
                  ? branchData.currency 
                  : settingsState.defaultCurrency;
                const isSelected = currentCurrency === currency.code;
                return (
                  <TouchableOpacity
                    key={currency.code}
                    style={[
                      styles.currencyItem,
                      isSelected && styles.currencyItemSelected
                    ]}
                    onPress={() => selectCurrency(currency.code)}
                  >
                    <Text style={{ fontSize: 24, marginRight: 12 }}>{currency.flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        styles.currencyCode,
                        isSelected && styles.currencyTextSelected
                      ]}>
                        {currency.code}
                      </Text>
                      <Text style={[
                        styles.currencyName,
                        isSelected && styles.currencyTextSelected
                      ]}>
                        {currency.name}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 18, color: '#E87E35', fontWeight: '600' }}>
                      {currency.symbol}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color="#E87E35" style={{ marginLeft: 8 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Language Selection Modal */}
      <Modal
        visible={languageModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.editModalOverlay}>
          <View style={[styles.editModalContainer, { maxHeight: '80%' }]}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Select Language</Text>
              <TouchableOpacity onPress={() => setLanguageModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {languages.map((language) => {
                // For managers, check branchData; otherwise check settingsState
                const currentLanguage = (userData.role === 'BRANCH_MANAGER' && branchData) 
                  ? branchData.language 
                  : settingsState.defaultLanguage;
                const isSelected = currentLanguage === language.code;
                return (
                  <TouchableOpacity
                    key={language.code}
                    style={[
                      styles.currencyItem,
                      isSelected && styles.currencyItemSelected
                    ]}
                    onPress={() => selectLanguage(language.code)}
                  >
                    <Text style={{ fontSize: 24, marginRight: 12 }}>{language.flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        styles.currencyCode,
                        isSelected && styles.currencyTextSelected
                      ]}>
                        {language.name}
                      </Text>
                      <Text style={[
                        styles.currencyName,
                        isSelected && styles.currencyTextSelected
                      ]}>
                        {language.nativeName}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color="#E87E35" style={{ marginLeft: 8 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Change Name Modal */}
      <Modal
        visible={showChangeNameModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowChangeNameModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.editModalOverlay}
        >
          <TouchableOpacity 
            style={styles.editModalOverlay}
            activeOpacity={1}
            onPress={() => setShowChangeNameModal(false)}
          >
            <View style={[styles.editModalContainer, { paddingBottom: insets.bottom + 20 }]} onStartShouldSetResponder={() => true}>
              <View style={styles.editModalHeader}>
                <Text style={styles.editModalTitle}>{t('profile.changeName')}</Text>
                <TouchableOpacity onPress={() => setShowChangeNameModal(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.editModalInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="Enter your name"
                autoFocus
              />
              <TouchableOpacity 
                style={styles.editModalButton}
                onPress={handleChangeName}
                disabled={loading}
              >
                <Text style={styles.editModalButtonText}>{loading ? t('common.loading') : t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change Image Modal */}
      <Modal
        visible={showChangeImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowChangeImageModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.editModalOverlay}
        >
          <TouchableOpacity 
            style={styles.editModalOverlay}
            activeOpacity={1}
            onPress={() => setShowChangeImageModal(false)}
          >
            <View style={[styles.editModalContainer, { paddingBottom: insets.bottom + 20 }]} onStartShouldSetResponder={() => true}>
              <View style={styles.editModalHeader}>
                <Text style={styles.editModalTitle}>{t('profile.changeImage')}</Text>
                <TouchableOpacity onPress={() => setShowChangeImageModal(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              {userData.image && (
                <View style={styles.currentImageContainer}>
                  <Image source={{ uri: userData.image }} style={styles.currentImage} />
                </View>
              )}
              
              <TouchableOpacity 
                style={styles.imageOptionButton}
                onPress={takePhoto}
              >
                <Ionicons name="camera-outline" size={24} color="#E87E35" />
                <Text style={styles.imageOptionText}>Take Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.imageOptionButton}
                onPress={pickImage}
              >
                <Ionicons name="images-outline" size={24} color="#E87E35" />
                <Text style={styles.imageOptionText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a2e',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  settingValue: {
    fontSize: 16,
    color: '#E87E35',
    fontWeight: '600',
  },
  businessHourItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dayName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a2e',
    width: 100,
    textTransform: 'capitalize',
  },
  hoursText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  closedText: {
    fontSize: 14,
    color: '#ff4444',
    fontWeight: '500',
    flex: 1,
  },
  editButton: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  actionButton: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  versionContainer: {
    alignItems: 'center',
    padding: 32,
  },
  versionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  versionSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  bottomSpacer: {
    height: 100,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingTop: getSpacing(2),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: getSpacing(1),
    minWidth: 48,
  },
  navText: {
    fontSize: 12,
    color: COLORS.tabInactive,
    marginTop: getSpacing(1),
  },
  navTextActive: {
    color: COLORS.tabActive,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    paddingTop: 70,
    paddingRight: 16,
    alignItems: 'flex-end',
  },
  // Branch Info Styles - Match Homepage
  branchInfoContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  branchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 8,
  },
  branchInfoText: {
    fontSize: 14,
    color: '#E87E35',
    fontWeight: '600',
  },
  branchCodeBadge: {
    backgroundColor: '#E87E35',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  branchCodeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },
  profileMenu: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  profileMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  profileMenuImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  profileMenuName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  profileMenuRole: {
    fontSize: 12,
    color: '#888',
  },
  profileMenuDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  profileMenuItemText: {
    fontSize: 14,
    color: '#E87E35',
    fontWeight: '500',
  },
  moreMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  moreMenuContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  moreMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  moreMenuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  moreMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  moreMenuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff5f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  moreMenuItemText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  editModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  editModalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  editModalButton: {
    backgroundColor: '#E87E35',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  editModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  imagePresets: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  presetImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#E87E35',
  },
  currentImageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  currentImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#E87E35',
  },
  imageOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E87E35',
  },
  imageOptionText: {
    fontSize: 16,
    color: '#E87E35',
    fontWeight: '600',
    marginLeft: 12,
  },
  closedToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closedToggleText: {
    fontSize: 16,
    color: '#333',
  },
  timeInputContainer: {
    marginBottom: 16,
  },
  timeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  currencyItemSelected: {
    backgroundColor: '#FFF5ED',
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  currencyName: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  currencyTextSelected: {
    color: '#E87E35',
  },
  // Header notification styles
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
