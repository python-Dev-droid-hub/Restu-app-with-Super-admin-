import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  StatusBar,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { getCurrentLocation, getCityFromCoordinates, getSavedBranch, fetchBranches, saveSelectedBranch, findNearestBranch, Branch } from '../../services/locationService';
import api from '../../services/api';
import { getUnreadCount } from '../../services/notificationService';
import { useCart } from '../../context/CartContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

import HeroBanner from './components/HeroBanner';
import ProductCard from './components/ProductCard';
import BranchSelector from '../dashboards/components/BranchSelector';

const { width } = Dimensions.get('window');

// FORCE CACHE BUST - Version: 2025-03-06-001

interface Product {
  _id: string;
  id: string;
  name: string;
  price: number;
  effectivePrice?: number;
  hasSizes?: boolean;
  productSizes?: Array<{
    price?: number;
    isDefault?: boolean;
    size?: {
      _id?: string;
      id?: string;
      size_name?: string;
      name?: string;
    };
  }>;
  originalPrice?: number;
  imageUrl?: string;
  image?: unknown;
  images?: unknown;
  category?: { name: string } | string;
  rating?: number;
  reviews?: number;
  isAvailable?: boolean;
  orderCount?: number;
  isPopular?: boolean;
  branchId?: string;
}

interface Category {
  _id: string;
  id: string;
  name: string;
  imageUrl?: string;
  products?: Product[];
  items?: Product[]; // Backend may return 'items' instead of 'products'
}

interface DealItem {
  _id: string;
  title: string;
  description?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  imageUrl?: string;
  isActive?: boolean;
}

interface DealCampaign {
  _id: string;
  name: string;
  status: string;
  heroBanner?: {
    imageUrl?: string;
    title?: string;
    subtitle?: string;
    bgColor?: string;
  };
  deals: DealItem[];
}

