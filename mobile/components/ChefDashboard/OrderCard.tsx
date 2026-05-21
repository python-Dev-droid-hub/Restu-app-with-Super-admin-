import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, useWindowDimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { resolveImageUrl } from '../../utils/resolveImageUrl';
import { ORDER_CARD_COLORS } from '../orders/OrderCardStyles';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'picked_up' | 'served';

interface OrderCardItem {
  _id?: string;
  id?: string;
  product?: {
    _id?: string;
    name?: string;
    image?: string;
    imageUrl?: string;
    description?: string;
  };
  name?: string;
  productName?: string;
  quantity: number;
  specialInstructions?: string;
  status?: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED';
}

export interface ChefOrderCardOrder {
  id?: string;
  _id?: string;
  orderNumber: string;
  status: OrderStatus | 'PENDING' | 'PREPARING' | 'COOKING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  orderType: string;
  tableNumber?: string;
  table?: string;
  waiterName?: string;
  addressLine?: string;
  items: OrderCardItem[];
  createdAt: string;
  expectedReadyTime?: number;
  specialInstructions?: string;
  totalAmount?: number;
  paymentMethod?: string;
}

interface OrderCardProps {
  order: ChefOrderCardOrder;
  onStatusChange: (orderId: string, status: OrderStatus) => Promise<void> | void;
  onItemStatusChange?: (orderId: string, itemId: string, status: 'PREPARING' | 'READY' | 'SERVED' | 'RETURNED', reason?: string) => Promise<void> | void;
  role?: 'CHEF' | 'WAITER' | 'MANAGER' | 'ADMIN' | 'SUPER_ADMIN' | 'RIDER' | string;
  showPayment?: boolean;
  showActions?: boolean;
  allowedActions?: OrderStatus[];
  highlight?: boolean;
}

