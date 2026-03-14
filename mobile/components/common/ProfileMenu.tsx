import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalization } from '../../context/LocalizationContext';
import { api } from '../api/client';
import { COLORS } from '../../constants/colors';
import { getSpacing } from '../../utils/responsive';

interface ProfileMenuProps {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
  onChangePassword: () => void;
  role?: string;
}

interface UserData {
  name: string;
  email: string;
  image: string | null;
}

export default function ProfileMenu({ visible, onClose, onLogout, onChangePassword, role }: ProfileMenuProps) {
  const insets = useSafeAreaInsets();
  const { t } = useLocalization();
  const [userData, setUserData] = useState<UserData>({
    name: 'Admin User',
    email: 'admin@example.com',
    image: null,
  });
  const [userRole, setUserRole] = useState<string>(role || '');
  const [showChangeNameModal, setShowChangeNameModal] = useState(false);
  const [showChangeImageModal, setShowChangeImageModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadUserData();
      loadUserRole();
    }
  }, [visible]);

  const loadUserRole = async () => {
    try {
      const stored = await AsyncStorage.getItem('userRole');
      if (stored) {
        setUserRole(stored);
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    }
  };

  const loadUserData = async () => {
    try {
      const stored = await AsyncStorage.getItem('userData');
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('[ProfileMenu] Loaded userData:', parsed);
        setUserData({
          name: parsed.name || parsed.displayName || 'Admin User',
          email: parsed.email || 'admin@example.com',
          image: parsed.profileImage || parsed.image || parsed.avatar || parsed.avatarUrl || null,
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleChangeName = async () => {
    if (!newName.trim()) {
      Alert.alert(t('common.error'), t('messages.enterValidName'));
      return;
    }
    try {
      setLoading(true);
      const response = await api.put('/users/profile', { name: newName });
      if (response.success) {
        const updatedUserData = { ...userData, name: newName };
        setUserData(updatedUserData);
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
        Alert.alert(t('common.success'), t('messages.nameUpdated'));
        setShowChangeNameModal(false);
        setNewName('');
      } else {
        Alert.alert(t('common.error'), response.message || 'Failed to update name');
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || 'Failed to update name');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeImage = async (imageUrl: string) => {
    try {
      setLoading(true);
      const response = await api.put('/users/profile', { profileImage: imageUrl });
      if (response.success) {
        const updatedUserData = { ...userData, image: imageUrl };
        setUserData(updatedUserData);
        // Also update AsyncStorage with profileImage field
        const stored = await AsyncStorage.getItem('userData');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.profileImage = imageUrl;
          parsed.image = imageUrl;
          await AsyncStorage.setItem('userData', JSON.stringify(parsed));
        }
        Alert.alert(t('common.success'), t('messages.imageUpdated'));
        setShowChangeImageModal(false);
      } else {
        Alert.alert(t('common.error'), response.message || 'Failed to update image');
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || 'Failed to update image');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert(t('messages.permissionRequired'), t('messages.allowGallery'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      await handleChangeImage(imageUri);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert(t('messages.permissionRequired'), t('messages.allowCamera'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      await handleChangeImage(imageUri);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      t('common.confirm'),
      t('messages.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('profile.logout'), 
          style: 'destructive',
          onPress: async () => {
            onClose(); // Close the modal first
            await AsyncStorage.multiRemove(['authToken', 'userRole', 'userData']);
            onLogout();
          }
        }
      ]
    );
  };

  return (
    <>
      {/* Profile Menu Modal */}
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <View style={styles.profileMenu}>
            <View style={styles.profileMenuHeader}>
              <Image
                source={{ uri: userData.image || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop' }}
                style={styles.profileMenuImage}
              />
              <View>
                <Text style={styles.profileMenuName}>{userData.name}</Text>
                <Text style={styles.profileMenuRole}>
                  {userRole === 'BRANCH_MANAGER' ? 'Manager' : t('profile.administrator')}
                </Text>
              </View>
            </View>
            <View style={styles.profileMenuDivider} />
            <TouchableOpacity 
              style={styles.profileMenuItem} 
              onPress={() => {
                onClose();
                setShowChangeImageModal(true);
              }}
            >
              <Ionicons name="image-outline" size={20} color="#E87E35" />
              <Text style={styles.profileMenuItemText}>{t('profile.changeImage')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.profileMenuItem} 
              onPress={() => {
                onClose();
                setShowChangeNameModal(true);
                setNewName(userData.name);
              }}
            >
              <Ionicons name="create-outline" size={20} color="#E87E35" />
              <Text style={styles.profileMenuItemText}>{t('profile.changeName')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.profileMenuItem} 
              onPress={() => {
                onClose();
                onChangePassword();
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
                placeholder={t('messages.enterName')}
                autoFocus
              />
              <TouchableOpacity 
                style={[styles.editModalButton, loading && styles.editModalButtonDisabled]}
                onPress={handleChangeName}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.editModalButtonText}>{t('common.save')}</Text>
                )}
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
                <Text style={styles.imageOptionText}>{t('messages.takePhoto')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.imageOptionButton}
                onPress={pickImage}
              >
                <Ionicons name="images-outline" size={24} color="#E87E35" />
                <Text style={styles.imageOptionText}>{t('messages.chooseFromGallery')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  profileMenu: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 16,
    marginTop: 80,
    minWidth: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  profileMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  profileMenuImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  profileMenuName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  profileMenuRole: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  profileMenuDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileMenuItemText: {
    marginLeft: 12,
    fontSize: 15,
    color: '#333',
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxWidth: 340,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  editModalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  editModalButton: {
    backgroundColor: '#E87E35',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  editModalButtonDisabled: {
    backgroundColor: '#ccc',
  },
  editModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  currentImageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  currentImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  imageOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 10,
  },
  imageOptionText: {
    marginLeft: 12,
    fontSize: 15,
    color: '#333',
  },
});
