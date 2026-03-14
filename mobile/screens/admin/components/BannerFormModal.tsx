import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, borderRadius } from '../../../theme';
import { api } from '../../../components/api/client';

interface Banner {
  _id?: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  actionUrl?: string;
  actionText?: string;
  displayOrder: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

interface BannerFormModalProps {
  visible: boolean;
  banner: Banner | null;
  onClose: () => void;
  onSave: () => void;
}

const BannerFormModal = ({ visible, banner, onClose, onSave }: BannerFormModalProps) => {
  const [form, setForm] = useState<Banner>({
    title: '',
    imageUrl: '',
    displayOrder: 1,
    isActive: true,
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (banner) {
      setForm(banner);
    } else {
      setForm({
        title: '',
        imageUrl: '',
        displayOrder: 1,
        isActive: true,
      });
    }
  }, [banner, visible]);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploading(true);
        const asset = result.assets[0];

        // Convert to base64 and upload
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const reader = new FileReader();

        reader.onloadend = async () => {
          const base64 = reader.result as string;
          try {
            const uploadResponse = await api.post('/upload', {
              image: base64.split(',')[1],
              filename: 'banner.jpg',
              mimeType: 'image/jpeg',
            });

            if (uploadResponse.success && uploadResponse.data?.url) {
              setForm({ ...form, imageUrl: uploadResponse.data.url });
            } else {
              Alert.alert('Error', 'Failed to upload image');
            }
          } catch (error) {
            console.error('Upload error:', error);
            Alert.alert('Error', 'Failed to upload image');
          } finally {
            setUploading(false);
          }
        };

        reader.readAsDataURL(blob);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.imageUrl) {
      Alert.alert('Error', 'Please upload a banner image');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        title: form.title?.trim() ? form.title.trim() : 'Banner',
        displayOrder: parseInt(form.displayOrder.toString()) || 1,
      };

      if (banner?._id) {
        await api.put(`/banners/${banner._id}`, payload);
      } else {
        await api.post('/banners', payload);
      }
      onSave();
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save banner');
    } finally {
      setSaving(false);
    }
  };

  const API_BASE_URL = __DEV__ ? 'http://192.168.0.140:3000' : 'https://your-production-api.com';

  const getFullImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url}`;
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text_dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {banner ? 'Edit Banner' : 'Add Banner'}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Image Preview */}
          <View style={styles.section}>
            <Text style={styles.label}>Banner Image</Text>
            <TouchableOpacity onPress={handlePickImage} style={styles.imagePicker}>
              {uploading ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : form.imageUrl ? (
                <Image source={{ uri: getFullImageUrl(form.imageUrl) }} style={styles.previewImage} />
              ) : (
                <View style={styles.noImage}>
                  <Ionicons name="camera-outline" size={40} color={colors.gray_400} />
                  <Text style={styles.noImageText}>Tap to select image</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Display Order */}
          <View style={styles.section}>
            <Text style={styles.label}>Display Order</Text>
            <TextInput
              value={form.displayOrder.toString()}
              onChangeText={(text) => setForm({ ...form, displayOrder: parseInt(text) || 0 })}
              placeholder="1"
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          {/* Status */}
          <View style={styles.section}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.statusRow}>
              <TouchableOpacity
                onPress={() => setForm({ ...form, isActive: true })}
                style={[styles.statusButton, form.isActive && styles.statusButtonActive]}
              >
                <Text style={[styles.statusButtonText, form.isActive && styles.statusButtonTextActive]}>
                  Active
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setForm({ ...form, isActive: false })}
                style={[styles.statusButton, !form.isActive && styles.statusButtonInactive]}
              >
                <Text style={[styles.statusButtonText, !form.isActive && styles.statusButtonTextInactive]}>
                  Inactive
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={styles.saveButton}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.saveButtonText}>
                {banner ? 'UPDATE BANNER' : 'CREATE BANNER'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    paddingHorizontal: spacing.horizontal,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border_light,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text_dark,
  },
  content: {
    padding: spacing.horizontal,
  },
  section: {
    marginBottom: spacing.section,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text_dark,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border_light,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.card,
    paddingVertical: spacing.md,
    fontSize: 14,
    color: colors.text_dark,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  imagePicker: {
    width: '100%',
    height: 200,
    backgroundColor: colors.gray_100,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border_light,
    borderStyle: 'dashed',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.md,
  },
  noImage: {
    alignItems: 'center',
  },
  noImageText: {
    fontSize: 14,
    color: colors.gray_500,
    marginTop: 8,
  },
  statusRow: {
    flexDirection: 'row',
    gap: spacing.itemGap,
  },
  statusButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray_100,
    alignItems: 'center',
  },
  statusButtonActive: {
    backgroundColor: colors.success,
  },
  statusButtonInactive: {
    backgroundColor: colors.gray_400,
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text_dark,
  },
  statusButtonTextActive: {
    color: colors.white,
  },
  statusButtonTextInactive: {
    color: colors.white,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.section,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BannerFormModal;
