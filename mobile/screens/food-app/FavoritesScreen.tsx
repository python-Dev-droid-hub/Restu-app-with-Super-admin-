import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { formatPrice } from '../../utils/formatHelpers';

const FAVORITES = [
  { id: '1', name: 'Chicken Biryani', restaurant: 'Kabab Jees', price: 250, rating: 4.8, image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=300&h=200&fit=crop' },
  { id: '2', name: 'Tandoori Platter', restaurant: 'BBQ Tonight', price: 450, rating: 4.5, image: 'https://images.unsplash.com/photo-1601058268499-e526861c0f8f?w=300&h=200&fit=crop' },
  { id: '3', name: 'Zinger Burger', restaurant: 'KFC', price: 150, rating: 4.6, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=200&fit=crop' },
];

export default function FavoritesScreen() {
  const navigation = useNavigation();

  const renderFavorite = ({ item }: { item: typeof FAVORITES[0] }) => (
    <TouchableOpacity style={styles.card}>
      <Image source={{ uri: item.image }} style={styles.image} />
      <TouchableOpacity style={styles.heartButton}>
        <Ionicons name="heart" size={20} color={colors.danger} />
      </TouchableOpacity>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.restaurant}>{item.restaurant}</Text>
        <View style={styles.row}>
          <Ionicons name="star" size={14} color={colors.warning} />
          <Text style={styles.rating}>{item.rating}</Text>
        </View>
        <Text style={styles.price}>{formatPrice(item.price)}</Text>
      </View>
      <TouchableOpacity style={styles.orderButton} activeOpacity={0.8}>
        <Text style={styles.orderText}>ORDER NOW</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (FAVORITES.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="heart-outline" size={80} color={colors.gray_300} />
        <Text style={styles.emptyTitle}>No favorites yet</Text>
        <Text style={styles.emptySubtitle}>Add items to your favorites</Text>
        <TouchableOpacity style={styles.browseButton} onPress={() => navigation.navigate('Home' as never)}>
          <Text style={styles.browseButtonText}>BROWSE MENU</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Favorites</Text>
        <Text style={styles.subtitle}>{FAVORITES.length} saved items</Text>
      </View>
      <FlatList
        data={FAVORITES}
        renderItem={renderFavorite}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
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
  row: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  rating: { fontSize: typography.sizes.small, color: colors.text_dark, marginLeft: 4 },
  price: { fontSize: typography.sizes.h4, fontWeight: typography.weights.bold, color: colors.primary, marginTop: spacing.sm },
  orderButton: { backgroundColor: colors.primary, marginHorizontal: spacing.md, marginBottom: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, alignItems: 'center' },
  orderText: { color: colors.white, fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  emptyTitle: { fontSize: typography.sizes.h3, fontWeight: typography.weights.bold, color: colors.text_dark, marginTop: spacing.lg },
  emptySubtitle: { fontSize: typography.sizes.body, color: colors.text_medium, marginTop: spacing.xs },
  browseButton: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.md, marginTop: spacing.lg },
  browseButtonText: { color: colors.white, fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
});
