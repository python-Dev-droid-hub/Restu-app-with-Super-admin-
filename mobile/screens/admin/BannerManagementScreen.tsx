import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../components/api/client';
import { colors, spacing } from '../../theme';

// Components
import BannerHeader from './components/BannerHeader';
import BannerCard from './components/BannerCard';
import BannerFormModal from './components/BannerFormModal';

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
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
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
  };

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

  const handleToggleStatus = async (bannerId: string, isActive: boolean) => {
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

  // Sort banners by display order
  const sortedBanners = [...banners].sort((a, b) => a.displayOrder - b.displayOrder);

  const renderBanner = ({ item }: { item: Banner }) => (
    <BannerCard
      banner={item}
      onEdit={handleEditBanner}
      onDelete={handleDeleteBanner}
      onToggleStatus={handleToggleStatus}
    />
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BannerHeader
        onBack={() => navigation.goBack()}
        onAddBanner={handleAddBanner}
      />

      <FlatList
        data={sortedBanners}
        renderItem={renderBanner}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🖼️</Text>
            <Text style={styles.emptyTitle}>No banners yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first promotional banner to display on the customer home screen
            </Text>
          </View>
        }
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
    backgroundColor: colors.gray_100,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: spacing.card,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: spacing.horizontal,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.card,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text_dark,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.gray_600,
    textAlign: 'center',
    lineHeight: 20,
  },
});
