import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { calculateBill } from '../../utils/cartHelpers';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../components/api/client';

const PAYMENT_METHODS = [
  { id: 'card', name: 'Credit/Debit Card', icon: 'card' },
  { id: 'cod', name: 'Cash on Delivery', icon: 'cash' },
];

export default function CheckoutScreen() {
  const navigation = useNavigation();
  const { cartItems, clearCart, validateCart } = useCart();
  const { deliveryFee, taxRate, formatPrice, refreshSettings } = useSettings();
  const insets = useSafeAreaInsets();
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [alternatePhoneNumber, setAlternatePhoneNumber] = useState('');

  const [address, setAddress] = useState<{ street: string; city: string; state?: string; zipCode?: string } | null>(null);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [addressDraft, setAddressDraft] = useState<{ street: string; city: string; state: string; zipCode: string }>({
    street: '',
    city: '',
    state: '',
    zipCode: '',
  });

  const itemCount = Array.isArray(cartItems)
    ? cartItems.reduce((sum: number, item: any) => sum + (typeof item?.quantity === 'number' ? item.quantity : 1), 0)
    : 0;

  const bill = calculateBill(cartItems as any, { deliveryFee, taxPercent: taxRate });

  React.useEffect(() => {
    refreshSettings?.();
    const loadAddress = async () => {
      try {
        const storedPhone = await AsyncStorage.getItem('user_phone_number');
        const storedAltPhone = await AsyncStorage.getItem('user_alternate_phone_number');
        if (typeof storedPhone === 'string') setPhoneNumber(storedPhone);
        if (typeof storedAltPhone === 'string') setAlternatePhoneNumber(storedAltPhone);

        const stored = await AsyncStorage.getItem('user_delivery_address');
        if (!stored) return;
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          setAddress({
            street: String(parsed.street || ''),
            city: String(parsed.city || ''),
            state: parsed.state ? String(parsed.state) : '',
            zipCode: parsed.zipCode ? String(parsed.zipCode) : '',
          });
        }
      } catch {
        // ignore
      }
    };
    loadAddress();
  }, [refreshSettings]);

  React.useEffect(() => {
    const save = async () => {
      try {
        await AsyncStorage.setItem('user_phone_number', phoneNumber);
        await AsyncStorage.setItem('user_alternate_phone_number', alternatePhoneNumber);
      } catch {
        // ignore
      }
    };
    save();
  }, [phoneNumber, alternatePhoneNumber]);

  const openAddressModal = () => {
    const current = address || { street: '', city: '', state: '', zipCode: '' };
    setAddressDraft({
      street: current.street || '',
      city: current.city || '',
      state: current.state || '',
      zipCode: current.zipCode || '',
    });
    setAddressModalVisible(true);
  };

  const saveAddressModal = async () => {
    if (!addressDraft.street.trim() || !addressDraft.city.trim()) {
      Alert.alert('Error', 'Please enter street and city');
      return;
    }
    const next = {
      street: addressDraft.street.trim(),
      city: addressDraft.city.trim(),
      state: addressDraft.state.trim(),
      zipCode: addressDraft.zipCode.trim(),
    };
    try {
      await AsyncStorage.setItem('user_delivery_address', JSON.stringify(next));
    } catch {
      // ignore
    }
    setAddress(next);
    setAddressModalVisible(false);
  };

  const handlePlaceOrder = async () => {
    if (!cartItems || cartItems.length === 0) {
      Alert.alert('Cart is empty', 'Please add items to your cart before placing an order.');
      return;
    }

    // Get selected branch - required by backend
    const restaurantId = await AsyncStorage.getItem('selectedBranchId');
    if (!restaurantId) {
      Alert.alert('Branch Required', 'Please select a restaurant branch first.');
      return;
    }

    setLoading(true);
    
    // Validate cart items against current menu BEFORE placing order
    try {
      const res = await api.get('/menu');
      const categories = res?.data?.data?.categories || res?.data?.categories || [];
      const validIds = new Set<string>();
      categories.forEach((cat: any) => {
        const products = cat.products || cat.items || [];
        products.forEach((p: any) => {
          const productId = p._id || p.id;
          if (productId) validIds.add(productId.toString().trim());
        });
      });

      // Collect deal IDs from active campaigns so deal items aren't treated as invalid
      const dealIds = new Set<string>();
      try {
        const campaignsRes = await api.get('/deals/campaigns/active');
        const campaigns = campaignsRes?.data?.data?.campaigns || campaignsRes?.data?.campaigns || [];
        (Array.isArray(campaigns) ? campaigns : []).forEach((c: any) => {
          const deals = Array.isArray(c?.deals) ? c.deals : [];
          deals.forEach((d: any) => {
            const dealId = d?._id || d?.id;
            if (dealId) dealIds.add(String(dealId).trim());
          });
        });
      } catch (e) {
        // ignore deal campaign failures
      }
      
      console.log('[CheckoutScreen] Valid IDs from menu:', Array.from(validIds));
      console.log('[CheckoutScreen] Cart item IDs:', cartItems.map(i => i._id));
      
      // Check if all cart items are valid
      const invalidItems = cartItems.filter(item => {
        const itemId = item._id?.toString().trim();
        const isValid = validIds.has(itemId) || dealIds.has(itemId);
        console.log('[CheckoutScreen] Checking item:', itemId, 'valid:', isValid);
        return !isValid;
      });

      if (invalidItems.length > 0) {
        console.log('[CheckoutScreen] Invalid items found:', invalidItems);
        clearCart?.();
        Alert.alert('Invalid Cart', 'Some items in your cart are no longer available. Your cart has been cleared. Please add items again.');
        setLoading(false);
        return;
      }
    } catch (e) {
      console.error('[CheckoutScreen] Cart validation error:', e);
    }
    try {
      const deliveryAddress = {
        street: address?.street || '123 Customer Address St',
        city: address?.city || 'Karachi',
        state: address?.state || 'Sindh',
        zipCode: address?.zipCode || '75300',
      };

      const payload = {
        restaurantId, // Backend expects restaurantId (not branchId)
        orderType: 'DELIVERY', // Backend expects uppercase: DELIVERY, DINE_IN, TAKEAWAY
        paymentMethod: paymentMethod === 'cod' ? 'cash' : paymentMethod,
        deliveryInstructions: instructions,
        specialInstructions: instructions,
        phoneNumber,
        alternatePhoneNumber,
        deliveryAddress,
        items: cartItems.map((ci: any) => {
          const menuItemId = ci._id || ci.product?._id || ci.productId || ci.menuItemId;
          console.log('[CheckoutScreen] Cart item:', { _id: ci._id, name: ci.name, menuItemId });
          return {
            menuItemId,
            quantity: ci.quantity || 1,
            customizations: ci.customizations || [],
          };
        }),
      };

      console.log('[CheckoutScreen] Placing order with payload:', JSON.stringify(payload, null, 2));

      const res = await api.post('/orders', payload);

      if (!res.success) {
        throw new Error(res.message || 'Failed to place order');
      }

      console.log('[CheckoutScreen] Order placed successfully:', res.data?.orderNumber || res.data?._id);

      clearCart?.();

      Alert.alert('Order Placed!', `Your order ${res.data?.orderNumber || ''} has been confirmed.`, [
        {
          text: 'View Orders',
          onPress: () => navigation.navigate('OrderHistory' as never),
        },
      ]);
    } catch (e: any) {
      console.error('[CheckoutScreen] Place order error:', e?.message || e, e?.response?.data || '');
      Alert.alert('Failed', e?.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text_dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 24 + insets.bottom + 90 }}
        >
          {/* Order Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryText}>{itemCount} items</Text>
              <Text style={styles.summaryPrice}>{formatPrice(bill.subtotal)}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact</Text>
            <TextInput
              style={styles.instructionsInput}
              placeholder="Phone Number"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              editable={!loading}
            />
            <View style={{ height: 12 }} />
            <TextInput
              style={styles.instructionsInput}
              placeholder="Alternative Phone Number"
              keyboardType="phone-pad"
              value={alternatePhoneNumber}
              onChangeText={setAlternatePhoneNumber}
              editable={!loading}
            />
          </View>

          {/* Delivery Address */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Delivery Address</Text>
              <TouchableOpacity onPress={openAddressModal}>
                <Text style={styles.changeText}>CHANGE</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.addressCard}>
              <Ionicons name="home" size={20} color={colors.primary} />
              <View style={styles.addressInfo}>
                <Text style={styles.addressLabel}>Home</Text>
                <Text style={styles.addressText}>
                  {address?.street ? address.street : '123 North Nazimabad'}{address?.city ? `, ${address.city}` : ', Karachi'}
                </Text>
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
                style={styles.paymentOption}
                onPress={() => setPaymentMethod(method.id)}
              >
                <View style={styles.paymentInfo}>
                  <Ionicons name={method.icon as any} size={20} color={colors.primary} />
                  <Text style={styles.paymentText}>{method.name}</Text>
                </View>
                <View style={[styles.radio, paymentMethod === method.id && styles.radioActive]} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Bill Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bill Details</Text>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Subtotal</Text>
              <Text style={styles.billValue}>{formatPrice(bill.subtotal)}</Text>
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Delivery Fee</Text>
              <Text style={styles.billValue}>{bill.deliveryFee === 0 ? 'FREE' : formatPrice(bill.deliveryFee)}</Text>
            </View>
            {bill.discount > 0 && (
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Discount</Text>
                <Text style={[styles.billValue, styles.discount]}>-{formatPrice(bill.discount)}</Text>
              </View>
            )}
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Tax ({bill.taxPercentage}%)</Text>
              <Text style={styles.billValue}>{formatPrice(bill.tax)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.billRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatPrice(bill.total)}</Text>
            </View>
          </View>
        </ScrollView>

        {/* Place Order Button */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity
            style={[styles.placeOrderButton, loading && styles.placeOrderButtonDisabled]}
            onPress={handlePlaceOrder}
            disabled={loading}
          >
            <Text style={styles.placeOrderText}>
              {loading ? 'Processing...' : `PLACE ORDER - ${formatPrice(bill.total)}`}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={addressModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddressModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.white, borderRadius: 12, padding: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text_dark, marginBottom: 12 }}>
              Delivery Address
            </Text>

            <TextInput
              value={addressDraft.street}
              onChangeText={(t) => setAddressDraft((p) => ({ ...p, street: t }))}
              placeholder="Street"
              style={[styles.instructionsInput, { marginBottom: 10 }]}
            />
            <TextInput
              value={addressDraft.city}
              onChangeText={(t) => setAddressDraft((p) => ({ ...p, city: t }))}
              placeholder="City"
              style={[styles.instructionsInput, { marginBottom: 10 }]}
            />
            <TextInput
              value={addressDraft.state}
              onChangeText={(t) => setAddressDraft((p) => ({ ...p, state: t }))}
              placeholder="State"
              style={[styles.instructionsInput, { marginBottom: 10 }]}
            />
            <TextInput
              value={addressDraft.zipCode}
              onChangeText={(t) => setAddressDraft((p) => ({ ...p, zipCode: t }))}
              placeholder="Zip Code"
              style={[styles.instructionsInput, { marginBottom: 16 }]}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity onPress={() => setAddressModalVisible(false)}>
                <Text style={{ color: colors.gray_600, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveAddressModal}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
  paymentInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
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
