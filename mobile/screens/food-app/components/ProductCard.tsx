import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useAppColors, useAppSpacing } from '../../../theme';
import { useFormatPrice } from '../../../utils/formatHelpers';
import api from '../../../services/api';

interface Product {
  _id: string;
  name: string;
  description?: string;
  image?: unknown;
  imageUrl?: unknown;
  images?: unknown;
  price: number;
  effectivePrice?: number;
  hasSizes?: boolean;
  productSizes?: Array<{
    price?: number | string;
    isDefault?: boolean;
  }>;
  originalPrice?: number;
  rating?: number;
  reviews?: number;
  discount?: number;
  badge?: string;
  orderCount?: number;
  isPopular?: boolean;
}

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onAddToCart: () => void;
  onToggleFavorite: () => void;
  isFavorite?: boolean;
}

const getFullImageUrl = (url?: string) => {
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
};

const getImageCandidate = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const maybeUrl = (value as any).url || (value as any).uri || (value as any).path;
    if (typeof maybeUrl === 'string') return maybeUrl;
  }
  return '';
};

const getFirstArrayItem = (value: unknown): unknown => {
  if (!Array.isArray(value)) return undefined;
  return value.length > 0 ? value[0] : undefined;
};

const ProductCard = ({
  product,
  onPress,
  onAddToCart,
  onToggleFavorite,
  isFavorite = false,
}: ProductCardProps) => {
  const colors = useAppColors();
  const spacing = useAppSpacing();
  const formatPriceDynamic = useFormatPrice();

  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const imageUri = useMemo(() => {
    const candidate =
      getImageCandidate(product.imageUrl) ||
      getImageCandidate(product.image) ||
      getImageCandidate(getFirstArrayItem(product.images));

    const full = getFullImageUrl(candidate);
    if (!full) {
      console.log('[ProductCard] No image field found for product:', {
        id: product._id,
        name: product.name,
        imageUrl: product.imageUrl,
        image: product.image,
        images: product.images,
      });
    }
    return full;
  }, [product._id, product.image, product.imageUrl, product.images, product.name]);

  const discountPercent = product.discount || (product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0);

  // Determine if product is a "People's Favorite" (high selling item)
  const isPeopleFavorite = !!product.isPopular || (typeof product.orderCount === 'number' && product.orderCount > 20);

  const displayPrice = useMemo(() => {
    if (typeof product.effectivePrice === 'number' && !Number.isNaN(product.effectivePrice)) {
      return product.effectivePrice;
    }

    const sizes = product.productSizes;
    if (product.hasSizes && Array.isArray(sizes) && sizes.length > 0) {
      const toNumberOrNaN = (value: unknown): number => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') return parseFloat(value);
        return NaN;
      };

      const defaultSize = sizes.find((s) => s?.isDefault) || sizes[0];
      const defaultPrice = toNumberOrNaN(defaultSize?.price);
      if (Number.isFinite(defaultPrice)) return defaultPrice;

      const numericPrices = sizes.map((s) => toNumberOrNaN(s?.price)).filter((p) => Number.isFinite(p)) as number[];
      if (numericPrices.length > 0) return Math.min(...numericPrices);
    }

    return typeof product.price === 'number' && !Number.isNaN(product.price) ? product.price : 0;
  }, [product.effectivePrice, product.hasSizes, product.price, product.productSizes]);

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
    console.log('[ProductCard] Image failed to load:', imageUri, 'for', product.name);
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        backgroundColor: colors.white,
        borderRadius: spacing.borderRadius.md,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
      }}
    >
      <View
        style={{
          width: '100%',
          height: 160,
          backgroundColor: colors.gray_100,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {imageLoading && (
          <View
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: colors.gray_200,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}

        {!imageError && !!imageUri && (
          <Image
            source={{ uri: imageUri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}

        {(imageError || !imageUri) && (
          <View
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: colors.gray_100,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 40, marginBottom: 4 }}>🍽️</Text>
            <Text style={{ fontSize: 10, color: colors.gray_500 }}>Image not found</Text>
          </View>
        )}

        {discountPercent > 0 && (
          <View
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              backgroundColor: colors.danger,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 4,
              zIndex: 10,
            }}
          >
            <Text style={{ color: colors.white, fontSize: 10, fontWeight: 'bold' }}>{discountPercent}% OFF</Text>
          </View>
        )}

        {/* People's Favorite Badge - High Selling Item */}
        {isPeopleFavorite && (
          <View
            style={{
              position: 'absolute',
              top: 8,
              left: discountPercent > 0 ? 70 : 8,
              backgroundColor: colors.success,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 4,
              zIndex: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Text style={{ fontSize: 10 }}>🔥</Text>
            <Text style={{ color: colors.white, fontSize: 10, fontWeight: 'bold' }}>People's Favorite</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={onToggleFavorite}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.white,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.15,
            shadowRadius: 1,
            elevation: 2,
            zIndex: 11,
          }}
        >
          <Text style={{ fontSize: 16, color: isFavorite ? colors.danger : colors.gray_400 }}>
            {isFavorite ? '♥' : '♡'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ padding: spacing.card }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 13,
            fontWeight: 'bold',
            color: colors.text_dark,
            marginBottom: 8,
          }}
        >
          {product.name}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.primary }}>
            {formatPriceDynamic(displayPrice)}
          </Text>

          {!!product.originalPrice && product.originalPrice > product.price && (
            <Text
              style={{
                fontSize: 11,
                color: colors.gray_500,
                textDecorationLine: 'line-through',
              }}
            >
              {formatPriceDynamic(product.originalPrice)}
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={onAddToCart}
          activeOpacity={0.8}
          style={{
            width: '100%',
            height: 36,
            backgroundColor: colors.primary,
            borderRadius: spacing.borderRadius.sm,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: colors.white, fontSize: 12, fontWeight: 'bold' }}>ADD TO CART</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default ProductCard;
