import { resolveImageUrl } from './resolveImageUrl';

export type NormalizedOrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  status?: string;
  image?: string | null;
  unit_price?: number;
  total_price?: number;
};

export type NormalizedOrder = {
  id: string;
  order_number: string;
  order_type: 'DELIVERY' | 'DINE_IN' | 'TAKEAWAY';
  status: string;
  table_number?: string | null;
  created_at: string;
  items: NormalizedOrderItem[];
  total_amount?: number;
  special_instructions?: string | null;
  waiter_name?: string | null;
  picked_up_at?: string | null;
  address_line?: string | null;
  payment_status?: string | null;
  payment_method?: string | null;
};

export function isPaymentCleared(order: {
  status?: string;
  payment_status?: string | null;
}): boolean {
  const s = String(order.status || '').toUpperCase();
  const ps = String(order.payment_status || '').toUpperCase();
  return s === 'COMPLETED' || ps === 'SUCCESS' || ps === 'PAID';
}

/** Active queue: preparing through served until bill/payment is cleared. */
export function isWaiterActiveOrder(order: {
  status?: string;
  payment_status?: string | null;
}): boolean {
  const s = String(order.status || '').toUpperCase();
  if (s === 'CANCELLED') return false;
  return !isPaymentCleared(order);
}

export function normalizeSocketOrder(raw: any): NormalizedOrder {
  const id = raw?.id || raw?._id?.toString?.() || String(raw?._id || '');
  const items = Array.isArray(raw?.items) ? raw.items : [];

  return {
    id,
    order_number: raw?.order_number || raw?.orderNumber || `ORD-${id.slice(-6)}`,
    order_type: (raw?.order_type || raw?.orderType || 'DINE_IN') as NormalizedOrder['order_type'],
    status: String(raw?.status || 'PENDING').toUpperCase(),
    table_number: (() => {
      const direct =
        raw?.table_number ||
        raw?.tableNumber ||
        raw?.table?.tableNumber;
      if (direct != null && String(direct).trim()) return String(direct).trim();
      const line = String(raw?.address_line || raw?.addressLine || '');
      const m = line.match(/table\s*#?\s*([A-Za-z0-9_-]+)/i);
      return m?.[1] || null;
    })(),
    created_at: raw?.created_at || raw?.createdAt || new Date().toISOString(),
    items: items.map((item: any, index: number) => {
      const productRef = item?.product || item?.productId;
      const product =
        productRef && typeof productRef === 'object' && !Array.isArray(productRef)
          ? productRef
          : {};
      const imageRaw =
        item?.image ||
        item?.productImage ||
        item?.product_image ||
        product?.imageUrl ||
        product?.image ||
        (Array.isArray(product?.images) ? product.images[0] : null);
      return {
        id: item?._id?.toString?.() || item?.id || `${id}-item-${index}`,
        product_name:
          item?.product_name ||
          item?.productName ||
          product?.name ||
          item?.name ||
          'Item',
        quantity: Number(item?.quantity || 1),
        status: item?.status,
        image: resolveImageUrl(imageRaw),
        unit_price: item?.unitPrice ?? item?.unit_price,
        total_price: item?.totalPrice ?? item?.total_price,
      };
    }),
    total_amount: raw?.total_amount ?? raw?.totalAmount ?? raw?.finalAmount,
    special_instructions: raw?.special_instructions ?? raw?.specialInstructions ?? null,
    waiter_name: (() => {
      const persisted = String(raw?.waiter_name || raw?.waiterName || '').trim();
      if (persisted) return persisted;
      const w = raw?.waiter;
      if (w && typeof w === 'object') {
        const name = String(w.displayName || w.name || '').trim();
        if (name) return name;
        const email = String(w.email || '').trim();
        if (email.includes('@')) return email.split('@')[0];
      }
      return null;
    })(),
    picked_up_at: raw?.picked_up_at || raw?.pickedUpAt || null,
    address_line: raw?.address_line || raw?.addressLine || null,
    payment_status: raw?.payment_status ?? raw?.paymentStatus ?? null,
    payment_method: raw?.payment_method ?? raw?.paymentMethod ?? null,
  };
}

export function toOrderCardProps(order: NormalizedOrder) {
  return {
    id: order.id,
    orderNumber: order.order_number,
    status: String(order.status || 'PENDING').toLowerCase(),
    orderType: order.order_type,
    tableNumber: order.table_number || undefined,
    waiterName: order.waiter_name || undefined,
    addressLine: order.address_line || undefined,
    items: order.items.map((item) => ({
      id: item.id,
      _id: item.id,
      quantity: item.quantity,
      status: item.status,
      image: item.image || undefined,
      product: {
        name: item.product_name,
        image: item.image || undefined,
        imageUrl: item.image || undefined,
      },
    })),
    createdAt: order.created_at,
    specialInstructions: order.special_instructions || undefined,
    totalAmount: order.total_amount,
  };
}

/** READY first, then PREPARING, then others; newest within same priority. */
export function sortWaiterQueue(orders: NormalizedOrder[]): NormalizedOrder[] {
  const priority = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'READY') return 0;
    if (s === 'SERVED') return 1;
    if (s === 'PREPARING' || s === 'KITCHEN_ACCEPTED') return 2;
    if (s === 'PENDING') return 3;
    return 4;
  };
  return [...orders].sort((a, b) => {
    const pd = priority(a.status) - priority(b.status);
    if (pd !== 0) return pd;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
