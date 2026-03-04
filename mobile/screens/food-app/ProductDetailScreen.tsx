import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { formatPrice } from '../../utils/formatHelpers';

const { width } = Dimensions.get('window');

const SIZES = [
  { id: 'regular', name: 'Regular', price: 250 },
  { id: 'family', name: 'Family', price: 450 },
  { id: 'party', name: 'Party Pack', price: 1200 },
];

const EXTRAS = [
  { id: 'onions', name: 'Extra Onions', price: 20 },
  { id: 'spicy', name: 'Less Spicy', price: 0 },
  { id: 'lemon', name: 'Extra Lemon', price: 10 },
];

export default function ProductDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const product = (route.params as any)?.product || {};
  
  const [selectedSize, setSelectedSize] = useState(SIZES[0]);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);

  const toggleExtra = (id: string) => {
    setSelectedExtras(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const extrasTotal = EXTRAS.filter(e => selectedExtras.includes(e.id))
    .reduce((sum, e) => sum + e.price, 0);
  const total = (selectedSize.price + extrasTotal) * quantity;

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
        <Image source={{ uri: product.image }} style={styles.image} />

        {/* Product Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.name}>{product.name}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color={colors.warning} />
            <Text style={styles.rating}>{product.rating || 4.5} ({product.reviews || 120} reviews)</Text>
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

          {/* Size Selection */}
          <Text style={styles.sectionTitle}>Select Size</Text>
          {SIZES.map((size) => (
            <TouchableOpacity
              key={size.id}
              style={[styles.sizeOption, selectedSize.id === size.id && styles.sizeOptionActive]}
              onPress={() => setSelectedSize(size)}
            >
              <View style={[styles.radio, selectedSize.id === size.id && styles.radioActive]} />
              <Text style={styles.sizeName}>{size.name}</Text>
              <Text style={styles.sizePrice}>{formatPrice(size.price)}</Text>
            </TouchableOpacity>
          ))}

          {/* Extras */}
          <Text style={styles.sectionTitle}>Add Extras</Text>
          {EXTRAS.map((extra) => (
            <TouchableOpacity
              key={extra.id}
              style={styles.extraOption}
              onPress={() => toggleExtra(extra.id)}
            >
              <Ionicons
                name={selectedExtras.includes(extra.id) ? 'checkbox' : 'square-outline'}
                size={22}
                color={selectedExtras.includes(extra.id) ? colors.primary : colors.gray_400}
              />
              <Text style={styles.extraName}>{extra.name}</Text>
              <Text style={styles.extraPrice}>{extra.price === 0 ? 'Free' : `+${formatPrice(extra.price)}`}</Text>
            </TouchableOpacity>
          ))}

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
        <TouchableOpacity style={styles.addToCartButton}>
          <Text style={styles.addToCartText}>ADD TO CART - {formatPrice(total)}</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  closeButton: { padding: spacing.xs },
  image: { width: width, height: 250 },
  infoContainer: { padding: spacing.lg },
  name: { fontSize: typography.sizes.h2, fontWeight: typography.weights.bold, color: colors.text_dark },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  rating: { marginLeft: spacing.xs, fontSize: typography.sizes.body, color: colors.text_medium },
  tagsRow: { flexDirection: 'row', marginTop: spacing.md, gap: spacing.sm },
  tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.gray_100, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  tagText: { marginLeft: 4, fontSize: typography.sizes.small, color: colors.text_medium },
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