function formatRelativeTime(iso?: string): string {
  if (!iso) return '';
  const created = new Date(iso).getTime();
  if (Number.isNaN(created)) return '';
  const mins = Math.max(0, Math.floor((Date.now() - created) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

function formatExactTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

function ProductImage({ uri, size = 56 }: { uri: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(Boolean(uri));

  if (!uri || failed) {
    return (
      <View style={[styles.itemImagePlaceholder, { width: size, height: size }]}>
        <Ionicons name="restaurant-outline" size={22} color={COLORS.secondary} />
      </View>
    );
  }

  return (
    <View style={{ marginRight: 12 }}>
      <Image
        source={{ uri }}
        style={[styles.itemImage, { width: size, height: size }]}
        resizeMode="cover"
        onLoad={() => setLoading(false)}
        onError={() => {
          setFailed(true);
          setLoading(false);
        }}
      />
      {loading ? (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            styles.itemImage,
            { width: size, height: size, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.lightBackground },
          ]}
        >
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      ) : null}
    </View>
  );
}

const COLORS = {
  white: '#FFFFFF',
  darkText: '#1A1A2E',
  secondary: '#8E8E93',
  lightBorder: '#E5E5EA',
  lightBackground: '#F8F9FA',
  danger: '#E74C3C',
  warning: '#FF6B35',
  primary: '#3498DB',
  success: '#2ECC71',
};

const getStatusColor = (status: OrderStatus) => {
  switch (status) {
    case 'pending':
      return COLORS.danger;
    case 'confirmed':
      return COLORS.warning;
    case 'preparing':
      return COLORS.warning;
    case 'ready':
      return COLORS.success;
    case 'out_for_delivery':
      return COLORS.primary;
    case 'delivered':
      return COLORS.success;
    case 'cancelled':
      return COLORS.danger;
    case 'picked_up':
      return COLORS.primary;
    case 'served':
      return COLORS.success;
    default:
      return COLORS.secondary;
  }
};

export default function OrderCard({ 
  order, 
  onStatusChange, 
  onItemStatusChange,
  role = 'CHEF',
  showPayment = false,
  showActions = true,
  allowedActions,
  highlight = false,
}: OrderCardProps) {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;

  const [loadingStatus, setLoadingStatus] = useState<OrderStatus | null>(null);
  const [loadingItemStatus, setLoadingItemStatus] = useState<string | null>(null); // Track which item is loading

  const orderId = order.id || order._id || '';
  
  // Determine allowed actions based on role if not explicitly provided
  const getDefaultAllowedActions = (): OrderStatus[] => {
    switch (role?.toUpperCase()) {
      case 'CHEF':
      case 'KITCHEN':
      case 'COOK':
        return ['preparing', 'ready']; // Chef can only start preparing and mark ready
      case 'WAITER':
        return ['ready', 'served', 'picked_up', 'cancelled'];
      case 'MANAGER':
      case 'ADMIN':
      case 'SUPER_ADMIN':
        // Manager/Admin can manage order flow but NOT kitchen actions
        return ['pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled'];
      case 'RIDER':
        return ['out_for_delivery', 'delivered'];
      default:
        return ['preparing', 'ready'];
    }
  };
  
  const effectiveAllowedActions = allowedActions || getDefaultAllowedActions();
  
  // Check if an action is allowed
  const isActionAllowed = (action: OrderStatus): boolean => {
    return effectiveAllowedActions.includes(action);
  };

  const elapsedMinutes = useMemo(() => {
    if (!order.createdAt) return 0;
    const created = new Date(order.createdAt).getTime();
    if (isNaN(created)) return 0;
    const diff = Date.now() - created;
    return Math.max(0, Math.floor(diff / 60000));
  }, [order.createdAt]);

  const urgencyColor = useMemo(() => {
    if (elapsedMinutes > 30) return COLORS.danger;
    if (elapsedMinutes > 20) return COLORS.warning;
    return COLORS.success;
  }, [elapsedMinutes]);

  const statusColor = getStatusColor(order.status as any);

  const padding = isSmallScreen ? 12 : 16;
  const gap = isSmallScreen ? 8 : 12;

  const safeItems = Array.isArray(order.items) ? order.items : [];
  const displayItems = role === 'CHEF' ? safeItems.filter((item: any) => item?.status !== 'SERVED') : safeItems;

  const handle = async (next: OrderStatus) => {
    if (!orderId) return;
    try {
      setLoadingStatus(next);
      await onStatusChange(orderId, next);
    } finally {
      setLoadingStatus(null);
    }
  };

  const statusUpper = String(order.status || 'PENDING').toUpperCase();
  const statusBadgeColor =
    statusUpper === 'READY'
      ? ORDER_CARD_COLORS.success
      : statusUpper === 'PREPARING'
        ? ORDER_CARD_COLORS.preparing
        : statusUpper === 'PENDING'
          ? ORDER_CARD_COLORS.danger
          : statusColor;

  // Handle item status change
  const handleItemStatus = async (itemId: string, status: 'PREPARING' | 'READY' | 'SERVED' | 'RETURNED') => {
    if (!onItemStatusChange) return;
    try {
      setLoadingItemStatus(itemId);
      await onItemStatusChange(orderId, itemId, status);
    } catch (error) {
      console.log('[OrderCard] handleItemStatus error:', error);
    } finally {
      setLoadingItemStatus(null);
    }
  };

  // Get item status color
  const getItemStatusColor = (status?: string) => {
    switch (status) {
      case 'PENDING': return COLORS.danger;
      case 'PREPARING': return COLORS.warning;
      case 'READY': return COLORS.primary;
      case 'SERVED': return COLORS.success;
      case 'RETURNED': return '#8E8E93'; // Gray for returned items
      default: return COLORS.secondary;
    }
  };

  const itemCount = safeItems.length;
  const relativePlaced = formatRelativeTime(order.createdAt);

  return (
    <View
      style={[
        styles.card,
        { padding, borderLeftColor: statusBadgeColor },
        highlight && { backgroundColor: ORDER_CARD_COLORS.highlight },
      ]}
    >
      <View style={[styles.headerRow, { marginBottom: gap }]}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <Text style={[styles.orderNumber, { fontSize: isSmallScreen ? 15 : 16 }]}>
              #{order.orderNumber}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusBadgeColor }]}>
              <Text style={[styles.statusText, { color: '#FFF' }]}>{statusUpper}</Text>
            </View>
          </View>

          {relativePlaced ? (
            <Text style={[styles.subText, { marginTop: 4 }]}>
              {relativePlaced} · {formatExactTime(order.createdAt)}
            </Text>
          ) : null}

          {String(order.orderType).toUpperCase() === 'DINE_IN' ? (
            <View style={[styles.tableBadge, { marginTop: 6 }]}>
              <Text style={styles.tableBadgeText}>Table {order.tableNumber || order.table || '—'}</Text>
            </View>
          ) : (order as ChefOrderCardOrder).addressLine ? (
            <Text style={[styles.subText, { marginTop: 4 }]} numberOfLines={2}>
              {(order as ChefOrderCardOrder).addressLine}
            </Text>
          ) : (
            <Text style={[styles.subText, { marginTop: 4 }]}>{String(order.orderType).toUpperCase()}</Text>
          )}

          {(order as ChefOrderCardOrder).waiterName ? (
            <View style={[styles.waiterBadge, { marginTop: 6 }]}>
              <Ionicons name="person-outline" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
              <Text style={styles.waiterBadgeText}>{(order as ChefOrderCardOrder).waiterName}</Text>
            </View>
          ) : null}

          <Text style={[styles.subText, { marginTop: 2 }]}>
            {itemCount} item{itemCount === 1 ? '' : 's'}
            {(order as any).totalAmount != null ? ` · ₨${Number((order as any).totalAmount).toFixed(0)}` : ''}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.elapsedText, { color: urgencyColor }]}>{elapsedMinutes}m</Text>
          {elapsedMinutes > 20 && (
            <View style={[styles.urgencyPill, { backgroundColor: `${urgencyColor}20` }]}>
              <Text style={[styles.urgencyText, { color: urgencyColor }]}>{elapsedMinutes > 30 ? 'URGENT' : 'SOON'}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Rejection Reason - shown for orders that were rejected by rider */}
      {(order as any).rejectionReason && (
        <View style={[styles.rejectionBox, { marginBottom: gap }]}>
          <Text style={styles.rejectionLabel}>⚠️ Rider Rejection:</Text>
          <Text style={styles.rejectionText}>{(order as any).rejectionReason}</Text>
        </View>
      )}

      <View style={[styles.divider, { marginBottom: gap }]} />

      {/* Order Level Special Instructions */}
      {(order as any).specialInstructions && (
        <View style={[styles.specialInstructionsBox, { marginBottom: gap }]}>
          <Text style={styles.specialInstructionsLabel}>Special Instructions:</Text>
          <Text style={styles.specialInstructionsText}>{(order as any).specialInstructions}</Text>
        </View>
      )}

      <View style={{ marginBottom: gap }}>
        <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Items to Prepare:</Text>

        {displayItems.length === 0 ? (
          <Text style={{ fontSize: 12, color: COLORS.secondary, fontStyle: 'italic' }}>
            No items in this order
          </Text>
        ) : (
          displayItems.map((item, index) => {
            // Handle different data structures from backend
            const productData = item.product || (item as any).productId || (item as any).productData || {};
            // Image can be at item level (from backend) or inside product
            const rawImage = (item as any).image || productData.image || productData.imageUrl || (item as any).productImage;
            const image = resolveImageUrl(rawImage);
            const name = productData.name || productData.productName || (item as any).name || (item as any).productName || 'Unknown Product';
            const description = productData.description || (item as any).description;
            const quantity = item.quantity || (item as any).qty || 1;
            const instructions = item.specialInstructions || (item as any).instructions || (item as any).specialInstruction;

            return (
              <View
                key={String(index)}
                style={[
                  styles.itemRow,
                  {
                    paddingBottom: 12,
                    marginBottom: 12,
                    borderBottomWidth: index < displayItems.length - 1 ? 1 : 0,
                    borderBottomColor: COLORS.lightBorder,
                  },
                ]}
              >
                <ProductImage uri={image} size={isSmallScreen ? 52 : 56} />

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {name}
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {/* Item Status Badge */}
                      <View style={[styles.itemStatusBadge, { backgroundColor: getItemStatusColor(item.status) + '20', borderColor: getItemStatusColor(item.status) }]}>
                        <Text style={[styles.itemStatusText, { color: getItemStatusColor(item.status) }]}>
                          {item.status || 'PENDING'}
                        </Text>
                      </View>
                      <View style={styles.qtyBadge}>
                        <Text style={styles.qtyText}>×{quantity}</Text>
                      </View>
                    </View>
                  </View>

                  {!!description && (
                    <Text style={styles.itemDesc} numberOfLines={2}>
                      {description}
                    </Text>
                  )}

                  {!!instructions && (
                    <View style={[styles.itemNoteBox, { backgroundColor: COLORS.danger + '15', borderLeftColor: COLORS.danger }]}>
                      <Text style={[styles.itemNoteText, { fontStyle: 'italic' }]}>📝 {instructions}</Text>
                    </View>
                  )}

                  {/* Item Action Buttons - only for CHEF role and if onItemStatusChange provided */}
                  {onItemStatusChange && role === 'CHEF' && (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      {item.status === 'PENDING' && (
                        <TouchableOpacity
                          onPress={() => handleItemStatus(item._id || item.id || '', 'PREPARING')}
                          style={[styles.itemActionBtn, { backgroundColor: COLORS.warning }]}
                          disabled={loadingItemStatus === (item._id || item.id)}
                        >
                          {loadingItemStatus === (item._id || item.id) ? (
                            <ActivityIndicator size="small" color={COLORS.white} />
                          ) : (
                            <Text style={styles.itemActionBtnText}>Start</Text>
                          )}
                        </TouchableOpacity>
                      )}
                      {item.status === 'PREPARING' && (
                        <TouchableOpacity
                          onPress={() => handleItemStatus(item._id || item.id || '', 'READY')}
                          style={[styles.itemActionBtn, { backgroundColor: COLORS.primary }]}
                          disabled={loadingItemStatus === (item._id || item.id)}
                        >
                          {loadingItemStatus === (item._id || item.id) ? (
                            <ActivityIndicator size="small" color={COLORS.white} />
                          ) : (
                            <Text style={styles.itemActionBtnText}>Ready</Text>
                          )}
                        </TouchableOpacity>
                      )}
                      {item.status === 'READY' && (
                        <TouchableOpacity
                          onPress={() => handleItemStatus(item._id || item.id || '', 'SERVED')}
                          style={[styles.itemActionBtn, { backgroundColor: COLORS.success }]}
                          disabled={loadingItemStatus === (item._id || item.id)}
                        >
                          {loadingItemStatus === (item._id || item.id) ? (
                            <ActivityIndicator size="small" color={COLORS.white} />
                          ) : (
                            <Text style={styles.itemActionBtnText}>Served</Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {/* Return Item Button - only for WAITER role and if onItemStatusChange provided */}
                  {onItemStatusChange && role === 'WAITER' &&
                    ['SERVED', 'COMPLETED', 'served', 'completed'].includes(String(order.status || '').toUpperCase()) &&
                    !['RETURNED', 'SERVED'].includes(String(item.status || '').toUpperCase()) && (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <TouchableOpacity
                        onPress={() => handleItemStatus(item._id || item.id || '', 'RETURNED')}
                        style={[styles.itemActionBtn, { backgroundColor: '#8E8E93' }]}
                        disabled={loadingItemStatus === (item._id || item.id)}
                      >
                        {loadingItemStatus === (item._id || item.id) ? (
                          <ActivityIndicator size="small" color={COLORS.white} />
                        ) : (
                          <Text style={styles.itemActionBtnText}>Return</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>

      <View style={[styles.expectedBox, { marginBottom: gap }]}>
        <Text style={styles.expectedText}>Expected: {order.expectedReadyTime || 25}m remaining</Text>
      </View>

      {/* Payment Info - Only shown for specific roles */}
      {showPayment && (order as any).totalAmount !== undefined && (order as any).totalAmount !== null && (
        <View style={[styles.paymentBox, { marginBottom: gap }]}>
          <Text style={styles.paymentText}>Total: ₨{Number((order as any).totalAmount || 0).toFixed(2)}</Text>
          {(order as any).paymentMethod && (
            <Text style={styles.paymentMethod}>Payment: {(order as any).paymentMethod}</Text>
          )}
        </View>
      )}

      {/* Action Buttons - Only shown when showActions is true */}
      {showActions && (
        <View style={[styles.actionsRow, { columnGap: gap }]}>
          {((order.status as any) === 'PENDING' || (order.status as any) === 'pending') && isActionAllowed('preparing') ? (
            <TouchableOpacity
              onPress={() => handle('preparing')}
              style={[styles.actionBtn, { backgroundColor: COLORS.warning }]}
              activeOpacity={0.85}
              disabled={!!loadingStatus}
            >
              {loadingStatus === 'preparing' ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.actionText}>Start Preparing</Text>}
            </TouchableOpacity>
          ) : null}

          {((order.status as any) === 'PREPARING' || (order.status as any) === 'preparing' || (order.status as any) === 'COOKING' || (order.status as any) === 'cooking') && isActionAllowed('ready') ? (
            <TouchableOpacity
              onPress={() => handle('ready')}
              style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
              activeOpacity={0.85}
              disabled={!!loadingStatus}
            >
              {loadingStatus === 'ready' ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.actionText}>Mark Ready</Text>}
            </TouchableOpacity>
          ) : null}

          {((order.status as any) === 'READY' || (order.status as any) === 'ready') && isActionAllowed('served') ? (
            <TouchableOpacity
              onPress={() => handle('served')}
              style={[styles.actionBtn, { backgroundColor: COLORS.success }]}
              activeOpacity={0.85}
              disabled={!!loadingStatus}
            >
              {loadingStatus === 'served' ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.actionText}>Mark Served</Text>}
            </TouchableOpacity>
          ) : null}

          {((order.status as any) === 'READY' || (order.status as any) === 'ready') && isActionAllowed('picked_up') ? (
            <TouchableOpacity
              onPress={() => handle('picked_up')}
              style={[styles.actionBtn, { backgroundColor: COLORS.success }]}
              activeOpacity={0.85}
              disabled={!!loadingStatus}
            >
              {loadingStatus === 'picked_up' ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.actionText}>Pick Up</Text>}
            </TouchableOpacity>
          ) : null}

          {((order.status as any) === 'READY' || (order.status as any) === 'ready') && isActionAllowed('delivered') && !isActionAllowed('picked_up') ? (
            <TouchableOpacity
              onPress={() => handle('delivered')}
              style={[styles.actionBtn, { backgroundColor: COLORS.success }]}
              activeOpacity={0.85}
              disabled={!!loadingStatus}
            >
              {loadingStatus === 'delivered' ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.actionText}>Mark Complete</Text>}
            </TouchableOpacity>
          ) : null}

          {((order.status as any) === 'PICKED_UP' || (order.status as any) === 'picked_up') && isActionAllowed('served') ? (
            <TouchableOpacity
              onPress={() => handle('served')}
              style={[styles.actionBtn, { backgroundColor: COLORS.success }]}
              activeOpacity={0.85}
              disabled={!!loadingStatus}
            >
              {loadingStatus === 'served' ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.actionText}>Mark Served</Text>}
            </TouchableOpacity>
          ) : null}

          {((order.status as any) === 'READY' || (order.status as any) === 'ready') && isActionAllowed('out_for_delivery') ? (
            <TouchableOpacity
              onPress={() => handle('out_for_delivery')}
              style={[styles.actionBtn, { backgroundColor: COLORS.success }]}
              activeOpacity={0.85}
              disabled={!!loadingStatus}
            >
              {loadingStatus === 'out_for_delivery' ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.actionText}>Out for Delivery</Text>}
            </TouchableOpacity>
          ) : null}

          {isActionAllowed('cancelled') && (
            <TouchableOpacity
              onPress={() => handle('cancelled')}
              style={[styles.cancelBtn, { opacity: (order.status as any) === 'CANCELLED' || (order.status as any) === 'cancelled' || (order.status as any) === 'delivered' || (order.status as any) === 'served' ? 0.5 : 1 }]}
              activeOpacity={0.85}
              disabled={!!loadingStatus || (order.status as any) === 'CANCELLED' || (order.status as any) === 'cancelled' || (order.status as any) === 'delivered' || (order.status as any) === 'served'}
            >
              {loadingStatus === 'cancelled' ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.cancelText}>✕</Text>}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    fontWeight: '700',
    color: COLORS.darkText,
  },
  subText: {
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 4,
  },
  elapsedText: {
    fontSize: 12,
    fontWeight: '700',
  },
  urgencyPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.lightBorder,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkText,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemImage: {
    borderRadius: 8,
    backgroundColor: COLORS.lightBackground,
  },
  itemImagePlaceholder: {
    borderRadius: 8,
    backgroundColor: COLORS.lightBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkText,
    flex: 1,
    paddingRight: 8,
  },
  qtyBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  qtyText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  itemDesc: {
    fontSize: 12,
    color: COLORS.secondary,
    marginBottom: 4,
  },
  itemNoteBox: {
    backgroundColor: COLORS.lightBackground,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
    marginTop: 4,
  },
  itemNoteText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: COLORS.darkText,
  },
  itemStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  itemStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  itemActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
  },
  itemActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  expectedBox: {
    backgroundColor: COLORS.lightBackground,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  expectedText: {
    fontSize: 12,
    color: COLORS.secondary,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  cancelBtn: {
    width: '20%',
    backgroundColor: COLORS.danger,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  paymentBox: {
    backgroundColor: COLORS.lightBackground,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.success,
  },
  paymentText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkText,
  },
  paymentMethod: {
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 2,
  },
  tableBadge: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  tableBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  waiterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary + '12',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  waiterBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  specialInstructionsBox: {
    backgroundColor: COLORS.warning + '15',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  specialInstructionsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.warning,
    marginBottom: 4,
  },
  specialInstructionsText: {
    fontSize: 13,
    color: COLORS.darkText,
    fontStyle: 'italic',
  },
  rejectionBox: {
    backgroundColor: COLORS.danger + '15',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.danger,
  },
  rejectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.danger,
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 13,
    color: COLORS.darkText,
    fontStyle: 'italic',
  },
});
