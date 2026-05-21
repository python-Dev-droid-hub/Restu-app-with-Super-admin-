import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../components/api/client';
import { COLORS } from '../../constants/colors';

export default function ProfileEditScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('userData');
      if (!stored) return;
      const parsed = JSON.parse(stored);
      setName(parsed.name || parsed.displayName || '');
      setEmail(parsed.email || '');
      setImageUri(
        parsed.profileImage || parsed.image || parsed.avatar || parsed.avatarUrl || null
      );
    } catch (error) {
      console.error('[ProfileEdit] load error:', error);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const persistUserData = async (updates: Record<string, unknown>) => {
    const stored = await AsyncStorage.getItem('userData');
    const parsed = stored ? JSON.parse(stored) : {};
    const merged = { ...parsed, ...updates };
    await AsyncStorage.setItem('userData', JSON.stringify(merged));
  };

  const uploadImage = async (asset: ImagePicker.ImagePickerAsset): Promise<string | null> => {
    if (!asset.base64) {
      Alert.alert('Error', 'Failed to read image. Please try again.');
      return null;
    }
    const mimeType = asset.mimeType || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${asset.base64}`;
    const uploadRes: any = await api.post('/upload', {
      image: dataUrl,
      filename: `profile-${Date.now()}.jpg`,
      mimeType,
    });
    const uploadedUrl =
      uploadRes?.data?.url || uploadRes?.data?.fileUrl || uploadRes?.data?.path;
    if (!uploadRes?.success || !uploadedUrl) {
      Alert.alert('Error', uploadRes?.message || 'Failed to upload image');
      return null;
    }
    return uploadedUrl;
  };

  const pickImage = async (useCamera: boolean) => {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', useCamera ? 'Allow camera access.' : 'Allow gallery access.');
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
          base64: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
          base64: true,
        });

    if (result.canceled || !result.assets[0]) return;

    try {
      setUploadingImage(true);
      const url = await uploadImage(result.assets[0]);
      if (!url) return;

      const response = await api.put('/users/profile', {
        avatar: url,
        profileImage: url,
        image: url,
      });
      if (response.success) {
        setImageUri(url);
        await persistUserData({ profileImage: url, image: url, avatar: url });
        Alert.alert('Success', 'Profile photo updated.');
      } else {
        Alert.alert('Error', response.message || 'Failed to update photo');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update photo');
    } finally {
      setUploadingImage(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert('Change profile photo', 'Choose a source', [
      { text: 'Take photo', onPress: () => pickImage(true) },
      { text: 'Choose from gallery', onPress: () => pickImage(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSaveName = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Please enter your name.');
      return;
    }
    try {
      setLoading(true);
      const response = await api.put('/users/profile', { name: trimmed });
      if (response.success) {
        await persistUserData({ name: trimmed, displayName: trimmed });
        Alert.alert('Success', 'Name updated.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', response.message || 'Failed to update name');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update name');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={showImageOptions}
            disabled={uploadingImage}
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={48} color="#999" />
              </View>
            )}
            <View style={styles.cameraBadge}>
              {uploadingImage ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={18} color="#fff" />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap photo to change</Text>

          {email ? <Text style={styles.email}>{email}</Text> : null}

          <Text style={styles.label}>Display name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            autoCapitalize="words"
          />

          <TouchableOpacity
            style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
            onPress={handleSaveName}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save name</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.darkText },
  content: { padding: 24, alignItems: 'center' },
  avatarWrap: { position: 'relative', marginBottom: 8 },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  avatarPlaceholder: { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  cameraBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    backgroundColor: COLORS.orange,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarHint: { fontSize: 13, color: '#888', marginBottom: 16 },
  email: { fontSize: 14, color: '#666', marginBottom: 20 },
  label: { alignSelf: 'stretch', fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
  },
  saveBtn: {
    alignSelf: 'stretch',
    backgroundColor: COLORS.orange,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
