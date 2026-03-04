import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { CardField, useConfirmPayment, StripeProvider } from '@stripe/stripe-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../../context/SettingsContext';
import { createPaymentIntent, confirmPayment, markCashPayment } from '../../services/paymentService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  primary: '#FF6B35',
  success: '#2ECC71',
  info: '#3498DB',
  warning: '#F39C12',
  danger: '#E74C3C',
  darkText: '#2C3E50',
  lightBg: '#F5F5F5',
  white: '#FFFFFF',
  gray: '#95A5A6',
  lightGray: '#ECEFF1',
};

interface Order {
  _id: string;
  orderNumber: string;
  totalAmount: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  deliveryFee?: number;
}

interface PaymentScreenProps {
  order: Order;
  onPaymentSuccess: () => void;
  onCancel: () => void;
}

const PaymentScreen: React.FC<PaymentScreenProps> = ({
  order,
  onPaymentSuccess,
  onCancel,
}) => {
  const { formatPrice, currencySymbol } = useSettings();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');
  const [cardComplete, setCardComplete] = useState(false);
  const { confirmPayment: stripeConfirmPayment } = useConfirmPayment();

  const total = order.totalAmount + (order.deliveryFee || 0);

  // HANDLE CARD PAYMENT
  const handleCardPayment = async () => {
    try {
      setLoading(true);

      console.log('[Payment] Processing card payment for:', order._id);

      // STEP 1: Create payment intent
      const intentResult = await createPaymentIntent(order._id, total);

      if (!intentResult.success || !intentResult.clientSecret) {
        Alert.alert('Error', intentResult.error || 'Failed to create payment intent');
        setLoading(false);
        return;
      }

      // STEP 2: Confirm payment with Stripe
      const { paymentIntent, error } = await stripeConfirmPayment(
        intentResult.clientSecret,
        {
          paymentMethodType: 'Card',
        }
      );

      if (error) {
        Alert.alert('Payment Failed', error.localizedMessage || 'Payment was not successful');
        setLoading(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'Succeeded') {
        // STEP 3: Confirm payment on backend
        const confirmResult = await confirmPayment(
          order._id,
          intentResult.intentId || '',
          'card',
          total
        );

        if (confirmResult.success) {
          Alert.alert('Success', 'Payment completed successfully!', [
            { text: 'OK', onPress: onPaymentSuccess }
          ]);
        } else {
          Alert.alert('Error', confirmResult.error || 'Failed to confirm payment');
        }
      } else {
        Alert.alert('Payment Pending', 'Your payment is being processed');
      }

    } catch (error: any) {
      console.error('[Payment] Card payment error:', error);
      Alert.alert('Error', 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // HANDLE CASH PAYMENT
  const handleCashPayment = async () => {
    try {
      setLoading(true);

      const result = await markCashPayment(order._id, total);

      if (result.success) {
        Alert.alert(
          'Order Confirmed',
          `Pay ${currencySymbol}${total.toFixed(2)} to the rider when they arrive.`,
          [{ text: 'OK', onPress: onPaymentSuccess }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to confirm order');
      }

    } catch (error: any) {
      console.error('[Payment] Cash payment error:', error);
      Alert.alert('Error', 'Failed to confirm order');
    } finally {
      setLoading(false);
    }
  };

  // HANDLE PAY BUTTON
  const handlePay = () => {
    if (paymentMethod === 'card') {
      if (!cardComplete) {
        Alert.alert('Incomplete', 'Please complete card details');
        return;
      }
      handleCardPayment();
    } else {
      handleCashPayment();
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ORDER SUMMARY */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Summary</Text>
          <Text style={styles.orderNumber}>#{order.orderNumber}</Text>

          {/* ITEMS */}
          {order.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.itemName}>
                {item.name} ×{item.quantity}
              </Text>
              <Text style={styles.itemPrice}>
                {currencySymbol}{(item.price * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}

          {/* DIVIDER */}
          <View style={styles.divider} />

          {/* SUBTOTAL */}
          <View style={styles.itemRow}>
            <Text style={styles.label}>Subtotal</Text>
            <Text style={styles.value}>{currencySymbol}{order.totalAmount.toFixed(2)}</Text>
          </View>

          {/* DELIVERY FEE */}
          {order.deliveryFee && order.deliveryFee > 0 && (
            <View style={styles.itemRow}>
              <Text style={styles.label}>Delivery Fee</Text>
              <Text style={styles.value}>{currencySymbol}{order.deliveryFee.toFixed(2)}</Text>
            </View>
          )}

          {/* TOTAL */}
          <View style={[styles.itemRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{currencySymbol}{total.toFixed(2)}</Text>
          </View>
        </View>

        {/* PAYMENT METHOD SELECTION */}
        <Text style={styles.sectionTitle}>Payment Method</Text>

        {/* CARD PAYMENT */}
        <TouchableOpacity
          onPress={() => setPaymentMethod('card')}
          style={[
            styles.paymentOption,
            paymentMethod === 'card' && styles.paymentOptionActive,
          ]}
        >
          <View style={styles.paymentOptionHeader}>
            <View style={styles.paymentOptionLeft}>
              <Ionicons name="card" size={24} color={COLORS.primary} />
              <Text style={styles.paymentOptionTitle}>💳 Card Payment</Text>
            </View>
            <View
              style={[
                styles.radioButton,
                paymentMethod === 'card' && styles.radioButtonActive,
              ]}
            />
          </View>

          {paymentMethod === 'card' && (
            <View style={styles.cardFieldContainer}>
              <CardField
                postalCodeEnabled={false}
                placeholders={{
                  number: '4242 4242 4242 4242',
                  expiration: 'MM/YY',
                  cvc: 'CVC',
                }}
                cardStyle={{
                  backgroundColor: COLORS.lightBg,
                  textColor: COLORS.darkText,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: COLORS.lightGray,
                }}
                style={styles.cardField}
                onCardChange={(cardDetails) => {
                  setCardComplete(cardDetails.complete);
                }}
              />
              <Text style={styles.hint}>
                Test card: 4242 4242 4242 4242
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* CASH PAYMENT */}
        <TouchableOpacity
          onPress={() => setPaymentMethod('cash')}
          style={[
            styles.paymentOption,
            paymentMethod === 'cash' && styles.paymentOptionActive,
          ]}
        >
          <View style={styles.paymentOptionHeader}>
            <View style={styles.paymentOptionLeft}>
              <Ionicons name="cash" size={24} color={COLORS.success} />
              <Text style={styles.paymentOptionTitle}>💵 Cash on Delivery</Text>
            </View>
            <View
              style={[
                styles.radioButton,
                paymentMethod === 'cash' && styles.radioButtonActive,
              ]}
            />
          </View>

          {paymentMethod === 'cash' && (
            <Text style={styles.cashHint}>
              Pay the rider when your order arrives
            </Text>
          )}
        </TouchableOpacity>

        {/* SECURITY NOTE */}
        <View style={styles.securityNote}>
          <Ionicons name="shield-checkmark" size={20} color={COLORS.success} />
          <Text style={styles.securityText}>
            Your payment is secure and encrypted
          </Text>
        </View>
      </ScrollView>

      {/* PAY BUTTON */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handlePay}
          disabled={loading}
          style={[styles.payButton, loading && styles.payButtonDisabled]}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Text style={styles.payButtonText}>
                {paymentMethod === 'card' ? `Pay ${currencySymbol}${total.toFixed(2)}` : 'Confirm Order'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkText,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  itemName: {
    fontSize: 14,
    color: COLORS.darkText,
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkText,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    color: COLORS.gray,
  },
  value: {
    fontSize: 14,
    color: COLORS.darkText,
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: COLORS.lightGray,
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.darkText,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginBottom: 12,
  },
  paymentOption: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
  },
  paymentOptionActive: {
    borderColor: COLORS.primary,
  },
  paymentOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkText,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.gray,
  },
  radioButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  cardFieldContainer: {
    marginTop: 16,
  },
  cardField: {
    height: 50,
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
  },
  cashHint: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 12,
    textAlign: 'center',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 16,
  },
  securityText: {
    fontSize: 14,
    color: COLORS.success,
  },
  footer: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  payButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payButtonDisabled: {
    backgroundColor: COLORS.gray,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});

// Wrap with StripeProvider when using
export default PaymentScreen;