export default function HomeScreen() {
  const navigation = useNavigation() as any;
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [locationLabel, setLocationLabel] = useState<string>('Fetching location...');
  const [categories, setCategories] = useState<Array<{ id: string; name: string; imageUrl?: string }>>([
    { id: 'all', name: 'All' },
  ]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dealCampaigns, setDealCampaigns] = useState<DealCampaign[]>([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showBranchSelector, setShowBranchSelector] = useState(true);
  const [branchSelectionRequired, setBranchSelectionRequired] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [previousBranchId, setPreviousBranchId] = useState<string | null>(null);

  const getFullImageUrl = useCallback((url?: string) => {
    if (!url) return '';
    const normalized = url.replace(/\\/g, '/');
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
    const baseUrlCandidate =
      typeof (api as any)?.getBaseURL === 'function'
        ? (api as any).getBaseURL()
        : (api as any)?.defaults?.baseURL;
    const base = String(baseUrlCandidate || '').replace(/\/?api\/?$/, '');
    if (normalized.startsWith('/')) return `${base}${normalized}`;
    if (base) return `${base}/${normalized}`;
    return normalized;
  }, []);

  const getImageCandidate = useCallback((value: unknown): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      const maybeUrl =
        (value as any).url ||
        (value as any).uri ||
        (value as any).path ||
        (value as any).imageUrl ||
        (value as any).src;
      if (typeof maybeUrl === 'string') return maybeUrl;
    }
    return '';
  }, []);

  const getFirstArrayItem = useCallback((value: unknown): unknown => {
    if (!Array.isArray(value)) return undefined;
    return value.length > 0 ? value[0] : undefined;
  }, []);

  const getDisplayPrice = useCallback((productItem: Product): number => {
    const toNumberOrNaN = (value: unknown): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') return parseFloat(value);
      return NaN;
    };

    const effective = toNumberOrNaN((productItem as any).effectivePrice);
    if (Number.isFinite(effective)) return effective;

    const sizes = productItem.productSizes;
    if (productItem.hasSizes && Array.isArray(sizes) && sizes.length > 0) {
      const defaultSize = sizes.find((s) => s?.isDefault) || sizes[0];
      const defaultPrice = toNumberOrNaN(defaultSize?.price);
      if (Number.isFinite(defaultPrice)) return defaultPrice;

      const numericPrices = sizes.map((s) => toNumberOrNaN(s?.price)).filter((p) => Number.isFinite(p)) as number[];
      if (numericPrices.length > 0) return Math.min(...numericPrices);
    }

    const base = toNumberOrNaN((productItem as any).price);
    return Number.isFinite(base) ? base : 0;
  }, []);

  const getDefaultSizeLabel = useCallback((productItem: Product): string | undefined => {
    const sizes = productItem.productSizes;
    if (!(productItem.hasSizes && Array.isArray(sizes) && sizes.length > 0)) return undefined;
    const defaultSize = sizes.find((s) => s?.isDefault) || sizes[0];
    const label =
      defaultSize?.size?.size_name ||
      defaultSize?.size?.name ||
      (defaultSize?.size as any)?.label;
    return typeof label === 'string' && label.trim() ? label : 'Size';
  }, []);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'All') return products;
    return products.filter((p) => {
      const catName = typeof p.category === 'string' ? p.category : p.category?.name;
      return catName === selectedCategory;
    });
  }, [products, selectedCategory]);

  const loadLocation = useCallback(async () => {
    try {
      const coords = await getCurrentLocation();
      if (!coords) {
        setLocationLabel('Location unavailable');
        return;
      }
      const city = await getCityFromCoordinates(coords.latitude, coords.longitude);
      setLocationLabel(city ? city : 'Current location');
    } catch {
      setLocationLabel('Location unavailable');
    }
  }, []);

  const loadMenu = useCallback(async (branchId?: string | null) => {
    const targetBranchId = branchId || selectedBranchId;
    
    // Pass branchId to API so backend can filter by activated products for this branch
    const menuUrl = targetBranchId ? `/menu?branchId=${targetBranchId}` : '/menu';
    const res = await api.get(menuUrl);
    const apiCategories: Category[] = res?.data?.data?.categories || res?.data?.categories || [];

    // Store branch_id for order validation
    if (targetBranchId) {
      await AsyncStorage.setItem('selectedBranchId', targetBranchId);
      setSelectedBranchId(targetBranchId);
    }

    const flatProducts: Product[] = [];
    apiCategories.forEach((c) => {
      const categoryProducts = c.products || c.items || [];
      categoryProducts.forEach((p) => {
        flatProducts.push(p);
      });
    });

    setProducts(flatProducts);

    const catList = apiCategories.map((c: any) => {
      const raw = c?.imageUrl || c?.image || c?.icon || c?.iconUrl || c?.thumbnail || c?.thumbnailUrl || c?.photo || c?.photoUrl;
      const candidate = getImageCandidate(raw);
      const imageUrl = getFullImageUrl(candidate);
      return {
        id: c._id || c.id,
        name: c.name,
        imageUrl: imageUrl || c.imageUrl,
      };
    });

    setCategories([{ id: 'all', name: 'All' }, ...catList]);
  }, [getFullImageUrl, getImageCandidate]);

  const loadDeals = useCallback(async (branchId?: string | null) => {
    try {
      setDealsLoading(true);
      const targetBranchId = branchId || selectedBranchId;
      const dealsUrl = targetBranchId ? `/deals/campaigns/active?branch=${targetBranchId}` : '/deals/campaigns/active';
      console.log('[HomeScreen] Loading deals from', dealsUrl);
      const res = await api.get(dealsUrl);
      console.log('[HomeScreen] Deals API response:', JSON.stringify(res?.data, null, 2));
      const campaigns: DealCampaign[] = res?.data?.data?.campaigns || res?.data?.campaigns || [];
      console.log('[HomeScreen] Parsed campaigns:', campaigns.length);
      const activeCampaigns = Array.isArray(campaigns)
        ? campaigns
            .filter((c) => c?.status === 'ACTIVE')
            .map((c) => {
              const filteredDeals = Array.isArray(c.deals) ? c.deals.filter((d) => d && d.isActive !== false) : [];
              console.log('[HomeScreen] Campaign:', c.name, 'deals:', filteredDeals.length);
              return {
                ...c,
                deals: filteredDeals,
              };
            })
        : [];
      console.log('[HomeScreen] Final active campaigns with deals:', activeCampaigns.length);
      setDealCampaigns(activeCampaigns);
    } catch (error) {
      console.error('[HomeScreen] Error loading deals:', error);
      setDealCampaigns([]);
    } finally {
      setDealsLoading(false);
    }
  }, [selectedBranchId]);

  const loadNotificationCount = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      setNotificationCount(count);
    } catch (error) {
      console.error('[HomeScreen] Error loading notification count:', error);
    }
  }, []);

  const [favorites, setFavorites] = useState<string[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const { addToCart, clearCart, validateCart } = useCart();

  const loadFavorites = useCallback(async () => {
    try {
      console.log('[HomeScreen] Loading favorites...');
      const response: any = await api.get('/customer/favorites');
      const items = response?.data?.favorites || [];
      const productIds = items.map((f: any) => String(f?.product?.id || f?.product?._id || '')).filter(Boolean);
      console.log('[HomeScreen] Loaded favorites productIds:', productIds);
      setFavorites(productIds);
    } catch (error) {
      console.error('[HomeScreen] Error loading favorites:', error);
    }
  }, []);

  useEffect(() => {
    const loadSelectedBranchId = async () => {
      try {
        const stored = await AsyncStorage.getItem('selectedBranchId');
        if (stored) setSelectedBranchId(stored);
      } catch {
        // ignore
      }
    };
    loadSelectedBranchId();
  }, []);

  // Check saved branch and show selector if needed
  const checkAndLoadBranch = useCallback(async () => {
    try {
      const savedBranchId = await getSavedBranch();
      let allBranches: Branch[] = [];
      try {
        allBranches = await fetchBranches();
      } catch (e) {
        allBranches = [];
      }

      console.log('[HomeScreen] savedBranchId:', savedBranchId);
      console.log('[HomeScreen] branches loaded:', allBranches.length);

      if (savedBranchId && allBranches.length > 0) {
        const branch = allBranches.find((b) => b._id === savedBranchId);
        if (branch) {
          setSelectedBranch(branch);
          setSelectedBranchId(savedBranchId);
          setPreviousBranchId(savedBranchId);
          setBranchSelectionRequired(false);
          setShowBranchSelector(false);
          // Menu will load via useEffect when selectedBranchId changes
          return;
        }
      }

      // No saved branch OR saved branch not found
      // Show branch selector for manual selection (don't auto-select)
      console.log('[HomeScreen] No saved branch - showing selector for manual selection');
      setSelectedBranch(null);
      setBranchSelectionRequired(true);
      setShowBranchSelector(true);
    } catch (error) {
      setSelectedBranch(null);
      setBranchSelectionRequired(true);
      setShowBranchSelector(true);
    }
  }, []);

  useEffect(() => {
    checkAndLoadBranch();
  }, [checkAndLoadBranch]);

  useFocusEffect(
    useCallback(() => {
      checkAndLoadBranch();
      loadFavorites();
    }, [checkAndLoadBranch, loadFavorites])
  );

  const handleBranchSelected = useCallback(async (branch: Branch) => {
    const branchChanged = previousBranchId && previousBranchId !== branch._id;
    
    if (branchChanged) {
      console.log('[HomeScreen] Branch changed from', previousBranchId, 'to', branch._id, '- clearing cart');
      clearCart?.();
    }
    
    await saveSelectedBranch(branch._id);
    setSelectedBranch(branch);
    setSelectedBranchId(branch._id);
    setPreviousBranchId(branch._id);
    setBranchSelectionRequired(false);
    setShowBranchSelector(false);
    
    // Reload menu for the new branch
    await loadMenu(branch._id);
  }, [previousBranchId, clearCart, loadMenu]);

  const handleToggleFavorite = useCallback(async (productId: string) => {
    const targetId = String(productId || '').trim();
    console.log('[HomeScreen] handleToggleFavorite called');
    console.log('[HomeScreen] Raw productId:', productId);
    console.log('[HomeScreen] typeof productId:', typeof productId);
    console.log('[HomeScreen] targetId after trim:', targetId);
    console.log('[HomeScreen] targetId length:', targetId.length);
    
    if (!targetId) {
      console.log('[HomeScreen] Empty targetId, skipping');
      return;
    }
    
    // Validate ObjectId format (24 hex characters)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(targetId);
    console.log('[HomeScreen] isValidObjectId:', isValidObjectId);
    
    const isCurrentlyFavorite = favorites.includes(targetId);
    console.log('[HomeScreen] isCurrentlyFavorite:', isCurrentlyFavorite, 'favorites:', favorites);
    
    try {
      const extractServerFavorites = (resp: any): any[] => {
        // services/api returns AxiosResponse
        const data = resp?.data;
        // API may return { success, data: { favorites } } OR { data: { favorites } } etc
        const favoritesList = data?.data?.favorites || data?.favorites || data?.data || [];
        return Array.isArray(favoritesList) ? favoritesList : [];
      };

      if (isCurrentlyFavorite) {
        // Remove from favorites (need favorite record id; refetch is simplest)
        const existing: any = await api.get('/customer/favorites');
        const serverFavorites = extractServerFavorites(existing);
        const fav = serverFavorites.find(
          (f: any) => String(f?.product?.id || f?.product?._id || f?.productId || '') === targetId
        );
        console.log('[HomeScreen] Found favorite to remove:', fav);
        if (fav?.id) {
          await api.delete(`/customer/favorites/${fav.id}`);
          console.log('[HomeScreen] Successfully removed favorite');
        }
        setFavorites((prev) => prev.filter((id) => id !== targetId));
      } else {
        // Add to favorites
        // IMPORTANT: Backend may return 400 "Product already in favorites".
        // To prevent that error, verify against server list before POST.
        const existing: any = await api.get('/customer/favorites');
        const serverFavorites = extractServerFavorites(existing);
        const alreadyOnServer = serverFavorites.some(
          (f: any) => String(f?.product?.id || f?.product?._id || f?.productId || '') === targetId
        );
        if (alreadyOnServer) {
          console.log('[HomeScreen] Product already in favorites on server - syncing local state');
          setFavorites((prev) => (prev.includes(targetId) ? prev : [...prev, targetId]));
          return;
        }

        console.log('[HomeScreen] Adding to favorites, productId:', targetId);
        const response: any = await api.post('/customer/favorites', { productId: targetId });
        console.log('[HomeScreen] Add favorite response status:', response?.status);
        console.log('[HomeScreen] Add favorite response data:', response?.data);
        if (response?.data?.success || response?.status === 201) {
          setFavorites((prev) => (prev.includes(targetId) ? prev : [...prev, targetId]));
          console.log('[HomeScreen] Successfully added to local favorites state');
        } else {
          console.error('[HomeScreen] Failed to add favorite:', response?.data?.message || 'Unknown error');
        }
      }
    } catch (error: any) {
      // Handle "Product already in favorites" as success
      if (error?.response?.data?.message === 'Product already in favorites') {
        console.log('[HomeScreen] Product already in favorites - adding to local state');
        setFavorites((prev) => (prev.includes(targetId) ? prev : [...prev, targetId]));
        return;
      }
      console.error('[HomeScreen] Error toggling favorite:', error?.message || error);
      console.error('[HomeScreen] Error response:', error?.response?.data);
    }
  }, [favorites]);

  const handleAddToCart = useCallback((productItem: Product) => {
    const rawImage =
      getImageCandidate(productItem.imageUrl) ||
      getImageCandidate(productItem.image) ||
      getImageCandidate(getFirstArrayItem(productItem.images));
    const imageUrl = getFullImageUrl(rawImage);
    const price = getDisplayPrice(productItem);
    const sizeLabel = getDefaultSizeLabel(productItem);
    
    addToCart({
      _id: productItem._id || productItem.id,
      name: productItem.name,
      price,
      originalPrice: productItem.originalPrice,
      image: imageUrl,
      size: sizeLabel,
    });
  }, [addToCart, getDefaultSizeLabel, getDisplayPrice, getFirstArrayItem, getFullImageUrl, getImageCandidate]);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([loadLocation(), loadMenu(), loadDeals(), loadNotificationCount(), loadFavorites()]);
    } finally {
      setLoading(false);
    }
  }, [loadLocation, loadMenu, loadDeals, loadNotificationCount, loadFavorites]);

  // Validate cart separately on mount only
  useEffect(() => {
    if (!loading && validateCart) {
      validateCart();
    }
  }, [loading]); // Only run once after initial load

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAll();
    } finally {
      setRefreshing(false);
    }
  }, [loadAll]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const renderCategory = ({ item }: { item: { id: string; name: string; imageUrl?: string } }) => {
    const isSelected = selectedCategory === item.name;
    const imageUri = getFullImageUrl(item.imageUrl);
    return (
      <TouchableOpacity
        style={[styles.categoryButton, isSelected && styles.categoryButtonActive]}
        onPress={() => setSelectedCategory(isSelected ? 'All' : item.name)}
      >
        {item.id === 'all' ? (
          <Text style={styles.categoryIcon}>🍽️</Text>
        ) : !!imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.categoryImage} />
        ) : (
          <Text style={styles.categoryIcon}>🍽️</Text>
        )}
        <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderProduct = useCallback(
    ({ item }: { item: Product }) => (
      <View style={{ flex: 1, margin: spacing.xs, maxWidth: (width - 48) / 2 }}>
        <ProductCard
          product={item}
          onPress={() => navigation.navigate('ProductDetail', { product: item })}
          onAddToCart={() => handleAddToCart(item)}
          onToggleFavorite={() => handleToggleFavorite(item._id || item.id)}
          isFavorite={favorites.includes(String(item._id || item.id))}
        />
      </View>
    ),
    [favorites, handleAddToCart, handleToggleFavorite, navigation, selectedBranchId]
  );

  const renderDealCard = (deal: DealItem) => {
    const discountPercent = deal.discount || (deal.originalPrice && deal.originalPrice > deal.price
      ? Math.round(((deal.originalPrice - deal.price) / deal.originalPrice) * 100)
      : 0);
    const imageUri = getFullImageUrl(deal.imageUrl);
    const isFavorite = favorites.includes(String(deal._id || ''));
    return (
      <TouchableOpacity key={deal._id} activeOpacity={0.9} style={styles.dealCard}>
        <View style={styles.dealImageContainer}>
          {!!imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.dealImage} />
          ) : (
            <View style={styles.dealImagePlaceholder}>
              <Ionicons name="pricetag" size={28} color={colors.primary} />
            </View>
          )}
          <View style={styles.dealFavoriteButton}>
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={18}
              color={isFavorite ? colors.danger : colors.gray_500}
            />
          </View>
          {discountPercent > 0 && (
            <View style={styles.dealDiscountBadge}>
              <Text style={styles.dealDiscountText}>{discountPercent}% OFF</Text>
            </View>
          )}
        </View>
        <View style={styles.dealInfo}>
          <Text style={styles.dealTitle} numberOfLines={2}>{deal.title}</Text>
          {!!deal.description && (
            <Text style={styles.dealDescription} numberOfLines={2}>{deal.description}</Text>
          )}
          <View style={styles.dealPriceRow}>
            <Text style={styles.dealPrice}>${Number(deal.price || 0).toFixed(0)}</Text>
            {!!deal.originalPrice && deal.originalPrice > deal.price && (
              <Text style={styles.dealOriginalPrice}>${Number(deal.originalPrice || 0).toFixed(0)}</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.dealAddToCartButton}
            onPress={() =>
              addToCart({
                _id: deal._id,
                name: deal.title,
                price: typeof deal.price === 'number' ? deal.price : 0,
                originalPrice: deal.originalPrice,
                image: imageUri || '',
              })
            }
          >
            <Text style={styles.dealAddToCartText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          paddingTop:
            Platform.OS === 'android'
              ? Math.max(insets.top || 0, StatusBar.currentHeight || 0)
              : insets.top || 0,
        },
      ]}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={styles.locationHeader}>
        <View>
          <Text style={styles.deliveringTo}>Order Now</Text>
          <TouchableOpacity 
            style={styles.locationRow}
            onPress={() => setShowBranchSelector(true)}
          >
            <Text style={styles.locationText}>{selectedBranch?.branchName || selectedBranch?.branchName || 'Select Branch'}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          style={styles.notificationButton}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.text_dark} />
          {notificationCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Banner */}
        <HeroBanner navigation={navigation} />

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
          data={categories}
          renderItem={renderCategory}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />

        {/* Products Grid */}
        <Text style={styles.sectionTitle}>Popular Items</Text>
        {loading ? (
          <View style={{ paddingVertical: spacing.xl }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            renderItem={renderProduct}
            keyExtractor={(item) => item._id || item.id}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={styles.productsGrid}
          />
        )}

        {/* Deals Section */}
        <View style={styles.dealsSection}>
          <View style={styles.dealsHeader}>
            <Ionicons name="pricetag" size={20} color={colors.primary} />
            <Text style={styles.dealsHeaderTitle}>Special Deals</Text>
          </View>
          {dealsLoading ? (
            <View style={{ paddingVertical: spacing.md }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : dealCampaigns.length > 0 ? (
            <View>
              {dealCampaigns.map((campaign) => {
                const heroImage = getFullImageUrl(campaign?.heroBanner?.imageUrl);
                return (
                  <View key={campaign._id} style={styles.campaignBlock}>
                    {!!heroImage && (
                      <Image source={{ uri: heroImage }} style={styles.campaignHeroImage} />
                    )}
                    <View style={styles.campaignTitleRow}>
                      <Text style={styles.campaignTitleText} numberOfLines={1}>
                        {campaign?.heroBanner?.title || campaign.name}
                      </Text>
                      {!!campaign?.heroBanner?.subtitle && (
                        <Text style={styles.campaignSubtitleText} numberOfLines={1}>
                          {campaign.heroBanner.subtitle}
                        </Text>
                      )}
                    </View>
                    {campaign.deals?.length ? (
                      <FlatList
                        data={campaign.deals}
                        keyExtractor={(d) => d._id}
                        renderItem={({ item }) => (
                          <View style={styles.dealGridItem}>{renderDealCard(item)}</View>
                        )}
                        numColumns={2}
                        scrollEnabled={false}
                        contentContainerStyle={styles.dealGrid}
                      />
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Branch Selector Modal */}
      <BranchSelector
        visible={showBranchSelector}
        onClose={() => setShowBranchSelector(false)}
        onBranchSelected={handleBranchSelected}
        requireSelection={branchSelectionRequired}
      />
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
  notificationBadge: { 
    position: 'absolute', 
    top: 4, 
    right: 4, 
    minWidth: 18, 
    height: 18, 
    borderRadius: 9, 
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  bannerContainer: { marginVertical: spacing.md },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, marginHorizontal: spacing.horizontal, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, marginBottom: spacing.md, ...shadows.light },
  searchPlaceholder: { marginLeft: spacing.sm, color: colors.gray_500, fontSize: typography.sizes.body },
  sectionTitle: { fontSize: typography.sizes.h4, fontWeight: typography.weights.bold, color: colors.text_dark, marginHorizontal: spacing.horizontal, marginBottom: spacing.sm, marginTop: spacing.md },
  categoriesList: { paddingHorizontal: spacing.horizontal, gap: spacing.sm },
  categoryButton: { alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.white, borderRadius: borderRadius.xxl, marginRight: spacing.sm, minWidth: 80 },
  categoryButtonActive: { backgroundColor: colors.primary },
  categoryIcon: { fontSize: 24, marginBottom: 4 },
  categoryImage: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginBottom: 4,
  },
  categoryText: { fontSize: typography.sizes.small, color: colors.text_dark, fontWeight: typography.weights.medium },
  categoryTextActive: { color: colors.white },
  productsGrid: { paddingHorizontal: spacing.horizontal, gap: spacing.card },
  productCard: { flex: 1, backgroundColor: colors.white, borderRadius: borderRadius.md, margin: spacing.xs, ...shadows.medium, maxWidth: (width - 48) / 2 },

  dealsSection: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.horizontal,
    paddingBottom: spacing.xl,
  },
  campaignBlock: {
    marginBottom: 14,
  },
  campaignHeroImage: {
    width: '100%',
    height: 120,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray_100,
  },
  campaignTitleRow: {
    marginBottom: 6,
  },
  campaignTitleText: {
    fontSize: typography.sizes.h4,
    fontWeight: typography.weights.bold,
    color: colors.text_dark,
  },
  campaignSubtitleText: {
    fontSize: typography.sizes.small,
    color: colors.text_medium,
  },
  dealsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.sm,
  },
  dealsHeaderTitle: {
    fontSize: typography.sizes.h4,
    fontWeight: typography.weights.bold,
    color: colors.text_dark,
  },
  dealCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.light,
  },
  dealImageContainer: {
    width: '100%',
    height: 110,
    backgroundColor: colors.gray_100,
    position: 'relative',
  },
  dealImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  dealImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dealDiscountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dealDiscountText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  dealFavoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.light,
  },
  dealInfo: {
    padding: 12,
  },
  dealTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text_dark,
    marginBottom: 4,
  },
  dealDescription: {
    fontSize: 11,
    color: colors.text_medium,
    marginBottom: 8,
  },
  dealPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dealPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  dealOriginalPrice: {
    fontSize: 11,
    color: colors.gray_500,
    textDecorationLine: 'line-through',
  },
  dealAddToCartButton: {
    marginTop: 10,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  dealAddToCartText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
  dealGrid: {
    paddingHorizontal: 2,
  },
  dealGridItem: {
    flex: 1,
    marginHorizontal: 6,
    marginBottom: 12,
    maxWidth: (width - (spacing.horizontal * 2) - 12) / 2,
  },
});
