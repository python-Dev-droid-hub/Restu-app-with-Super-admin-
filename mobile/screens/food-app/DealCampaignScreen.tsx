import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  ImageBackground,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAppColors, useAppSpacing } from '../../theme';
import { useFormatPrice } from '../../utils/formatHelpers';
import { useCart } from '../../context/CartContext';
import { api } from '../../components/api/client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

const getFullImageUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = api.getBaseURL().replace(/\/?api\/?$/, '');
  if (!base) return url;
  if (url.startsWith('/')) return `${base}${url}`;
  return `${base}/${url.replace(/^\/+/, '')}`;
};

interface DealItem {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  items?: Array<{
    productId?: string;
    productName?: string;
    quantity?: number;
    price?: number;
  }>;
  isActive?: boolean;
  displayOrder?: number;
}

interface Campaign {
  _id: string;
  name: string;
  description?: string;
  heroBanner?: {
    imageUrl?: string;
    title?: string;
    subtitle?: string;
    bgColor?: string;
  };
  deals: DealItem[];
  status: string;
}

export default function DealCampaignScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const colors = useAppColors();
  const spacing = useAppSpacing();
  const formatPrice = useFormatPrice();
  const { addToCart } = useCart();
  const insets = useSafeAreaInsets();

  const campaignId = (route.params as any)?.campaignId;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  const loadCampaign = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/deals/campaigns/${campaignId}`);

      if (response.success && response.data?.campaign) {
        setCampaign(response.data.campaign);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Campaign not found',
        });
      }
    } catch (err) {
      console.error('[DealCampaign] Error:', err);
      Toast.show({
        type: 'error',
        text1: 'Failed to load deals',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [campaignId]);

  useEffect(() => {
    if (campaignId) {
      loadCampaign();
    }
  }, [campaignId, loadCampaign]);

  const handleAddToCart = async (deal: DealItem) => {
    try {
      setAddingToCart(deal._id);

      // Add to cart using CartContext
      await addToCart({
        _id: deal._id,
        name: deal.title,
        price: typeof deal.price === 'number' && !Number.isNaN(deal.price) ? deal.price : 0,
        image: getFullImageUrl(deal.imageUrl),
      });

      Toast.show({
        type: 'success',
        text1: 'Added to cart',
        text2: deal.title,
      });
    } catch (err) {
      console.error('[DealCampaign] Add to cart error:', err);
      Toast.show({
        type: 'error',
        text1: 'Failed to add to cart',
      });
    } finally {
      setAddingToCart(null);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCampaign();
  }, [loadCampaign]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.gray_50 }]}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text_dark} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text_dark }]}>Deal Campaign</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!campaign) {
    return (
      <View style={[styles.container, { backgroundColor: colors.gray_50 }]}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text_dark} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text_dark }]}>Deal Campaign</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="sad-outline" size={60} color={colors.gray_400} />
          <Text style={[styles.errorText, { color: colors.gray_600 }]}>Campaign not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backToHomeButton}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const sortedDeals = [...(campaign.deals || [])]
    .filter(d => d.isActive !== false)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  return (
    <View style={[styles.container, { backgroundColor: colors.gray_50 }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: colors.white }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text_dark} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text_dark }]} numberOfLines={1}>
          {campaign.name}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* Hero Banner */}
        {campaign.heroBanner?.imageUrl && (
          <View style={styles.heroContainer}>
            <ImageBackground
              source={{ uri: getFullImageUrl(campaign.heroBanner.imageUrl) }}
              style={styles.heroImage}
              imageStyle={{ resizeMode: 'cover' }}
            >
              <View style={styles.heroOverlay}>
                <Text style={styles.heroTitle}>
                  {campaign.heroBanner.title || campaign.name}
                </Text>
                {campaign.heroBanner.subtitle && (
                  <Text style={styles.heroSubtitle}>{campaign.heroBanner.subtitle}</Text>
                )}
              </View>
            </ImageBackground>
          </View>
        )}

        {/* Campaign Title & Description (if no hero banner) */}
        {!campaign.heroBanner?.imageUrl && (
          <View style={[styles.titleSection, { backgroundColor: colors.white }]}>
            <Text style={[styles.campaignTitle, { color: colors.text_dark }]}>
              {campaign.name}
            </Text>
            {campaign.description && (
              <Text style={[styles.campaignDescription, { color: colors.gray_600 }]}>
                {campaign.description}
              </Text>
            )}
          </View>
        )}

        {/* Deals Count */}
        <View style={styles.dealsCountSection}>
          <Text style={[styles.dealsCount, { color: colors.gray_600 }]}>
            {sortedDeals.length} {sortedDeals.length === 1 ? 'deal' : 'deals'} available
          </Text>
        </View>

        {/* Deal Cards Grid */}
        <View style={styles.gridContainer}>
          <FlatList
            data={sortedDeals}
            numColumns={2}
            columnWrapperStyle={styles.row}
            scrollEnabled={false}
            renderItem={({ item: deal }) => (
              <DealCard
                deal={deal}
                colors={colors}
                spacing={spacing}
                formatPrice={formatPrice}
                onAddToCart={() => handleAddToCart(deal)}
                isAdding={addingToCart === deal._id}
              />
            )}
            keyExtractor={(item) => item._id}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.gray_500 }]}>
                  No deals available
                </Text>
              </View>
            }
          />
        </View>

        {/* Bottom Padding */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// Deal Card Component
interface DealCardProps {
  deal: DealItem;
  colors: any;
  spacing: any;
  formatPrice: (price: number) => string;
  onAddToCart: () => void;
  isAdding: boolean;
}

const DealCard = ({ deal, colors, spacing, formatPrice, onAddToCart, isAdding }: DealCardProps) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const imageUri = getFullImageUrl(deal.imageUrl);

  const discountPercent = deal.discount || (deal.originalPrice && deal.originalPrice > deal.price
    ? Math.round(((deal.originalPrice - deal.price) / deal.originalPrice) * 100)
    : 0);

  return (
    <View style={[styles.dealCard, { backgroundColor: colors.white }]}>
      {/* Image */}
      <View style={styles.dealImageContainer}>
        {imageLoading && (
          <View style={styles.imageLoader}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}

        {!imageError && imageUri && (
          <Image
            source={{ uri: imageUri }}
            style={styles.dealImage}
            resizeMode="cover"
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
          />
        )}

        {(imageError || !imageUri) && (
          <View style={[styles.dealImage, { backgroundColor: colors.gray_100, justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="restaurant-outline" size={40} color={colors.gray_400} />
          </View>
        )}

        {/* Discount Badge */}
        {discountPercent > 0 && (
          <View style={[styles.discountBadge, { backgroundColor: colors.danger }]}>
            <Text style={styles.discountText}>{discountPercent}% OFF</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.dealContent}>
        <Text style={[styles.dealTitle, { color: colors.text_dark }]} numberOfLines={2}>
          {deal.title}
        </Text>

        {deal.description && (
          <Text style={[styles.dealDescription, { color: colors.gray_600 }]} numberOfLines={2}>
            {deal.description}
          </Text>
        )}

        {/* Items included */}
        {deal.items && deal.items.length > 0 && (
          <View style={styles.itemsContainer}>
            {deal.items.slice(0, 2).map((item, idx) => (
              <Text key={idx} style={[styles.itemText, { color: colors.gray_500 }]}>
                {item.quantity}x {item.productName}
              </Text>
            ))}
            {deal.items.length > 2 && (
              <Text style={[styles.itemText, { color: colors.gray_500 }]}>
                +{deal.items.length - 2} more
              </Text>
            )}
          </View>
        )}

        {/* Price */}
        <View style={styles.priceRow}>
          <Text style={[styles.dealPrice, { color: colors.primary }]}>
            {formatPrice(deal.price)}
          </Text>
          {deal.originalPrice && deal.originalPrice > deal.price && (
            <Text style={[styles.originalPrice, { color: colors.gray_500 }]}>
              {formatPrice(deal.originalPrice)}
            </Text>
          )}
        </View>

        {/* Add Button */}
        <TouchableOpacity
          onPress={onAddToCart}
          disabled={isAdding}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
        >
          <Text style={styles.addButtonText}>
            {isAdding ? 'Adding...' : 'ADD'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  backToHomeButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  heroContainer: {
    width: '100%',
    height: 200,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 8,
    textAlign: 'center',
  },
  titleSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  campaignTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  campaignDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  dealsCountSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dealsCount: {
    fontSize: 14,
  },
  gridContainer: {
    paddingHorizontal: 12,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
  },
  // Deal Card Styles
  dealCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: (width - 32) / 2,
  },
  dealImageContainer: {
    width: '100%',
    height: 140,
    position: 'relative',
  },
  dealImage: {
    width: '100%',
    height: '100%',
  },
  imageLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  dealContent: {
    padding: 12,
  },
  dealTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
    minHeight: 36,
  },
  dealDescription: {
    fontSize: 11,
    lineHeight: 14,
    marginBottom: 8,
  },
  itemsContainer: {
    marginBottom: 8,
  },
  itemText: {
    fontSize: 10,
    lineHeight: 14,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  dealPrice: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  originalPrice: {
    fontSize: 11,
    textDecorationLine: 'line-through',
  },
  addButton: {
    width: '100%',
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
