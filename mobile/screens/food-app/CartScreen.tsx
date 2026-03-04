import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { formatPrice, formatPriceDecimal } from '../../utils/formatHelpers';
import { calculateBill, CartItem } from '../../utils/cartHelpers';

const MOCK_CART_ITEMS: CartItem[] = [
  { _id: '1', name: 'Chicken Biryani', price: 250, originalPrice: 350, quantity: 2, size: 'Regular', image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=100&h=100&fit=crop' },
  { _id: '2', name: 'Tandoori Chicken', price: 180, originalPrice: 250, quantity: 1, size: 'Half', image: 'https://images.unsplash.com/photo-1601058268499-e526861c0f8f?w=100&h=100&fit=crop' },
  { _id: '3', name: 'Coca Cola (Large)', price: 60, quantity: 2, image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=100&h=100&fit=crop' },
];

export default function CartScreen() {
  const navigation = useNavigation();
  const [cartItems, setCartItems] = useState<CartItem[]>(MOCK_CART_ITEMS);

  const bill = useMemo(() => {
    const calculated = calculateBill(cartItems, { deliveryFee: 50, taxPercent: 5 });
    // Debug logging
    console.log('[Cart] Items:');
    cartItems.forEach(item => {
      console.log(`  ${item.name}: ₹${item.price} × ${item.quantity} = ₹${item.price * item.quantity}`);
    });
    console.log(`[Cart] Subtotal: ₹${calculated.subtotal}`);
    console.log(`[Cart] Discount: ₹${calculated.discount}`);
    console.log(`[Cart] Delivery Fee: ₹${calculated.deliveryFee}`);
    console.log(`[Cart] Tax (${calculated.taxPercentage}%): ₹${calculated.tax}`);
    console.log(`[Cart] Total: ₹${calculated.total}`);
    return calculated;
  }, [cartItems]);

  const updateQuantity = (id: string, change: number) => {
    setCartItems(prev => prev.map(item => {
      if (item._id === id) {
        const newQty = Math.max(1, item.quantity + change);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    Alert.alert('Remove Item', 'Are you sure you want to remove this item?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', onPress: () => setCartItems(prev => prev.filter(item => item._id !== id)), style: 'destructive' },
    ]);
  };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <Image source={{ uri: item.image }} style={styles.itemImage} />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemSize}>{item.size || 'Standard'}</Text>
        <Text style={styles.itemPrice}>{formatPrice(item.price * item.quantity)}</Text>
      </View>
      <View style={styles.quantityControls}>
        <TouchableOpacity onPress={() => updateQuantity(item._id, -1)} style={styles.qtyButton}>
          <Ionicons name="remove" size={16} color={colors.text_dark} />
        </TouchableOpacity>
        <Text style={styles.quantity}>{item.quantity}</Text>
        <TouchableOpacity onPress={() => updateQuantity(item._id, 1)} style={styles.qtyButton}>
          <Ionicons name="add" size={16} color={colors.text_dark} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => removeItem(item._id)} style={styles.removeButton}>
        <Ionicons name="trash-outline" size={20} color={colors.danger} />
      </TouchableOpacity>
    </View>
  );

  if (cartItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cart-outline" size={80} color={colors.gray_300} />
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySubtitle}>Add items to get started</Text>
        <TouchableOpacity style={styles.browseButton} onPress={() => navigation.navigate('Home') }>
          <Text style={styles.browseButtonText}>BROWSE MENU</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Cart ({cartItems.length} items)</Text>
      </View>

      <FlatList
        data={cartItems}
        renderItem={renderCartItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.cartList}
        showsVerticalScrollIndicator={false}
      />

      {/* Bill Details */}
      <View style={styles.billContainer}>
        <Text style={styles.billTitle}>BILL DETAILS</Text>
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Subtotal ({cartItems.reduce((acc, item) => acc + item.quantity, 0)} items)</Text>
          <Text style={styles.billValue}>{formatPriceDecimal(bill.subtotal)}</Text>
        </View>
        {bill.discount > 0 && (
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Discount</Text>
            <Text style={[styles.billValue, styles.discountText]}>-{formatPriceDecimal(bill.discount)}</Text>
          </View>
        )}
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Delivery Fee</Text>
          <Text style={[styles.billValue, bill.deliveryFee === 0 && styles.freeText]}>
            {bill.deliveryFee === 0 ? 'FREE' : formatPriceDecimal(bill.deliveryFee)}
          </Text>
        </View>
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Tax ({bill.taxPercentage}%)</Text>
          <Text style={styles.billValue}>{formatPriceDecimal(bill.tax)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.billRow}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalValue}>{formatPriceDecimal(bill.total)}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.checkoutButton} onPress={() => navigation.navigate('Checkout' as never) }>
          <Text style={styles.checkoutText}>PROCEED TO CHECKOUT - {formatPriceDecimal(bill.total)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.continueButton} onPress={() => navigation.navigate('Home' as never) }>
          <Text style={styles.continueText}>CONTINUE SHOPPING</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.horizontal, paddingTop: spacing.lg, paddingBottom: spacing.md },
  headerTitle: { fontSize: typography.sizes.h2, fontWeight: typography.weights.bold, color: colors.text_dark },
  cartList: { paddingHorizontal: spacing.horizontal },
  cartItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.sm, ...shadows.light },
  itemImage: { width: 60, height: 60, borderRadius: borderRadius.sm },
  itemInfo: { flex: 1, marginLeft: spacing.md },
  itemName: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text_dark },
  itemSize: { fontSize: typography.sizes.small, color: colors.text_medium, marginTop: 2 },
  itemPrice: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.primary, marginTop: 4 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.gray_100, borderRadius: borderRadius.sm },
  qtyButton: { padding: spacing.xs },
  quantity: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text_dark, minWidth: 24, textAlign: 'center' },
  removeButton: { marginLeft: spacing.sm, padding: spacing.xs },
  billContainer: { backgroundColor: colors.white, marginHorizontal: spacing.horizontal, padding: spacing.md, borderRadius: borderRadius.md, ...shadows.medium, marginBottom: spacing.sm },
  billTitle: { fontSize: typography.sizes.small, fontWeight: typography.weights.bold, color: colors.text_medium, marginBottom: spacing.sm },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  billLabel: { fontSize: typography.sizes.body, color: colors.text_dark },
  billValue: { fontSize: typography.sizes.body, color: colors.text_dark, fontWeight: typography.weights.medium },
  freeText: { color: colors.success },
  discountText: { color: colors.danger },
  divider: { height: 1, backgroundColor: colors.gray_200, marginVertical: spacing.sm },
  totalLabel: { fontSize: typography.sizes.h4, fontWeight: typography.weights.bold, color: colors.text_dark },
  totalValue: { fontSize: typography.sizes.h4, fontWeight: typography.weights.bold, color: colors.primary },
  footer: { paddingHorizontal: spacing.horizontal, paddingBottom: spacing.lg },
  checkoutButton: { backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', marginBottom: spacing.sm },
  checkoutText: { color: colors.white, fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
  continueButton: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.primary, paddingVertical: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },
  continueText: { color: colors.primary, fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  emptyTitle: { fontSize: typography.sizes.h3, fontWeight: typography.weights.bold, color: colors.text_dark, marginTop: spacing.lg },
  emptySubtitle: { fontSize: typography.sizes.body, color: colors.text_medium, marginTop: spacing.xs },
  browseButton: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.md, marginTop: spacing.lg },
  browseButtonText: { color: colors.white, fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
});
