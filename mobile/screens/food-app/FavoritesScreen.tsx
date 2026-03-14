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

interface FavoriteItem {
  id: string;
  branchId: string;
  branchName: string;
  address?: string;
  city?: string;
  phone?: string;
  image?: string;
}

export default function FavoritesScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFavorites = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/favorites');
      console.log('[FavoritesScreen] API response:', response);
      if (response.success && response.data) {
        setFavorites(response.data.favorites || []);
      } else {
        // Handle case where API returns error but not 500
        console.error('[FavoritesScreen] API returned error:', response.message);
        setFavorites([]);
      }
    } catch (error: any) {
      console.error('[FavoritesScreen] Error loading favorites:', error);
      // If 500 error or any error, show empty state
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const removeFavorite = async (branchId: string) => {
    try {
      const response = await api.delete(`/favorites/${branchId}`);
      if (response.success) {
        setFavorites((prev) => prev.filter((f) => f.branchId !== branchId));
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

  const renderFavorite = ({ item }: { item: FavoriteItem }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.9}>
      <Image 
        source={{ uri: item.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop' }} 
        style={styles.image} 
      />
      <TouchableOpacity 
        style={styles.heartButton}
        onPress={() => removeFavorite(item.branchId)}
      >
        <Ionicons name="heart" size={20} color={colors.danger} />
      </TouchableOpacity>
      <View style={styles.info}>
        <Text style={styles.name}>{item.branchName}</Text>
        <Text style={styles.restaurant}>{item.address || item.city || 'Nearby location'}</Text>
        <Text style={styles.phone}>{item.phone || ''}</Text>
      </View>
      <TouchableOpacity style={styles.orderButton} activeOpacity={0.8}>
        <Text style={styles.orderText}>ORDER NOW</Text>
      </TouchableOpacity>
    </TouchableOpacity>
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
        data={favorites}
        renderItem={renderFavorite}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
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
  list: { padding: spacing.horizontal, paddingBottom: 100 },
  card: { backgroundColor: colors.white, borderRadius: borderRadius.lg, marginBottom: spacing.md, overflow: 'hidden', ...shadows.medium },
  image: { width: '100%', height: 150 },
  heartButton: { position: 'absolute', top: spacing.md, right: spacing.md, backgroundColor: colors.white, borderRadius: borderRadius.round, padding: spacing.xs },
  info: { padding: spacing.md },
  name: { fontSize: typography.sizes.h4, fontWeight: typography.weights.bold, color: colors.text_dark },
  restaurant: { fontSize: typography.sizes.small, color: colors.text_medium, marginTop: 2 },
  phone: { fontSize: typography.sizes.small, color: colors.gray_500, marginTop: 2 },
  orderButton: { backgroundColor: colors.primary, marginHorizontal: spacing.md, marginBottom: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, alignItems: 'center' },
  orderText: { color: colors.white, fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  emptyTitle: { fontSize: typography.sizes.h3, fontWeight: typography.weights.bold, color: colors.text_dark, marginTop: spacing.lg },
  emptySubtitle: { fontSize: typography.sizes.body, color: colors.text_medium, marginTop: spacing.xs },
  browseButton: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.md, marginTop: spacing.lg },
  browseButtonText: { color: colors.white, fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
