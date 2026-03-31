import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../components/api/client';

interface FavoriteProduct {
  id: string;
  product: {
    id: string;
    name: string;
    price: number;
    originalPrice?: number;
    imageUrl?: string;
    image?: string;
    images?: string[];
  };
}

export default function FavoritesScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFavorites = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[FavoritesScreen] Loading favorites...');
      const response = await api.get('/customer/favorites');
      console.log('[FavoritesScreen] Full API response:', JSON.stringify(response, null, 2));
      if (response.success && response.data) {
        const favs = response.data.favorites || [];
        console.log('[FavoritesScreen] Parsed favorites:', favs.length, favs);
        setFavorites(favs);
      } else {
        console.error('[FavoritesScreen] API returned error:', response.message);
        setFavorites([]);
      }
    } catch (error: any) {
      console.error('[FavoritesScreen] Error loading favorites:', error);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const removeFavorite = async (favoriteId: string) => {
    try {
      const response = await api.delete(`/customer/favorites/${favoriteId}`);
      if (response.success) {
        setFavorites((prev) => prev.filter((f) => f.id !== favoriteId));
      }
    } catch (error) {
      console.error('[FavoritesScreen] Error removing favorite:', error);
      Alert.alert('Error', 'Failed to remove from favorites');
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  }, [loadFavorites]);

  const getFullImageUrl = useCallback((url?: string): string => {
    if (!url) return '';
    const normalized = String(url).replace(/\\/g, '/');
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
    const baseUrl = api.getBaseURL().replace(/\/?api\/?$/, '');
    if (normalized.startsWith('/')) return `${baseUrl}${normalized}`;
    return `${baseUrl}/${normalized}`;
  }, []);

  const getProductImage = useCallback((p?: FavoriteProduct['product']): string => {
    if (!p) return '';
    if (Array.isArray(p.images) && p.images.length > 0) return getFullImageUrl(p.images[0]);
    return getFullImageUrl(p.imageUrl || p.image);
  }, [getFullImageUrl]);

  const renderFavorite = ({ item }: { item: FavoriteProduct }) => (
    <View style={styles.cardContainer}>
      <TouchableOpacity style={styles.card} activeOpacity={0.9}>
        <Image
          source={{
            uri:
              getProductImage(item.product) ||
              'https://images.unsplash.com/photo-1546069901-ba9592793667?w=400&h=300&fit=crop',
          }}
          style={styles.image}
        />
        <TouchableOpacity 
          style={styles.heartButton}
          onPress={() => removeFavorite(item.id)}
        >
          <Ionicons name="heart" size={18} color={colors.danger} />
        </TouchableOpacity>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>{item.product?.name || 'Unknown Product'}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>${(item.product?.price || 0).toFixed(0)}</Text>
            {item.product?.originalPrice && item.product.originalPrice > item.product.price && (
              <Text style={styles.originalPrice}>${item.product.originalPrice.toFixed(0)}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
        <View style={styles.header}>
          <Text style={styles.title}>My Favorites</Text>
          <Text style={styles.subtitle}>Loading...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (favorites.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
        <View style={styles.header}>
          <Text style={styles.title}>My Favorites</Text>
          <Text style={styles.subtitle}>0 saved items</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={80} color={colors.gray_300} />
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptySubtitle}>Add items to your favorites</Text>
          <TouchableOpacity style={styles.browseButton} onPress={() => navigation.navigate('Home' as never)}>
            <Text style={styles.browseButtonText}>BROWSE MENU</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}> 
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={styles.header}>
        <Text style={styles.title}>My Favorites</Text>
        <Text style={styles.subtitle}>{favorites.length} saved items</Text>
      </View>
      <FlatList
        key="favorites-grid-2"
        data={favorites}
        renderItem={renderFavorite}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.horizontal, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: typography.sizes.h2, fontWeight: typography.weights.bold, color: colors.text_dark },
  subtitle: { fontSize: typography.sizes.body, color: colors.text_medium, marginTop: spacing.xs },
  list: { padding: spacing.sm, paddingBottom: 100 },
  row: { justifyContent: 'space-between' },
  cardContainer: { width: '50%', padding: spacing.xs },
  card: { backgroundColor: colors.white, borderRadius: borderRadius.md, overflow: 'hidden', ...shadows.light, flex: 1 },
  image: { width: '100%', height: 100, resizeMode: 'cover' },
  heartButton: { position: 'absolute', top: spacing.xs, right: spacing.xs, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: borderRadius.round, padding: 4 },
  info: { padding: spacing.sm },
  name: { fontSize: typography.sizes.small, fontWeight: typography.weights.bold, color: colors.text_dark, minHeight: 32 },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4 },
  price: { fontSize: typography.sizes.small, fontWeight: typography.weights.bold, color: colors.primary },
  originalPrice: { fontSize: 10, color: colors.gray_500, textDecorationLine: 'line-through' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  emptyTitle: { fontSize: typography.sizes.h3, fontWeight: typography.weights.bold, color: colors.text_dark, marginTop: spacing.lg },
  emptySubtitle: { fontSize: typography.sizes.body, color: colors.text_medium, marginTop: spacing.xs },
  browseButton: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.md, marginTop: spacing.lg },
  browseButtonText: { color: colors.white, fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
