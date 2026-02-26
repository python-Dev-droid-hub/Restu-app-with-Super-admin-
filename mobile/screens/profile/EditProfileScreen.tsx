import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

const DESIGN = {
  colors: {
    orange: '#FF7A59',
    green: '#2BC48A',
    blue: '#6C63FF',
    red: '#FF4D4D',
    darkText: '#1A1A2E',
    lightBg: '#F8F9FA',
    white: '#FFFFFF',
    muted: '#8E8E93',
    border: '#E5E5EA',
  },
  spacing: { pagePad: 16 },
};

interface EditProfileScreenProps {
  userData: any;
  setUserData: (data: any) => void;
  onBack: () => void;
  api: any;
}

export default function EditProfileScreen({ userData, setUserData, onBack, api }: EditProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState(userData?.name || 'Chef Michael');
  const [phoneNumber, setPhoneNumber] = useState(userData?.phone_number || '+92-300-1234567');
  const [specialization, setSpecialization] = useState(userData?.specialization || 'Italian Cuisine, Grilling');
  const [profileImage, setProfileImage] = useState<string | null>(userData?.avatar || null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to photos to change profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const userId = userData?.id || 'current';
      console.log('Updating profile for user:', userId);

      const payload: any = {
        display_name: displayName,
        phone_number: phoneNumber,
        specialization: specialization,
      };

      if (profileImage && profileImage !== userData?.avatar) {
        payload.profile_image = profileImage;
      }

      console.log('Payload:', payload);

      const response = await api.patch(`/users/${userId}`, payload);
      console.log('Response:', response);

      if (response.success) {
        setUserData({ ...userData, name: displayName, phone_number: phoneNumber, specialization: specialization, avatar: profileImage });
        Alert.alert('Success', 'Profile updated successfully!');
        onBack();
      } else {
        Alert.alert('Error', response.message || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Profile update error:', error);
      Alert.alert('Error', error?.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 150 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color={DESIGN.colors.darkText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Profile Image */}
        <View style={styles.imageSection}>
          <View style={styles.profileImageLarge}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImageActual} />
            ) : (
              <Ionicons name="person" size={60} color="#fff" />
            )}
          </View>
          <TouchableOpacity style={styles.changeImageBtn} onPress={pickImage}>
            <Text style={styles.changeImageText}>Change Profile Picture</Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={(text) => { setDisplayName(text); setHasChanges(true); }}
              placeholder="Enter display name"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={(text) => { setPhoneNumber(text); setHasChanges(true); }}
              placeholder="+92-XXX-XXXXXXX"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email (Read-only)</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value="chef@restaurant.com"
              editable={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Specialization</Text>
            <TextInput
              style={styles.input}
              value={specialization}
              onChangeText={(text) => { setSpecialization(text); setHasChanges(true); }}
              placeholder="Enter your specializations"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Assigned Branch</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value="Main Branch - Gulberg"
              editable={false}
            />
            <Text style={styles.hint}>Contact admin to change branch assignment</Text>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.saveBtn, (!hasChanges || isLoading) && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!hasChanges || isLoading}
          >
            <Text style={styles.saveBtnText}>{isLoading ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onBack}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DESIGN.colors.lightBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: DESIGN.colors.white,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DESIGN.colors.darkText,
  },
  imageSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  profileImageLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: DESIGN.colors.orange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageActual: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  changeImageBtn: {
    marginTop: 16,
  },
  changeImageText: {
    color: DESIGN.colors.blue,
    fontSize: 14,
    fontWeight: '600',
  },
  form: {
    paddingHorizontal: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN.colors.darkText,
    marginBottom: 8,
  },
  input: {
    backgroundColor: DESIGN.colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: DESIGN.colors.darkText,
    borderWidth: 1,
    borderColor: DESIGN.colors.border,
  },
  inputDisabled: {
    backgroundColor: '#F5F5F5',
    color: DESIGN.colors.muted,
  },
  hint: {
    fontSize: 12,
    color: DESIGN.colors.muted,
    marginTop: 4,
  },
  buttonRow: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  saveBtn: {
    backgroundColor: DESIGN.colors.blue,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveBtnDisabled: {
    backgroundColor: '#CCCCCC',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: DESIGN.colors.muted,
    fontSize: 15,
    fontWeight: '600',
  },
});
