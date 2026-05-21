import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalization } from '../../context/LocalizationContext';
import { navigateOnRootStack } from '../../utils/navigationHelpers';

interface ProfileMenuProps {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
  /** Screen navigation (tab or stack). Used to open ProfileEdit / ChangePassword on root stack. */
  navigation?: { getParent?: () => unknown; navigate: (...args: unknown[]) => void };
  onChangePassword?: () => void;
  onEditProfile?: () => void;
  role?: string;
}

interface UserData {
  name: string;
  email: string;
  image: string | null;
}

export default function ProfileMenu({
  visible,
  onClose,
  onLogout,
  navigation,
  onChangePassword,
  onEditProfile,
  role,
}: ProfileMenuProps) {
  const { t } = useLocalization();
  const [userData, setUserData] = useState<UserData>({
    name: 'Admin User',
    email: 'admin@example.com',
    image: null,
  });
  const [userRole, setUserRole] = useState<string>(role || '');

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

  const openEditProfile = () => {
    onClose();
    if (onEditProfile) {
      onEditProfile();
      return;
    }
    if (navigation) {
      navigateOnRootStack(navigation, 'ProfileEdit');
    }
  };

  const openChangePassword = () => {
    onClose();
    if (onChangePassword) {
      onChangePassword();
      return;
    }
    if (navigation) {
      navigateOnRootStack(navigation, 'ChangePassword');
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
            const { clearAuthTokens } = await import('../../utils/secureAuthStorage');
            await clearAuthTokens();
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
            <TouchableOpacity style={styles.profileMenuItem} onPress={openEditProfile}>
              <Ionicons name="image-outline" size={20} color="#E87E35" />
              <Text style={styles.profileMenuItemText}>{t('profile.changeImage')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileMenuItem} onPress={openEditProfile}>
              <Ionicons name="create-outline" size={20} color="#E87E35" />
              <Text style={styles.profileMenuItemText}>{t('profile.changeName')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileMenuItem} onPress={openChangePassword}>
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
});
