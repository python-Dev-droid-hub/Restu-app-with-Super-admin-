import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, useWindowDimensions, ActivityIndicator } from 'react-native';
import { api } from '../api/client';

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

// Helper to construct full image URL
const getFullImageUrl = (imagePath: string | undefined | null): string | null => {
  if (!imagePath) return null;
  // If already a full URL, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  // Get base URL without /api suffix and prepend to relative path
  // Note: Upload routes are mounted at /api, so uploads are at /api/uploads
  const baseURL = api.getBaseURL();
  const fullUrl = `${baseURL}${imagePath}`;
  console.log('[OrderCard] Image URL:', fullUrl);
  return fullUrl;
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
  allowedActions 
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
        return ['picked_up', 'served', 'delivered', 'cancelled'];
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
    console.log('[OrderCard] handle called:', { orderId, next, currentStatus: order.status });
    if (!orderId) {
      console.log('[OrderCard] No orderId, returning early');
      return;
    }
    try {
      setLoadingStatus(next);
      console.log('[OrderCard] Calling onStatusChange...');
      await onStatusChange(orderId, next);
      console.log('[OrderCard] onStatusChange completed successfully');
    } catch (error) {
      console.log('[OrderCard] onStatusChange error:', error);
    } finally {
      setLoadingStatus(null);
    }
  };

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

  return (
    <View style={[styles.card, { padding, borderLeftColor: statusColor }]}>
      <View style={[styles.headerRow, { marginBottom: gap }]}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.orderNumber, { fontSize: isSmallScreen ? 15 : 16 }]}>
              {order.orderNumber}
            </Text>
            {/* Production Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {String(order.status || 'PENDING').toUpperCase()}
              </Text>
            </View>
          </View>
          {String(order.orderType).toUpperCase() === 'DINE_IN' && (
            <View style={[styles.tableBadge, { marginTop: 6 }]}>
              <Text style={styles.tableBadgeText}>Table {order.tableNumber || order.table || '-'}</Text>
            </View>
          )}
          <Text style={[styles.subText, { marginTop: 4 }]}>
            {String(order.orderType).toUpperCase() === 'DINE_IN'
              ? 'DINE-IN'
              : String(order.orderType).toUpperCase()}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.elapsedText, { color: urgencyColor }]}>{elapsedMinutes}m</Text>
          </View>

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
            const image = getFullImageUrl(rawImage);
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
                {/* PRODUCT IMAGE */}
                {!!image ? (
                  <Image
                    source={{ uri: image }}
                    style={{ width: 60, height: 60, borderRadius: 8, marginRight: 12, backgroundColor: COLORS.lightBackground }}
                    resizeMode="cover"
                    onError={(e) => console.log('[OrderCard] Image load error:', e.nativeEvent.error, 'URL:', image)}
                    onLoad={() => console.log('[OrderCard] Image loaded successfully:', image)}
                  />
                ) : (
                  <View style={{
                    width: 60,
                    height: 60,
                    borderRadius: 8,
                    marginRight: 12,
                    backgroundColor: COLORS.lightBackground,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <Text style={{ fontSize: 28 }}>🍽️</Text>
                  </View>
                )}

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
                  {onItemStatusChange && role === 'WAITER' && !['RETURNED', 'SERVED'].includes(item.status as string) && (
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
