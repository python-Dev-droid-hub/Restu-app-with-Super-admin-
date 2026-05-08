import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { api } from '../components/api/client';

const getFullImageUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = api.getBaseURL().replace(/\/?api\/?$/, '');
  if (url.startsWith('/')) return `${base}${url}`;
  return url;
};

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  effectivePrice?: number;
  hasSizes?: boolean;
  productSizes?: Array<{
    price: number;
    isDefault?: boolean;
    size?: {
      _id?: string;
      id?: string;
      size_name?: string;
      name?: string;
    };
  }>;
  imageUrl?: string;
  isAvailable: boolean;
  category: {
    _id: string;
    name: string;
  };
}

const getDisplayPrice = (product: Product): number => {
  if (typeof product.effectivePrice === 'number' && !Number.isNaN(product.effectivePrice)) {
    return product.effectivePrice;
  }

  const sizes = product.productSizes;
  if (product.hasSizes && Array.isArray(sizes) && sizes.length > 0) {
    const defaultSize = sizes.find((s) => s?.isDefault);
    const candidate = defaultSize?.price ?? Math.min(...sizes.map((s) => s?.price ?? Number.POSITIVE_INFINITY));
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
  }

  return typeof product.price === 'number' && !Number.isNaN(product.price) ? product.price : 0;
};

interface Category {
  _id: string;
  name: string;
  products: Product[];
}

interface DealItem {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  categories?: string[];
  isActive?: boolean;
}

interface DealCampaign {
  _id: string;
  name: string;
  heroBanner?: {
    imageUrl?: string;
    title?: string;
    subtitle?: string;
  };
  deals: DealItem[];
  status: string;
}

