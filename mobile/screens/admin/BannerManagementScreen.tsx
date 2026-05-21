import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Alert,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../components/api/client';
import { useUserData } from '../../hooks/useUserData';
import { useLocalization } from '../../context/LocalizationContext';

import ResponsiveHeader from '../../components/layout/ResponsiveHeader';
import ProfileMenu from '../../components/common/ProfileMenu';
import AdminBottomNavigation from '../../components/navigation/AdminBottomNavigation';
import BannerCard from './components/BannerCard';
import BannerFormModal from './components/BannerFormModal';

import { getSpacing } from '../../utils/responsive';
import { COLORS } from '../../constants/colors';

interface Banner {
  _id: string;
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

export default function BannerManagementScreen() {
  const navigation = useNavigation() as any;
  const insets = useSafeAreaInsets();
  const { t } = useLocalization();
  const { profileImage } = useUserData();
  const tabNavigation = navigation.getParent();

  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const loadBanners = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/banners');
      if (response.success) {
        setBanners(response.data?.banners || []);
      }
    } catch (error) {
      console.error('Error loading banners:', error);
      Alert.alert('Error', 'Failed to load banners');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  const handleAddBanner = () => {
    setEditingBanner(null);
    setShowModal(true);
  };

  const handleEditBanner = (banner: Banner) => {
    setEditingBanner(banner);
    setShowModal(true);
  };

  const handleDeleteBanner = async (bannerId: string) => {
    try {
      const response = await api.delete(`/banners/${bannerId}`);
      if (response.success) {
        loadBanners();
      }
    } catch (error) {
      console.error('Error deleting banner:', error);
      Alert.alert('Error', 'Failed to delete banner');
    }
  };

  const handleToggleStatus = async (bannerId: string, _isActive: boolean) => {
    try {
      const response = await api.patch(`/banners/${bannerId}/toggle`);
      if (response.success) {
        loadBanners();
      }
    } catch (error) {
      console.error('Error toggling banner:', error);
      Alert.alert('Error', 'Failed to update banner status');
    }
  };

  const handleSaveComplete = () => {
    setShowModal(false);
    loadBanners();
  };

  const sortedBanners = [...banners].sort((a, b) => a.displayOrder - b.displayOrder);

  const renderBanner = ({ item }: { item: Banner }) => (
    <BannerCard
      banner={item}
      onEdit={handleEditBanner}
      onDelete={handleDeleteBanner}
      onToggleStatus={handleToggleStatus}
    />
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <ResponsiveHeader
        title="Banner Management"
        profileImage={profileImage}
        onProfilePress={() => setShowProfileMenu(true)}
        onNotificationPress={() => navigation.navigate('AdminNotifications')}
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.orange} />
        </View>
      ) : (
        <FlatList
          data={sortedBanners}
          renderItem={renderBanner}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: getSpacing(22) + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="image-outline" size={64} color={COLORS.border} />
              <Text style={styles.emptyTitle}>No banners yet</Text>
              <Text style={styles.emptySubtitle}>
                Create promotional banners for the customer home screen
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { bottom: getSpacing(22) + insets.bottom }]}
        onPress={handleAddBanner}
      >
        <Ionicons name="add" size={28} color={COLORS.white} />
      </TouchableOpacity>

      <AdminBottomNavigation
        currentRoute="BannerManagement"
        tabNavigation={tabNavigation}
      />

      <ProfileMenu
        visible={showProfileMenu}
        onClose={() => setShowProfileMenu(false)}
        navigation={navigation}
        onLogout={() => navigation.navigate('Welcome')}
      />

      <BannerFormModal
        visible={showModal}
        banner={editingBanner}
        onClose={() => setShowModal(false)}
        onSave={handleSaveComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: getSpacing(4),
    paddingTop: getSpacing(3),
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: getSpacing(15),
    paddingHorizontal: getSpacing(4),
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.darkText,
    marginTop: getSpacing(3),
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.lightText,
    textAlign: 'center',
    marginTop: getSpacing(2),
  },
  fab: {
    position: 'absolute',
    right: getSpacing(4),
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.orange,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: getSpacing(5),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getSpacing(4),
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.darkText,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: getSpacing(3),
  },
  menuItemText: {
    fontSize: 16,
    color: COLORS.darkText,
    marginLeft: getSpacing(4),
  },
});
