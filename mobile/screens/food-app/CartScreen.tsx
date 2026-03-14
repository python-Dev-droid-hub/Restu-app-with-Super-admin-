import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Alert,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { useFormatPrice } from '../../utils/formatHelpers';
import { calculateBill } from '../../utils/cartHelpers';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import api from '../../services/api';

export default function CartScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { cartItems, updateQuantity, removeFromCart, getCartCount } = useCart();
  const { taxRate, formatPrice, deliveryFee, refreshSettings } = useSettings();
  const formatPriceDynamic = useFormatPrice();

  useFocusEffect(
    React.useCallback(() => {
      refreshSettings();
    }, [refreshSettings])
  );

  const getFullImageUrl = (url?: string) => {
    if (!url) return '';
    const normalized = url.replace(/\\/g, '/');
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
    const base = String((api as any)?.defaults?.baseURL || '').replace(/\/?api\/?$/, '');
    if (normalized.startsWith('/')) return `${base}${normalized}`;
    if (base) return `${base}/${normalized}`;
    return normalized;
  };

  const bill = useMemo(() => {
    // Use realtime tax rate and delivery fee from branch settings
    const calculated = calculateBill(cartItems, { deliveryFee, taxPercent: taxRate });
    return calculated;
  }, [cartItems, taxRate, deliveryFee]);

  const handleUpdateQuantity = (id: string, change: number) => {
    const item = cartItems.find(i => i._id === id);
    if (item) {
      const newQty = Math.max(1, item.quantity + change);
      updateQuantity(id, newQty);
    }
  };

  const handleRemoveItem = (id: string) => {
    Alert.alert('Remove Item', 'Are you sure you want to remove this item?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', onPress: () => removeFromCart(id), style: 'destructive' },
    ]);
  };

  const renderCartItem = ({ item }: { item: typeof cartItems[0] }) => (
    <View style={styles.cartItem}>
      <Image
        source={{ uri: getFullImageUrl(item.image) || 'https://via.placeholder.com/100' }}
        style={styles.itemImage}
      />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        {!!item.size && <Text style={styles.itemSize}>{item.size}</Text>}
        <Text style={styles.itemPrice}>{formatPriceDynamic(item.price * item.quantity)}</Text>
      </View>
      <View style={styles.quantityControls}>
        <TouchableOpacity onPress={() => handleUpdateQuantity(item._id, -1)} style={styles.qtyButton}>
          <Ionicons name="remove" size={16} color={colors.text_dark} />
        </TouchableOpacity>
        <Text style={styles.quantity}>{item.quantity}</Text>
        <TouchableOpacity onPress={() => handleUpdateQuantity(item._id, 1)} style={styles.qtyButton}>
          <Ionicons name="add" size={16} color={colors.text_dark} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => handleRemoveItem(item._id)} style={styles.removeButton}>
        <Ionicons name="trash-outline" size={20} color={colors.danger} />
      </TouchableOpacity>
    </View>
  );

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Cart</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color={colors.gray_300} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>Add items to get started</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => (navigation as any).navigate('MainTabs', { screen: 'Home' })}
          >
            <Text style={styles.browseButtonText}>BROWSE MENU</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Cart ({getCartCount()} items)</Text>
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
          <Text style={styles.billLabel}>Subtotal ({getCartCount()} items)</Text>
          <Text style={styles.billValue}>{formatPriceDynamic(bill.subtotal)}</Text>
        </View>
        {bill.discount > 0 && (
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Discount</Text>
            <Text style={[styles.billValue, styles.discountText]}>-{formatPriceDynamic(bill.discount)}</Text>
          </View>
        )}
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Delivery Fee</Text>
          <Text style={[styles.billValue, bill.deliveryFee === 0 && styles.freeText]}>
            {bill.deliveryFee === 0 ? 'FREE' : formatPriceDynamic(bill.deliveryFee)}
          </Text>
        </View>
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Tax ({bill.taxPercentage}%)</Text>
          <Text style={styles.billValue}>{formatPriceDynamic(bill.tax)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.billRow}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalValue}>{formatPriceDynamic(bill.total)}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.checkoutButton} onPress={() => navigation.navigate('Checkout' as never) }>
          <Text style={styles.checkoutText}>PROCEED TO CHECKOUT - {formatPriceDynamic(bill.total)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.continueButton} onPress={() => (navigation as any).navigate('MainTabs', { screen: 'Home' }) }>
          <Text style={styles.continueText}>CONTINUE SHOPPING</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