export default function CustomerMenuScreen() {
  console.log('🚀 CUSTOMER MENU SCREEN LOADED');
  const { width } = useWindowDimensions();
  const isWebMobile = Platform.OS === 'web' && width <= 768;
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [dealCampaigns, setDealCampaigns] = useState<DealCampaign[]>([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  // undefined = not yet checked, null = checked but no branch, string = branch selected
  const [selectedBranchId, setSelectedBranchId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    loadSelectedBranchId();
  }, []);

  const loadSelectedBranchId = async () => {
    try {
      const stored = await AsyncStorage.getItem('selectedBranchId');
      // Always update state after checking — null means "no branch, show all products"
      setSelectedBranchId(stored ?? null);
    } catch {
      setSelectedBranchId(null);
    }
  };

  useEffect(() => {
    // undefined = AsyncStorage not yet checked, skip
    // null or string = checked, load menu (null shows all products, string filters by branch)
    if (selectedBranchId !== undefined) {
      loadMenuData();
      loadDeals();
    }
  }, [selectedBranchId]);

  const loadMenuData = async () => {
    try {
      setLoading(true);
      console.log('🔍 [MENU DEBUG] Loading menu data...');

      // Pass branchId to API so backend can filter by activated products for this branch
      const menuUrl = selectedBranchId ? `/menu?branchId=${selectedBranchId}` : '/menu';
      const response = await api.get(menuUrl);
      console.log('🔍 [MENU DEBUG] API Response:', response);
      console.log('🔍 [MENU DEBUG] Response success:', response.success);
      console.log('🔍 [MENU DEBUG] Response data:', JSON.stringify(response.data, null, 2));

      if (response.success && response.data) {
        const categoriesData = response.data.categories || response.data || [];
        console.log('🔍 [MENU DEBUG] Raw categories data:', JSON.stringify(categoriesData, null, 2));
        console.log('🔍 [MENU DEBUG] Categories data type:', typeof categoriesData);
        console.log('🔍 [MENU DEBUG] Categories data length:', Array.isArray(categoriesData) ? categoriesData.length : 'not array');
        
        if (Array.isArray(categoriesData) && categoriesData.length > 0) {
          console.log('🔍 [MENU DEBUG] First category structure:', {
            id: categoriesData[0]._id,
            name: categoriesData[0].name,
            products: categoriesData[0].products?.length || 0,
            hasProducts: !!categoriesData[0].products
          });
        }

        // Set first category as selected if none selected
        if (!selectedCategory) {
          setSelectedCategory(categoriesData[0]._id);
          console.log('🔍 [MENU DEBUG] Selected first category:', categoriesData[0]._id);
        }

        setCategories(categoriesData);
      } else {
        console.log('🔍 [MENU DEBUG] No categories data in response');
        Alert.alert('Error', 'Failed to load menu');
      }
    } catch (error) {
      console.error('🔍 [MENU DEBUG] Error loading menu:', error);
      Alert.alert('Error', 'Failed to load menu data');
    } finally {
      setLoading(false);
    }
  };

  const loadDeals = async () => {
    try {
      setDealsLoading(true);
      console.log('🔥 [DEALS] Loading deals from /deals/campaigns/active');
      const response = await api.get('/deals/campaigns/active');
      console.log('🔥 [DEALS] Response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data?.campaigns) {
        console.log('🔥 [DEALS] Campaigns found:', response.data.campaigns.length);
        // Extract all active deals from all active campaigns
        const activeCampaigns = response.data.campaigns.filter((c: DealCampaign) => c.status === 'ACTIVE');
        console.log('🔥 [DEALS] Active campaigns:', activeCampaigns.length);
        setDealCampaigns(activeCampaigns);
        const allDeals: DealItem[] = [];
        activeCampaigns.forEach((campaign: DealCampaign) => {
          console.log('🔥 [DEALS] Campaign:', campaign.name, 'Deals:', campaign.deals?.length || 0);
          if (campaign.deals && campaign.deals.length > 0) {
            campaign.deals.forEach((deal) => {
              if (deal.isActive !== false) {
                // Normalize categories - handle both ObjectId strings and populated objects
                const normalizedCategories = (deal.categories || []).map((cat: any) => 
                  typeof cat === 'string' ? cat : cat._id
                );
                allDeals.push({
                  ...deal,
                  categories: normalizedCategories,
                });
              }
            });
          }
        });
        console.log('🔥 [DEALS] Total deals extracted:', allDeals.length);
        setDeals(allDeals);
      } else {
        console.log('🔥 [DEALS] No campaigns in response or success=false');
        setDealCampaigns([]);
      }
    } catch (error) {
      console.error('🔥 [DEALS] Error loading deals:', error);
      setDealCampaigns([]);
    } finally {
      setDealsLoading(false);
    }
  };

  const getDealsForCategoryOrAll = () => {
    const byCategory = getDealsForCategory();
    return byCategory.length > 0 ? byCategory : deals;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadMenuData(), loadDeals()]);
    setRefreshing(false);
  };

  const getSelectedCategoryProducts = () => {
    const category = categories.find(cat => cat._id === selectedCategory);
    return category?.products || [];
  };

  const getDealsForCategory = () => {
    return deals;
  };

  const addToCart = (product: Product) => {
    // TODO: Implement cart functionality
    Alert.alert('Added to Cart', `${product.name} added to cart!`);
  };

  const renderProduct = (product: Product) => (
    <TouchableOpacity
      key={product._id}
      style={[styles.productCard, isWebMobile && styles.productCardGrid]}
      onPress={() => addToCart(product)}
    >
      <View style={[styles.productImageContainer, isWebMobile && styles.productImageContainerGrid]}>
        {product.imageUrl ? (
          <Image
            source={{ uri: getFullImageUrl(product.imageUrl) }}
            style={[styles.productImage, isWebMobile && styles.productImageGrid]}
          />
        ) : (
          <View style={[styles.productImagePlaceholder, isWebMobile && styles.productImageGrid]}>
            <Ionicons name="restaurant-outline" size={40} color="#ccc" />
          </View>
        )}
        {!product.isAvailable && (
          <View style={styles.unavailableOverlay}>
            <Text style={styles.unavailableText}>Unavailable</Text>
          </View>
        )}
      </View>
      <View style={[styles.productInfo, isWebMobile && styles.productInfoGrid]}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productDescription} numberOfLines={2}>
          {product.description}
        </Text>
        <Text style={styles.productPrice}>${getDisplayPrice(product).toFixed(2)}</Text>
      </View>
      <TouchableOpacity
        style={[styles.addButton, isWebMobile && styles.addButtonGrid, !product.isAvailable && styles.addButtonDisabled]}
        onPress={() => addToCart(product)}
        disabled={!product.isAvailable}
      >
        <Ionicons name="add" size={20} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const addDealToCart = (deal: DealItem) => {
    Alert.alert('Added to Cart', `${deal.title} added to cart!`);
  };

  const renderDealCard = (deal: DealItem) => {
    const discountPercent = deal.discount || (deal.originalPrice && deal.originalPrice > deal.price
      ? Math.round(((deal.originalPrice - deal.price) / deal.originalPrice) * 100)
      : 0);

    return (
      <TouchableOpacity
        key={deal._id}
        style={styles.dealCard}
        onPress={() => addDealToCart(deal)}
      >
        <View style={styles.dealImageContainer}>
          {deal.imageUrl ? (
            <Image source={{ uri: getFullImageUrl(deal.imageUrl) }} style={styles.dealImage} />
          ) : (
            <View style={styles.dealImagePlaceholder}>
              <Ionicons name="pricetag" size={32} color="#E87E35" />
            </View>
          )}
          {discountPercent > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discountPercent}% OFF</Text>
            </View>
          )}
        </View>
        <View style={styles.dealInfo}>
          <Text style={styles.dealTitle} numberOfLines={2}>{deal.title}</Text>
          {deal.description && (
            <Text style={styles.dealDescription} numberOfLines={2}>{deal.description}</Text>
          )}
          <View style={styles.dealPriceRow}>
            <Text style={styles.dealPrice}>${deal.price.toFixed(2)}</Text>
            {deal.originalPrice && deal.originalPrice > deal.price && (
              <Text style={styles.dealOriginalPrice}>${deal.originalPrice.toFixed(2)}</Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.dealAddButton}
          onPress={() => addDealToCart(deal)}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Categories Tabs */}
        {categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
            contentContainerStyle={styles.categoriesContent}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category._id}
                style={[
                  styles.categoryTab,
                  selectedCategory === category._id && styles.categoryTabSelected,
                ]}
                onPress={() => setSelectedCategory(category._id)}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    selectedCategory === category._id && styles.categoryTabTextSelected,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Products */}
        <View style={[styles.productsContainer, isWebMobile && styles.productsContainerGrid]}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading menu...</Text>
            </View>
          ) : getSelectedCategoryProducts().length > 0 ? (
            getSelectedCategoryProducts().map(renderProduct)
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="restaurant-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No products available</Text>
              <Text style={styles.emptySubtext}>Check back later for new items</Text>
            </View>
          )}
        </View>

        {/* Deals Section - Campaign image then deal cards */}
        {getDealsForCategoryOrAll().length > 0 && (
          <View style={styles.dealsSection}>
            {dealCampaigns
              .filter((c) => c?.heroBanner?.imageUrl)
              .slice(0, 1)
              .map((c) => {
                const hero = getFullImageUrl(c.heroBanner?.imageUrl);
                return hero ? <Image key={c._id} source={{ uri: hero }} style={styles.campaignHeroImage} /> : null;
              })}
            <View style={styles.dealsContainer}>
              {getDealsForCategoryOrAll().map(renderDealCard)}
            </View>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  categoriesContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoriesContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  categoryTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  categoryTabSelected: {
    backgroundColor: '#E87E35',
  },
  categoryTabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryTabTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  productsContainer: {
    padding: 20,
  },
  productsContainerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productCardGrid: {
    flexDirection: 'column',
    width: '48%',
    padding: 12,
  },
  productImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  productImageContainerGrid: {
    marginRight: 0,
    marginBottom: 10,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  productImageGrid: {
    width: '100%',
    height: 120,
    borderRadius: 12,
  },
  productImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unavailableOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unavailableText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productInfoGrid: {
    width: '100%',
    flex: 0,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E87E35',
  },
  addButton: {
    backgroundColor: '#E87E35',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  addButtonGrid: {
    marginLeft: 0,
    marginTop: 10,
    alignSelf: 'flex-end',
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a2e',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 100,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    alignItems: 'center',
  },
  navText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  navTextActive: {
    color: '#e87e35',
    fontWeight: '600',
  },
  // Deals Section Styles
  dealsSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 0,
  },
  campaignHeroImage: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    marginBottom: 12,
  },
  dealsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dealsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  dealsContainer: {
    gap: 12,
  },
  // Deal Card Styles
  dealCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF9F5',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFE5D9',
    shadowColor: '#E87E35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dealImageContainer: {
    position: 'relative',
    marginRight: 14,
  },
  dealImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  dealImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#FFF0E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#E74C3C',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  dealInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  dealTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  dealDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  dealPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dealPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E87E35',
  },
  dealOriginalPrice: {
    fontSize: 13,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  dealAddButton: {
    backgroundColor: '#E87E35',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    alignSelf: 'center',
  },
});
