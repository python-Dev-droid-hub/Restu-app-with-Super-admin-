import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useFormatPrice } from '../../utils/formatHelpers';
import { api } from '../../components/api/client';

const { width } = Dimensions.get('window');

interface ProductSize {
  _id?: string;
  id?: string;
  price?: number;
  isDefault?: boolean;
  size?: {
    _id?: string;
    id?: string;
    size_name?: string;
    name?: string;
  };
}

interface Extra {
  _id: string;
  id?: string;
  name: string;
  price: number;
}

interface Product {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  rating?: number;
  reviews?: number;
  imageUrl?: string;
  image?: string;
  images?: string[];
  hasSizes?: boolean;
  productSizes?: ProductSize[];
  extras?: Extra[];
  isAvailable?: boolean;
  category?: string;
}

export default function ProductDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const initialProduct = (route.params as any)?.product || {};
  const formatPrice = useFormatPrice();

  const [product, setProduct] = useState<Product>(initialProduct);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);

  // Get full image URL with normalization
  const getFullImageUrl = useCallback((url?: string): string => {
    if (!url) return '';
    const normalized = url.replace(/\\/g, '/');
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
    const baseUrl = api.getBaseURL().replace(/\/?api\/?$/, '');
    if (normalized.startsWith('/')) return `${baseUrl}${normalized}`;
    return `${baseUrl}/${normalized}`;
  }, []);

  // Fetch product details from API
  const loadProductDetails = useCallback(async () => {
    try {
      setLoading(true);
      const productId = product._id || product.id || initialProduct._id || initialProduct.id;
      if (!productId) {
        console.error('[ProductDetail] No product ID available');
        setLoading(false);
        return;
      }

      // Product data is already passed from HomeScreen via route params
      // No need to fetch again - just use the initialProduct
      // If needed in future, the endpoint is: /menu/admin/products/${productId}
      console.log('[ProductDetail] Using product from route params:', product.name || initialProduct.name);
      
      // Set default size if product has sizes
      if (product.hasSizes && product.productSizes && product.productSizes.length > 0) {
        const defaultSize = product.productSizes.find((s: ProductSize) => s.isDefault) || product.productSizes[0];
        setSelectedSize(defaultSize);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('[ProductDetail] Error:', error);
      setLoading(false);
    }
  }, [product, initialProduct]);

  useEffect(() => {
    loadProductDetails();
  }, [loadProductDetails]);

  const toggleExtra = (id: string) => {
    setSelectedExtras(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const calculateTotal = useCallback((): number => {
    let basePrice = product.price || 0;
    
    // If has sizes and selected size, use size price
    if (product.hasSizes && selectedSize && selectedSize.price) {
      basePrice = selectedSize.price;
    }
    
    // Add extras
    const extrasTotal = (product.extras || [])
      .filter(e => selectedExtras.includes(e._id || e.id || ''))
      .reduce((sum, e) => sum + (e.price || 0), 0);
    
    return (basePrice + extrasTotal) * quantity;
  }, [product, selectedSize, selectedExtras, quantity]);

  const handleAddToCart = () => {
    const cartItem = {
      _id: product._id || product.id || initialProduct._id || initialProduct.id || '',
      name: product.name || initialProduct.name,
      price: calculateTotal() / quantity,
      originalPrice: product.originalPrice || initialProduct.originalPrice,
      image: getProductImage(),
      size: selectedSize?.size?.size_name || selectedSize?.size?.name,
      extras: selectedExtras,
      quantity,
    };
    
    Alert.alert('Added to Cart', `${product.name || initialProduct.name} added to your cart!`);
    // TODO: Add to cart context
  };

  const productData = product._id ? product : initialProduct;
  const hasSizes = productData.hasSizes && productData.productSizes && productData.productSizes.length > 0;
  const hasExtras = productData.extras && productData.extras.length > 0;

  // Get image from product data
  const getProductImage = useCallback((): string => {
    const image = productData.imageUrl || productData.image;
    if (Array.isArray(productData.images) && productData.images.length > 0) {
      return getFullImageUrl(productData.images[0]);
    }
    return getFullImageUrl(image);
  }, [productData, getFullImageUrl]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading product...</Text>
      </View>
    );
  }

  const imageUrl = getProductImage();
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.text_dark} />
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="heart-outline" size={24} color={colors.text_dark} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image */}
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="restaurant" size={64} color={colors.gray_400} />
          </View>
        )}

        {/* Product Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.name}>{productData.name || 'Product'}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color={colors.warning} />
            <Text style={styles.rating}>{productData.rating || 4.5} ({productData.reviews || 0} reviews)</Text>
          </View>
          
          <View style={styles.tagsRow}>
            <View style={styles.tag}>
              <Ionicons name="flame" size={14} color={colors.danger} />
              <Text style={styles.tagText}>Medium Spicy</Text>
            </View>
            <View style={styles.tag}>
              <Ionicons name="time" size={14} color={colors.info} />
              <Text style={styles.tagText}>25 mins</Text>
            </View>
          </View>

          {/* Description */}
          {productData.description && (
            <Text style={styles.description}>{productData.description}</Text>
          )}

          {/* Size Selection - Only show if product has sizes */}
          {hasSizes && (
            <>
              <Text style={styles.sectionTitle}>Select Size</Text>
              {productData.productSizes?.map((sizeItem: ProductSize) => {
                const sizeId = sizeItem._id || sizeItem.id || '';
                const sizeName = sizeItem.size?.size_name || sizeItem.size?.name || 'Regular';
                const sizePrice = sizeItem.price || productData.price || 0;
                const isSelected = selectedSize?._id === sizeId || selectedSize?.id === sizeId;
                
                return (
                  <TouchableOpacity
                    key={sizeId}
                    style={[styles.sizeOption, isSelected && styles.sizeOptionActive]}
                    onPress={() => setSelectedSize(sizeItem)}
                  >
                    <View style={[styles.radio, isSelected && styles.radioActive]} />
                    <Text style={styles.sizeName}>{sizeName}</Text>
                    <Text style={styles.sizePrice}>{formatPrice(sizePrice)}</Text>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* Extras - Only show if product has extras */}
          {hasExtras && (
            <>
              <Text style={styles.sectionTitle}>Add Extras</Text>
              {productData.extras?.map((extra: Extra) => {
                const extraId = extra._id || extra.id || '';
                const isSelected = selectedExtras.includes(extraId);
                
                return (
                  <TouchableOpacity
                    key={extraId}
                    style={styles.extraOption}
                    onPress={() => toggleExtra(extraId)}
                  >
                    <Ionicons
                      name={isSelected ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={isSelected ? colors.primary : colors.gray_400}
                    />
                    <Text style={styles.extraName}>{extra.name}</Text>
                    <Text style={styles.extraPrice}>
                      {extra.price === 0 ? 'Free' : `+${formatPrice(extra.price)}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* Quantity */}
          <Text style={styles.sectionTitle}>Quantity</Text>
          <View style={styles.quantityRow}>
            <TouchableOpacity 
              style={styles.qtyButton}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Ionicons name="remove" size={20} color={colors.text_dark} />
            </TouchableOpacity>
            <Text style={styles.quantity}>{quantity}</Text>
            <TouchableOpacity 
              style={styles.qtyButton}
              onPress={() => setQuantity(quantity + 1)}
            >
              <Ionicons name="add" size={20} color={colors.text_dark} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.addToCartButton} onPress={handleAddToCart}>
          <Text style={styles.addToCartText}>ADD TO CART - {formatPrice(calculateTotal())}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton}>
          <Text style={styles.saveText}>SAVE FOR LATER</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: spacing.md, fontSize: typography.sizes.body, color: colors.text_medium },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  closeButton: { padding: spacing.xs },
  image: { width: width, height: 250 },
  imagePlaceholder: { 
    backgroundColor: colors.gray_100, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  infoContainer: { padding: spacing.lg },
  name: { fontSize: typography.sizes.h2, fontWeight: typography.weights.bold, color: colors.text_dark },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  rating: { marginLeft: spacing.xs, fontSize: typography.sizes.body, color: colors.text_medium },
  tagsRow: { flexDirection: 'row', marginTop: spacing.md, gap: spacing.sm },
  tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.gray_100, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  tagText: { marginLeft: 4, fontSize: typography.sizes.small, color: colors.text_medium },
  description: { 
    fontSize: typography.sizes.body, 
    color: colors.text_medium, 
    marginTop: spacing.md,
    lineHeight: 20 
  },
  sectionTitle: { fontSize: typography.sizes.h4, fontWeight: typography.weights.bold, color: colors.text_dark, marginTop: spacing.lg, marginBottom: spacing.sm },
  sizeOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray_100 },
  sizeOptionActive: { },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.gray_400, marginRight: spacing.md },
  radioActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  sizeName: { flex: 1, fontSize: typography.sizes.body, color: colors.text_dark },
  sizePrice: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.primary },
  extraOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  extraName: { flex: 1, marginLeft: spacing.sm, fontSize: typography.sizes.body, color: colors.text_dark },
  extraPrice: { fontSize: typography.sizes.small, color: colors.text_medium },
  quantityRow: { flexDirection: 'row', alignItems: 'center' },
  qtyButton: { width: 40, height: 40, borderRadius: borderRadius.sm, backgroundColor: colors.gray_100, justifyContent: 'center', alignItems: 'center' },
  quantity: { fontSize: typography.sizes.h4, fontWeight: typography.weights.bold, color: colors.text_dark, marginHorizontal: spacing.lg },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.white, padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.gray_200 },
  addToCartButton: { backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },
  addToCartText: { color: colors.white, fontSize: typography.sizes.h4, fontWeight: typography.weights.bold },
  saveButton: { marginTop: spacing.sm, paddingVertical: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', borderWidth: 1, borderColor: colors.primary },
  saveText: { color: colors.primary, fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
});
