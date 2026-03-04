import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { formatPriceDecimal } from '../../utils/formatHelpers';

const PAYMENT_METHODS = [
  { id: 'card', name: 'Credit/Debit Card', icon: 'card' },
  { id: 'cod', name: 'Cash on Delivery', icon: 'cash' },
];

export default function CheckoutScreen() {
  const navigation = useNavigation();
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);

  const orderSummary = {
    items: 3,
    subtotal: 690,
    deliveryFee: 50,
    discount: 69,
    tax: 34.5,
    total: 705.5,
  };

  const handlePlaceOrder = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Order Placed!', 'Your order #12345 has been confirmed.', [
        { text: 'Track Order', onPress: () => navigation.navigate('OrderTracking' as never) },
      ]);
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text_dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>{orderSummary.items} items</Text>
            <Text style={styles.summaryPrice}>{formatPriceDecimal(orderSummary.subtotal)}</Text>
          </View>
        </View>

        {/* Delivery Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <TouchableOpacity>
              <Text style={styles.changeText}>CHANGE</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.addressCard}>
            <Ionicons name="home" size={20} color={colors.primary} />
            <View style={styles.addressInfo}>
              <Text style={styles.addressLabel}>Home</Text>
              <Text style={styles.addressText}>123 North Nazimabad, Karachi, Pakistan</Text>
            </View>
          </View>
        </View>

        {/* Delivery Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Instructions</Text>
          <TextInput
            style={styles.instructionsInput}
            placeholder="Any special instructions for delivery?"
            value={instructions}
            onChangeText={setInstructions}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[styles.paymentOption, paymentMethod === method.id && styles.paymentOptionActive]}
              onPress={() => setPaymentMethod(method.id)}
            >
              <Ionicons
                name={method.icon as any}
                size={24}
                color={paymentMethod === method.id ? colors.primary : colors.gray_500}
              />
              <Text style={[styles.paymentText, paymentMethod === method.id && styles.paymentTextActive]}>
                {method.name}
              </Text>
              <View style={[styles.radio, paymentMethod === method.id && styles.radioActive]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Bill Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill Details</Text>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Subtotal</Text>
            <Text style={styles.billValue}>{formatPriceDecimal(orderSummary.subtotal)}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Delivery Fee</Text>
            <Text style={styles.billValue}>{formatPriceDecimal(orderSummary.deliveryFee)}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Discount</Text>
            <Text style={[styles.billValue, styles.discount]}>-{formatPriceDecimal(orderSummary.discount)}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Tax (5%)</Text>
            <Text style={styles.billValue}>{formatPriceDecimal(orderSummary.tax)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.billRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPriceDecimal(orderSummary.total)}</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.placeOrderButton, loading && styles.placeOrderButtonDisabled]}
          onPress={handlePlaceOrder}
          disabled={loading}
        >
          <Text style={styles.placeOrderText}>
            {loading ? 'Processing...' : `PLACE ORDER - ${formatPriceDecimal(orderSummary.total)}`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.white },
  headerTitle: { fontSize: typography.sizes.h3, fontWeight: typography.weights.bold, color: colors.text_dark },
  section: { backgroundColor: colors.white, marginTop: spacing.sm, padding: spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle: { fontSize: typography.sizes.h4, fontWeight: typography.weights.bold, color: colors.text_dark, marginBottom: spacing.md },
  changeText: { fontSize: typography.sizes.small, color: colors.primary, fontWeight: typography.weights.bold },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryText: { fontSize: typography.sizes.body, color: colors.text_medium },
  summaryPrice: { fontSize: typography.sizes.h4, fontWeight: typography.weights.bold, color: colors.primary },
  addressCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.gray_50, padding: spacing.md, borderRadius: borderRadius.md },
  addressInfo: { marginLeft: spacing.md, flex: 1 },
  addressLabel: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text_dark },
  addressText: { fontSize: typography.sizes.small, color: colors.text_medium, marginTop: 2 },
  instructionsInput: { borderWidth: 1, borderColor: colors.gray_300, borderRadius: borderRadius.md, padding: spacing.md, fontSize: typography.sizes.body, color: colors.text_dark, textAlignVertical: 'top', minHeight: 80 },
  paymentOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray_100 },
  paymentOptionActive: { },
  paymentText: { flex: 1, marginLeft: spacing.md, fontSize: typography.sizes.body, color: colors.text_dark },
  paymentTextActive: { fontWeight: typography.weights.medium },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.gray_400 },
  radioActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  billLabel: { fontSize: typography.sizes.body, color: colors.text_medium },
  billValue: { fontSize: typography.sizes.body, color: colors.text_dark, fontWeight: typography.weights.medium },
  discount: { color: colors.danger },
  divider: { height: 1, backgroundColor: colors.gray_200, marginVertical: spacing.sm },
  totalLabel: { fontSize: typography.sizes.h4, fontWeight: typography.weights.bold, color: colors.text_dark },
  totalValue: { fontSize: typography.sizes.h4, fontWeight: typography.weights.bold, color: colors.primary },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.white, padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.gray_200 },
  placeOrderButton: { backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },
  placeOrderButtonDisabled: { opacity: 0.7 },
  placeOrderText: { color: colors.white, fontSize: typography.sizes.h4, fontWeight: typography.weights.bold },
});
