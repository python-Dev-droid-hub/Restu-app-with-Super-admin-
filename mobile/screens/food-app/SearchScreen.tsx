import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { formatPrice, formatDiscount } from '../../utils/formatHelpers';

const FILTERS = [
  { id: '1', name: 'Veg', icon: '🥬' },
  { id: '2', name: 'Non-Veg', icon: '🍗' },
  { id: '3', name: 'Spicy', icon: '🌶️' },
  { id: '4', name: 'Bestseller', icon: '⭐' },
  { id: '5', name: 'Under ₹200', icon: '💰' },
];

const SORT_OPTIONS = ['Recommended', 'Newest', 'Price: Low to High', 'Price: High to Low', 'Rating'];

const PRODUCTS = [
  { id: '1', name: 'Chicken Biryani', rating: 4.8, reviews: 245, price: 250, originalPrice: 350, image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=300&h=200&fit=crop' },
  { id: '2', name: 'Chicken Tandoori', rating: 4.5, reviews: 189, price: 180, originalPrice: 250, image: 'https://images.unsplash.com/photo-1601058268499-e526861c0f8f?w=300&h=200&fit=crop' },
  { id: '3', name: 'Zinger Burger', rating: 4.6, reviews: 320, price: 150, originalPrice: 180, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=200&fit=crop' },
];

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('Recommended');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const filteredProducts = useMemo(() => {
    let results = PRODUCTS;
    
    // Filter by search query
    if (searchQuery.trim()) {
      results = results.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply active filters
    if (activeFilters.includes('5')) { // Under ₹200
      results = results.filter(p => p.price < 200);
    }
    
    // Sort
    switch (sortBy) {
      case 'Price: Low to High':
        results = [...results].sort((a, b) => a.price - b.price);
        break;
      case 'Price: High to Low':
        results = [...results].sort((a, b) => b.price - a.price);
        break;
      case 'Rating':
        results = [...results].sort((a, b) => b.rating - a.rating);
        break;
      case 'Newest':
        results = [...results].reverse();
        break;
    }
    
    return results;
  }, [searchQuery, activeFilters, sortBy]);

  const toggleFilter = (filterId: string) => {
    setActiveFilters(prev => 
      prev.includes(filterId) 
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    );
  };

  const renderProduct = ({ item }: { item: typeof PRODUCTS[0] }) => (
    <TouchableOpacity style={styles.productCard}>
      <View style={styles.productImageContainer}>
        <Image source={{ uri: item.image }} style={styles.productImage} />
        {item.originalPrice > item.price && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{formatDiscount(item.originalPrice, item.price)}</Text>
          </View>
        )}
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={12} color={colors.warning} />
          <Text style={styles.ratingText}>{item.rating} ({item.reviews})</Text>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.currentPrice}>₹{item.price}</Text>
          {item.originalPrice && (
            <Text style={styles.originalPrice}>₹{item.originalPrice}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.gray_500} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search items, restaurants..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.gray_500} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersList}
        renderItem={({ item }) => {
          const isActive = activeFilters.includes(item.id);
          return (
            <TouchableOpacity
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => toggleFilter(item.id)}
            >
              <Text style={{ fontSize: 14, marginRight: 4 }}>{item.icon}</Text>
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Sort Dropdown */}
      <TouchableOpacity 
        style={styles.sortButton}
        onPress={() => setShowSortDropdown(!showSortDropdown)}
      >
        <Text style={styles.sortText}>Sort: {sortBy}</Text>
        <Ionicons name={showSortDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={colors.text_dark} />
      </TouchableOpacity>

      {showSortDropdown && (
        <View style={styles.sortDropdown}>
          {SORT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option}
              style={styles.sortOption}
              onPress={() => { setSortBy(option); setShowSortDropdown(false); }}
            >
              <Text style={[styles.sortOptionText, sortBy === option && styles.sortOptionActive]}>
                {sortBy === option ? '✓ ' : ''}{option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Results */}
      <Text style={styles.resultsText}>Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}</Text>
      
      {filteredProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={{ fontSize: 48 }}>🔍</Text>
          <Text style={styles.emptyTitle}>No items found</Text>
          <Text style={styles.emptySubtitle}>Try different filters or search terms</Text>
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={() => { setSearchQuery(''); setActiveFilters([]); }}
          >
            <Text style={styles.clearButtonText}>CLEAR FILTERS</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.productsGrid}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.horizontal, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, ...shadows.light },
  searchInput: { flex: 1, marginLeft: spacing.sm, fontSize: typography.sizes.body, color: colors.text_dark },
  filtersList: { paddingHorizontal: spacing.horizontal, gap: spacing.sm, marginBottom: spacing.sm },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: colors.white, borderRadius: borderRadius.round, borderWidth: 1, borderColor: colors.gray_300, marginRight: spacing.xs },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: typography.sizes.small, color: colors.text_dark },
  filterTextActive: { color: colors.white, fontWeight: typography.weights.medium },
  sortButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: spacing.horizontal, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.gray_200 },
  sortText: { fontSize: typography.sizes.body, color: colors.text_dark, fontWeight: typography.weights.medium },
  sortDropdown: { backgroundColor: colors.white, marginHorizontal: spacing.horizontal, borderRadius: borderRadius.md, ...shadows.medium, marginTop: spacing.xs },
  sortOption: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  sortOptionText: { fontSize: typography.sizes.body, color: colors.text_dark },
  sortOptionActive: { color: colors.primary, fontWeight: typography.weights.bold },
  resultsText: { fontSize: typography.sizes.small, color: colors.text_medium, marginHorizontal: spacing.horizontal, marginVertical: spacing.sm },
  productsGrid: { paddingHorizontal: spacing.horizontal, gap: spacing.card },
  productCard: { flex: 1, backgroundColor: colors.white, borderRadius: borderRadius.md, margin: spacing.xs, ...shadows.medium, maxWidth: '47%' },
  productImageContainer: { width: '100%', height: 100, borderTopLeftRadius: borderRadius.md, borderTopRightRadius: borderRadius.md, overflow: 'hidden', position: 'relative' },
  productImage: { width: '100%', height: 100, resizeMode: 'cover' },
  discountBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: colors.danger, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  discountText: { fontSize: 10, color: colors.white, fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text_dark, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: colors.text_medium, marginTop: 8, textAlign: 'center' },
  clearButton: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 6 },
  clearButtonText: { color: colors.white, fontSize: 12, fontWeight: 'bold' },
  productInfo: { padding: spacing.sm },
  productName: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text_dark },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: spacing.xs },
  ratingText: { fontSize: typography.sizes.xs, color: colors.text_medium },
  priceContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  currentPrice: { fontSize: typography.sizes.h4, fontWeight: typography.weights.bold, color: colors.primary },
  originalPrice: { fontSize: typography.sizes.small, color: colors.gray_400, textDecorationLine: 'line-through' },
});
