import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  FlatList,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { formatPrice, formatDiscount } from '../../utils/formatHelpers';

const { width } = Dimensions.get('window');

// Mock data
const BANNERS = [
  { id: '1', title: 'RAMADAN SPECIALS', subtitle: '50% OFF', image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=300&fit=crop', color: colors.primary },
  { id: '2', title: 'WINGS NIGHT', subtitle: '20% OFF', image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400&h=300&fit=crop', color: '#8B4513' },
  { id: '3', title: 'MIDNIGHT SWEET', subtitle: 'BUY 1 GET 1', image: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&h=300&fit=crop', color: '#7B5CB8' },
];

const CATEGORIES = [
  { id: '1', name: 'Biryani', icon: '🍲' },
  { id: '2', name: 'Tandoori', icon: '🔥' },
  { id: '3', name: 'Wings', icon: '🍗' },
  { id: '4', name: 'Curry', icon: '🍛' },
  { id: '5', name: 'Rolls', icon: '🥙' },
  { id: '6', name: 'Breads', icon: '🍞' },
  { id: '7', name: 'Drinks', icon: '🥤' },
  { id: '8', name: 'Desserts', icon: '🍰' },
];

const PRODUCTS = [
  { id: '1', name: 'Chicken Biryani', rating: 4.8, reviews: 245, price: 250, originalPrice: 350, image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=300&h=200&fit=crop', category: 'Biryani' },
  { id: '2', name: 'Chicken Tandoori', rating: 4.5, reviews: 189, price: 180, originalPrice: 250, image: 'https://images.unsplash.com/photo-1601058268499-e526861c0f8f?w=300&h=200&fit=crop', category: 'Tandoori' },
  { id: '3', name: 'Zinger Burger', rating: 4.6, reviews: 320, price: 150, originalPrice: 180, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=200&fit=crop', category: 'Wings' },
  { id: '4', name: 'Butter Chicken', rating: 4.7, reviews: 156, price: 280, originalPrice: 340, image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=300&h=200&fit=crop', category: 'Curry' },
  { id: '5', name: 'Chicken Roll', rating: 4.4, reviews: 98, price: 120, originalPrice: 150, image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=300&h=200&fit=crop', category: 'Rolls' },
  { id: '6', name: 'Garlic Naan', rating: 4.3, reviews: 234, price: 40, originalPrice: 50, image: 'https://images.unsplash.com/photo-1601058268499-e526861c0f8f?w=300&h=200&fit=crop', category: 'Breads' },
];

// Separate ProductCard component to fix hook issues
const ProductCard = ({ item, onPress }: { item: typeof PRODUCTS[0]; onPress: () => void }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <TouchableOpacity style={styles.productCard} onPress={onPress}>
      <View style={styles.productImageContainer}>
        {!imageLoaded && !imageError && (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={32} color={colors.gray_400} />
          </View>
        )}
        <Image 
          source={{ uri: item.image }} 
          style={styles.productImage}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
        {item.originalPrice > item.price && (
          <View style={styles.discountBadgeContainer}>
            <Text style={styles.discountBadgeText}>
              {formatDiscount(item.originalPrice, item.price)}
            </Text>
          </View>
        )}
      </View>
      <TouchableOpacity style={styles.heartButton}>
        <Ionicons name="heart-outline" size={20} color={colors.gray_500} />
      </TouchableOpacity>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
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
        <TouchableOpacity style={styles.addToCartButton}>
          <Text style={styles.addToCartText}>ADD TO CART</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default function HomeScreen() {
  const navigation = useNavigation();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [currentBanner, setCurrentBanner] = useState(0);
  const bannerScrollRef = useRef<ScrollView>(null);

  const filteredProducts = selectedCategory === 'All' 
    ? PRODUCTS 
    : PRODUCTS.filter(p => p.category === selectedCategory);

  const handleBannerScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(contentOffsetX / width);
    setCurrentBanner(currentIndex);
  };

  const scrollToBanner = (index: number) => {
    setCurrentBanner(index);
    bannerScrollRef.current?.scrollTo({ x: index * width, animated: true });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (currentBanner + 1) % BANNERS.length;
      scrollToBanner(nextIndex);
    }, 5000);
    return () => clearInterval(interval);
  }, [currentBanner]);

  const renderBanner = () => (
    <View style={styles.bannerContainer}>
      <ScrollView
        ref={bannerScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleBannerScroll}
        scrollEventThrottle={16}
      >
        {BANNERS.map((banner) => (
          <TouchableOpacity 
            key={banner.id} 
            style={[styles.banner, { backgroundColor: banner.color }]}
            onPress={() => navigation.navigate('Search' as never)}
            activeOpacity={0.9}
          >
            <Image source={{ uri: banner.image }} style={styles.bannerImage} />
            <View style={styles.bannerOverlay}>
              <Text style={styles.bannerTitle}>{banner.title}</Text>
              <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
              <TouchableOpacity 
                style={styles.orderNowButton}
                onPress={() => navigation.navigate('Search' as never)}
              >
                <Text style={styles.orderNowText}>ORDER NOW</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.bannerDots}>
        {BANNERS.map((_, index) => (
          <TouchableOpacity 
            key={index} 
            onPress={() => scrollToBanner(index)}
            style={[
              styles.dot, 
              index === currentBanner && styles.activeDot
            ]} 
          />
        ))}
      </View>
    </View>
  );

  const renderCategory = ({ item }: { item: typeof CATEGORIES[0] }) => {
    const isSelected = selectedCategory === item.name;
    return (
      <TouchableOpacity
        style={[styles.categoryButton, isSelected && styles.categoryButtonActive]}
        onPress={() => setSelectedCategory(isSelected ? 'All' : item.name)}
      >
        <Text style={styles.categoryIcon}>{item.icon}</Text>
        <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderProduct = useCallback(({ item }: { item: typeof PRODUCTS[0] }) => (
    <ProductCard 
      item={item} 
      onPress={() => navigation.navigate('ProductDetail' as never, { product: item })} 
    />
  ), [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={styles.locationHeader}>
        <View>
          <Text style={styles.deliveringTo}>Order Now</Text>
          <TouchableOpacity style={styles.locationRow}>
            <Text style={styles.locationText}>Karachi - North Nazimabad</Text>
            <Ionicons name="chevron-down" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color={colors.text_dark} />
          <View style={styles.notificationBadge} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Banner */}
        {renderBanner()}

        {/* Search Bar */}
        <TouchableOpacity 
          style={styles.searchBar}
          onPress={() => navigation.navigate('Search')}
        >
          <Ionicons name="search" size={20} color={colors.gray_500} />
          <Text style={styles.searchPlaceholder}>Search items...</Text>
        </TouchableOpacity>

        {/* Categories */}
        <Text style={styles.sectionTitle}>Categories</Text>
        <FlatList
          data={CATEGORIES}
          renderItem={renderCategory}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />

        {/* Products Grid */}
        <Text style={styles.sectionTitle}>Popular Items</Text>
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          numColumns={2}
          scrollEnabled={false}
          contentContainerStyle={styles.productsGrid}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background,
  },
  locationHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  deliveringTo: { fontSize: typography.sizes.h2, fontWeight: typography.weights.bold, color: colors.text_dark },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.tiny, gap: 4 },
  locationText: { fontSize: typography.sizes.small, color: colors.text_medium },
  notificationButton: { padding: spacing.sm },
  notificationBadge: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },
  bannerContainer: { marginVertical: spacing.md },
  banner: { width: width - 32, height: 200, marginHorizontal: spacing.horizontal, borderRadius: borderRadius.lg, overflow: 'hidden' },
  bannerImage: { width: '100%', height: '100%', opacity: 0.8 },
  bannerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: spacing.lg, justifyContent: 'center' },
  bannerTitle: { fontSize: typography.sizes.h1, fontWeight: typography.weights.bold, color: colors.white },
  bannerSubtitle: { fontSize: typography.sizes.h3, fontWeight: typography.weights.bold, color: colors.white, marginTop: spacing.xs },
  orderNowButton: { backgroundColor: colors.white, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.sm, alignSelf: 'flex-start', marginTop: spacing.md },
  orderNowText: { color: colors.primary, fontWeight: typography.weights.bold, fontSize: typography.sizes.body },
  bannerDots: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.sm, gap: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gray_300 },
  activeDot: { backgroundColor: colors.primary, width: 20 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, marginHorizontal: spacing.horizontal, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, marginBottom: spacing.md, ...shadows.light },
  searchPlaceholder: { marginLeft: spacing.sm, color: colors.gray_500, fontSize: typography.sizes.body },
  sectionTitle: { fontSize: typography.sizes.h4, fontWeight: typography.weights.bold, color: colors.text_dark, marginHorizontal: spacing.horizontal, marginBottom: spacing.sm, marginTop: spacing.md },
  categoriesList: { paddingHorizontal: spacing.horizontal, gap: spacing.sm },
  categoryButton: { alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.white, borderRadius: borderRadius.xxl, marginRight: spacing.sm, minWidth: 80 },
  categoryButtonActive: { backgroundColor: colors.primary },
  categoryIcon: { fontSize: 24, marginBottom: 4 },
  categoryText: { fontSize: typography.sizes.small, color: colors.text_dark, fontWeight: typography.weights.medium },
  categoryTextActive: { color: colors.white },
  productsGrid: { paddingHorizontal: spacing.horizontal, gap: spacing.card },
  productCard: { flex: 1, backgroundColor: colors.white, borderRadius: borderRadius.md, margin: spacing.xs, ...shadows.medium, maxWidth: (width - 48) / 2 },
  productImageContainer: { width: '100%', height: 120, backgroundColor: colors.gray_100, borderTopLeftRadius: borderRadius.md, borderTopRightRadius: borderRadius.md, overflow: 'hidden', position: 'relative' },
  imagePlaceholder: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.gray_100 },
  productImage: { width: '100%', height: 120, resizeMode: 'cover' },
  discountBadgeContainer: { position: 'absolute', top: spacing.xs, right: spacing.xs, backgroundColor: colors.danger, paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: borderRadius.xs },
  discountBadgeText: { fontSize: typography.sizes.xs, color: colors.white, fontWeight: typography.weights.bold },
  heartButton: { position: 'absolute', top: spacing.xs + 26, right: spacing.xs, backgroundColor: colors.white, borderRadius: borderRadius.round, padding: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  productInfo: { padding: spacing.sm },
  productName: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text_dark, marginBottom: 2 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: spacing.xs },
  ratingText: { fontSize: typography.sizes.xs, color: colors.text_medium },
  priceContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  currentPrice: { fontSize: typography.sizes.h4, fontWeight: typography.weights.bold, color: colors.primary },
  originalPrice: { fontSize: typography.sizes.small, color: colors.gray_400, textDecorationLine: 'line-through' },
  discountBadge: { fontSize: typography.sizes.xs, color: colors.danger, fontWeight: typography.weights.bold },
  addToCartButton: { backgroundColor: colors.primary, paddingVertical: spacing.sm, borderRadius: borderRadius.sm, alignItems: 'center', marginTop: spacing.sm },
  addToCartText: { color: colors.white, fontSize: typography.sizes.small, fontWeight: typography.weights.bold },
});
