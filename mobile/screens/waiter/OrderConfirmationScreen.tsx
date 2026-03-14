import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../components/api/client';
import { useSettings } from '../../context/SettingsContext';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

const COLORS = {
  primary: '#FF7A59',
  primaryLight: '#FFF0EB',
  background: '#F8F9FA',
  white: '#FFFFFF',
  text: '#1A1A2E',
  textMuted: '#8E8E93',
  border: '#E8E8E8',
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
};

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  specialInstructions?: string;
  customizations?: Array<{
    optionName: string;
    optionValue: string;
    extraPrice: number;
  }>;
}

interface Order {
  id: string;
  _id: string;
  orderNumber: string;
  status: string;
  orderType: string;
  tableNumber?: string;
  items: OrderItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  waiterName?: string;
  specialInstructions?: string;
}

export default function OrderConfirmationScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { formatPrice, currencySymbol, taxRate } = useSettings();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const orderId = route.params?.orderId;

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/orders/${orderId}`);
      if (response.success && response.data) {
        const data = response.data;
        setOrder({
          id: data._id || data.id,
          _id: data._id,
          orderNumber: data.orderNumber || `ORD-${data._id?.slice(-6).toUpperCase()}`,
          status: data.status || 'PENDING',
          orderType: data.orderType || 'DINE_IN',
          tableNumber: data.table?.tableNumber || data.tableNumber,
          items: (data.items || []).map((item: any) => ({
            id: item._id || item.id,
            productId: item.product?._id || item.productId,
            productName: item.productName || item.product?.name || 'Item',
            productImage: item.product?.imageUrl || item.productImage,
            unitPrice: item.unitPrice || item.price || 0,
            quantity: item.quantity || 1,
            totalPrice: item.totalPrice || (item.unitPrice * item.quantity),
            specialInstructions: item.specialInstructions,
            customizations: item.customizations || [],
          })),
          subtotal: data.subtotal || 0,
          taxAmount: data.taxAmount || 0,
          discountAmount: data.discountAmount || 0,
          totalAmount: data.totalAmount || data.total || 0,
          paymentStatus: data.paymentStatus || 'PENDING',
          paymentMethod: data.paymentMethod || 'cash',
          createdAt: data.createdAt,
          waiterName: data.waiter?.displayName || data.waiterName,
          specialInstructions: data.specialInstructions,
        });
      }
    } catch (error) {
      console.error('Error loading order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!order) return;

    try {
      const itemsText = order.items
        .map(item => `  • ${item.quantity}x ${item.productName} - ${currencySymbol}${item.totalPrice.toFixed(2)}`)
        .join('\n');

      const message = `
🍽️ ORDER CONFIRMED
━━━━━━━━━━━━━━━━━━
Order #: ${order.orderNumber}
Table: ${order.tableNumber || 'N/A'}
Date: ${new Date(order.createdAt).toLocaleString()}

ITEMS:
${itemsText}

━━━━━━━━━━━━━━━━━━
Subtotal: ${currencySymbol}${order.subtotal.toFixed(2)}
Tax (${taxRate}%): ${currencySymbol}${order.taxAmount.toFixed(2)}
${order.discountAmount > 0 ? `Discount: -${currencySymbol}${order.discountAmount.toFixed(2)}\n` : ''}
TOTAL: ${currencySymbol}${order.totalAmount.toFixed(2)}
━━━━━━━━━━━━━━━━━━
Payment: ${order.paymentMethod.toUpperCase()}
Status: ${order.paymentStatus}

