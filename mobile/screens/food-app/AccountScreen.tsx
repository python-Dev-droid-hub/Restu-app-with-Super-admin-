import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  StatusBar,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../components/api/client';
import * as ImagePicker from 'expo-image-picker';

const MENU_ITEMS = [
  { id: '1', title: 'Change Profile Image', icon: 'image-outline', action: 'changeImage' as const },
  { id: '2', title: 'Change Name', icon: 'person-outline', action: 'changeName' as const },
  { id: '3', title: 'Change Password', icon: 'lock-closed-outline', action: 'changePassword' as const },
  { id: '4', title: 'Addresses', icon: 'location-outline', action: 'addresses' as const },
  { id: '5', title: 'Payment Methods', icon: 'card-outline', action: 'paymentMethods' as const },
  { id: '6', title: 'Notifications', icon: 'notifications-outline', action: 'notifications' as const },
];

interface UserData {
  name?: string;
  email?: string;
  phone?: string;
  image?: string;
}

export default function AccountScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [userData, setUserData] = useState<UserData>({});
  const [stats, setStats] = useState({ orders: 0, addresses: 0, cards: 0 });
  const [loading, setLoading] = useState(true);

  const [showChangeName, setShowChangeName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const normalizeMediaUrl = (uri?: string) => {
    if (!uri) return undefined;
    const value = String(uri);
    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) return value;
    if (!value.startsWith('/')) return value;
    const base = api.getBaseURL();
    const host = base.endsWith('/api') ? base.slice(0, -4) : base;
    return `${host}${value}`;
  };

  const loadUserData = async () => {
    try {
      const stored = await AsyncStorage.getItem('userData');
      if (stored) {
        const parsed = JSON.parse(stored);
        const initialName = parsed.name || parsed.displayName || parsed.display_name || 'Customer';
        setUserData({
          name: initialName,
          email: parsed.email || '',
          phone: parsed.phone || parsed.phoneNumber || '',
          image: normalizeMediaUrl(parsed.image || parsed.avatar || parsed.profileImage),
        });
        setNameDraft(initialName);
      }
    } catch (error) {
      console.error('[AccountScreen] Error loading user data:', error);
    }
  };

  const updateStoredUserData = async (patch: Record<string, any>) => {
    const existingRaw = await AsyncStorage.getItem('userData');
    const existing = existingRaw ? JSON.parse(existingRaw) : {};
    const next = { ...existing, ...patch };
    await AsyncStorage.setItem('userData', JSON.stringify(next));
    setUserData({
      name: next.name || next.displayName || next.display_name || userData.name,
      email: next.email || userData.email,
      phone: next.phone || next.phoneNumber || userData.phone,
      image: normalizeMediaUrl(next.image || next.avatar || next.profileImage) || userData.image,
    });
  };

  const saveName = async () => {
    const nextName = String(nameDraft || '').trim();
    if (!nextName) {
      Alert.alert('Invalid Name', 'Please enter a name.');
      return;
    }
    try {
      setSavingName(true);
      const response = await api.patch('/users/profile', { name: nextName });
      if (!response.success) {
        Alert.alert('Error', response.message || 'Failed to update name');
        return;
      }
      await updateStoredUserData({ name: nextName, displayName: nextName, display_name: nextName });
      setShowChangeName(false);
      Alert.alert('Success', 'Name updated successfully');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const pickAndUploadProfileImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission required', 'Please allow photo library access to change profile image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert('Error', 'Failed to read image data');
        return;
      }

      setUploadingImage(true);

      const mimeType = asset.mimeType || 'image/jpeg';
      const dataUrl = `data:${mimeType};base64,${asset.base64}`;
      const uploadRes: any = await api.post('/upload', {
        image: dataUrl,
        filename: `profile-${Date.now()}.jpg`,
        mimeType,
      });

      const uploadedUrl = uploadRes?.data?.url || uploadRes?.data?.imageUrl || uploadRes?.data?.path;
      if (!uploadRes.success || !uploadedUrl) {
        Alert.alert('Error', uploadRes.message || 'Failed to upload image');
        return;
      }

      const profileRes = await api.patch('/users/profile', { avatar: uploadedUrl, image: uploadedUrl });
      if (!profileRes.success) {
        Alert.alert('Error', profileRes.message || 'Failed to update profile image');
        return;
      }

      await updateStoredUserData({ image: uploadedUrl, avatar: uploadedUrl, profileImage: uploadedUrl });
      Alert.alert('Success', 'Profile image updated');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update profile image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleMenuAction = (action: (typeof MENU_ITEMS)[number]['action']) => {
    if (action === 'changeImage') {
      pickAndUploadProfileImage();
      return;
    }
    if (action === 'changeName') {
      setShowChangeName(true);
      return;
    }
    if (action === 'changePassword') {
      navigation.navigate('ChangePassword' as never);
      return;
    }
    if (action === 'addresses') {
      navigation.navigate('Addresses' as never);
      return;
    }
    if (action === 'paymentMethods') {
      navigation.navigate('PaymentMethods' as never);
      return;
    }
    if (action === 'notifications') {
      navigation.navigate('Notifications' as never);
      return;
    }
  };

  const loadStats = async () => {
    try {
      // Fetch real order count from API
      const ordersRes = await api.get('/orders/my-orders');
      const orderCount = ordersRes.success ? (ordersRes.data?.orders?.length || 0) : 0;
      
      // For now, use mock data for addresses and cards until those endpoints are ready
      setStats({
        orders: orderCount,
        addresses: 2,
        cards: 1,
      });
    } catch (error) {
      console.error('[AccountScreen] Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
    loadStats();
  }, []);

  const handleLogout = async () => {
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
              await AsyncStorage.multiRemove(['authToken', 'userRole', 'userData', 'userId']);
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                })
              );
            } catch (error) {
              console.error('[AccountScreen] Logout error:', error);
            }
          }
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Image
            source={userData.image ? { uri: userData.image } : require('../../assets/icon.png')}
            style={styles.avatar}
            defaultSource={require('../../assets/icon.png')}
          />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{userData.name || 'Customer'}</Text>
          <Text style={styles.phone}>{userData.phone || ''}</Text>
          <Text style={styles.email}>{userData.email || ''}</Text>
        </View>
        <TouchableOpacity style={styles.editButton}>
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats.orders}</Text>
          <Text style={styles.statLabel}>Orders</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats.addresses}</Text>
          <Text style={styles.statLabel}>Addresses</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats.cards}</Text>
          <Text style={styles.statLabel}>Cards</Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={() => handleMenuAction(item.action)}
          >
            <View style={styles.menuIcon}>
              <Ionicons name={item.icon as any} size={22} color={colors.primary} />
            </View>
            <Text style={styles.menuText}>{item.title}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.gray_400} />
          </TouchableOpacity>
        ))}
      </View>

      <Modal visible={showChangeName} transparent animationType="slide" onRequestClose={() => setShowChangeName(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalCardWrap}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowChangeName(false)} disabled={savingName}>
                  <Ionicons name="close" size={24} color={colors.text_dark} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Change Name</Text>
                <View style={{ width: 24 }} />
              </View>

              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalBody}>
                <Text style={styles.modalLabel}>Your Name</Text>
                <TextInput
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  placeholder="Enter your name"
                  style={styles.modalInput}
                  autoCapitalize="words"
                  editable={!savingName}
                />
              </ScrollView>

              <TouchableOpacity
                style={[styles.modalSaveButton, (savingName || !String(nameDraft || '').trim()) && { opacity: 0.6 }]}
                onPress={saveName}
                disabled={savingName || !String(nameDraft || '').trim()}
              >
                <Text style={styles.modalSaveText}>{savingName ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color={colors.danger} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.horizontal,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: typography.sizes.h2,
    fontWeight: typography.weights.bold,
    color: colors.text_dark,
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, padding: spacing.lg, marginBottom: spacing.sm },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  profileInfo: { flex: 1, marginLeft: spacing.md },
  name: { fontSize: typography.sizes.h3, fontWeight: typography.weights.bold, color: colors.text_dark },
  phone: { fontSize: typography.sizes.small, color: colors.text_medium, marginTop: 2 },
  email: { fontSize: typography.sizes.small, color: colors.text_medium, marginTop: 2 },
  editButton: { padding: spacing.sm },
  statsContainer: { flexDirection: 'row', backgroundColor: colors.white, paddingVertical: spacing.md, marginBottom: spacing.sm },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: typography.sizes.h2, fontWeight: typography.weights.bold, color: colors.primary },
  statLabel: { fontSize: typography.sizes.small, color: colors.text_medium, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.gray_200 },
  menuContainer: { backgroundColor: colors.white },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.gray_100 },
  menuIcon: { width: 40, height: 40, borderRadius: borderRadius.md, backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  menuText: { flex: 1, fontSize: typography.sizes.body, color: colors.text_dark, fontWeight: typography.weights.medium },
  logoutButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, marginTop: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  logoutText: { marginLeft: spacing.md, fontSize: typography.sizes.body, color: colors.danger, fontWeight: typography.weights.medium },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCardWrap: {
    width: '100%',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.horizontal,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray_100,
  },
  modalTitle: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.bold,
    color: colors.text_dark,
  },
  modalBody: {
    padding: spacing.horizontal,
    paddingBottom: spacing.lg,
  },
  modalLabel: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    color: colors.text_medium,
    marginBottom: spacing.sm,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.gray_200,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.body,
    color: colors.text_dark,
    backgroundColor: colors.white,
  },
  modalSaveButton: {
    backgroundColor: colors.primary,
    marginHorizontal: spacing.horizontal,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  modalSaveText: {
    color: colors.white,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
});