Thank you for dining with us!
      `.trim();

      await Share.share({
        message,
        title: `Order #${order.orderNumber}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleNewOrder = () => {
    navigation.navigate('WaiterOrderScreen' as never);
  };

  const handleViewOrders = () => {
    navigation.goBack();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
      case 'PREPARING':
        return COLORS.warning;
      case 'READY':
        return COLORS.success;
      case 'COMPLETED':
      case 'DELIVERED':
        return COLORS.success;
      case 'CANCELLED':
        return COLORS.danger;
      default:
        return COLORS.textMuted;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
      case 'PREPARING':
        return 'time-outline';
      case 'READY':
        return 'checkmark-circle-outline';
      case 'COMPLETED':
      case 'DELIVERED':
        return 'checkmark-done-circle-outline';
      case 'CANCELLED':
        return 'close-circle-outline';
      default:
        return 'receipt-outline';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={COLORS.danger} />
        <Text style={styles.errorText}>Order not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Success Header */}
        <View style={styles.successHeader}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
          </View>
          <Text style={styles.successTitle}>Order Confirmed!</Text>
          <Text style={styles.successSubtitle}>
            Order has been sent to kitchen
          </Text>
        </View>

        {/* Order Info Card */}
        <View style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <View>
              <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
              <Text style={styles.orderDate}>
                {new Date(order.createdAt).toLocaleString()}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
              <Ionicons name={getStatusIcon(order.status) as any} size={16} color={getStatusColor(order.status)} />
              <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                {order.status}
              </Text>
            </View>
          </View>

          {/* Table & Waiter Info */}
          <View style={styles.orderMeta}>
            {order.tableNumber && (
              <View style={styles.metaItem}>
                <Ionicons name="restaurant" size={18} color={COLORS.primary} />
                <Text style={styles.metaText}>Table #{order.tableNumber}</Text>
              </View>
            )}
            {order.waiterName && (
              <View style={styles.metaItem}>
                <Ionicons name="person" size={18} color={COLORS.primary} />
                <Text style={styles.metaText}>Waiter: {order.waiterName}</Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <Ionicons name="card" size={18} color={COLORS.primary} />
              <Text style={styles.metaText}>
                {order.paymentMethod.toUpperCase()} • {order.paymentStatus}
              </Text>
            </View>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.itemsCard}>
          <Text style={styles.itemsTitle}>Order Items</Text>
          
          {order.items.map((item, index) => (
            <View key={item.id || index} style={styles.itemRow}>
              <View style={styles.itemLeft}>
                {item.productImage ? (
                  <Image 
                    source={{ uri: item.productImage.startsWith('http') ? item.productImage : `${api.getBaseURL()}${item.productImage}` }}
                    style={styles.itemImage}
                  />
                ) : (
                  <View style={styles.itemImagePlaceholder}>
                    <Ionicons name="restaurant" size={20} color={COLORS.primary} />
                  </View>
                )}
                
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.productName}</Text>
                  
                  {item.customizations && item.customizations.length > 0 && (
                    <View style={styles.customizations}>
                      {item.customizations.map((cust, i) => (
                        <Text key={i} style={styles.customizationText}>
                          {cust.optionValue} {cust.extraPrice > 0 && `(+${currencySymbol}${cust.extraPrice.toFixed(2)})`}
                        </Text>
                      ))}
                    </View>
                  )}
                  
                  {item.specialInstructions && (
                    <Text style={styles.itemNote}>📝 {item.specialInstructions}</Text>
                  )}
                  
                  <Text style={styles.itemQty}>
                    {item.quantity} × {currencySymbol}{item.unitPrice.toFixed(2)}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.itemTotal}>{currencySymbol}{item.totalPrice.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Invoice Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{currencySymbol}{order.subtotal.toFixed(2)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax ({taxRate}%)</Text>
            <Text style={styles.summaryValue}>{currencySymbol}{order.taxAmount.toFixed(2)}</Text>
          </View>
          
          {order.discountAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, styles.discountLabel]}>Discount</Text>
              <Text style={[styles.summaryValue, styles.discountValue]}>
                -{currencySymbol}{order.discountAmount.toFixed(2)}
              </Text>
            </View>
          )}
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{currencySymbol}{order.totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Special Instructions */}
        {order.specialInstructions && (
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>Special Instructions</Text>
            <Text style={styles.instructionsText}>{order.specialInstructions}</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={20} color={COLORS.primary} />
          <Text style={styles.shareBtnText}>Share</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.newOrderBtn} onPress={handleNewOrder}>
          <Ionicons name="add-circle" size={20} color={COLORS.white} />
          <Text style={styles.newOrderBtnText}>New Order</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.viewOrdersBtn} onPress={handleViewOrders}>
          <Ionicons name="list" size={20} color={COLORS.text} />
          <Text style={styles.viewOrdersBtnText}>Orders</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 24,
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  successHeader: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  orderDate: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderMeta: {
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    color: COLORS.text,
  },
  itemsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  itemLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: COLORS.border,
  },
  itemImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  customizations: {
    marginBottom: 4,
  },
  customizationText: {
    fontSize: 12,
    color: COLORS.primary,
  },
  itemNote: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  itemQty: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  discountLabel: {
    color: COLORS.success,
  },
  discountValue: {
    color: COLORS.success,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    marginHorizontal: -16,
    marginBottom: -16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  instructionsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  bottomActions: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 8,
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  newOrderBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    gap: 8,
  },
  newOrderBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  viewOrdersBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  viewOrdersBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
});
