/** Normalize order documents for API + WebSocket (waiter + table on dine-in cards). */

function personLabel(person: unknown): string {
  if (!person || typeof person !== 'object') return '';
  const p = person as Record<string, unknown>;
  const name = String(p.displayName || p.name || '').trim();
  if (name) return name;
  const email = String(p.email || '').trim();
  if (email.includes('@')) return email.split('@')[0];
  return '';
}

export function resolveTableNumber(orderObj: Record<string, unknown>): string {
  const direct = orderObj?.tableNumber ?? orderObj?.table_number;
  if (direct != null && String(direct).trim()) return String(direct).trim();

  const table = orderObj?.table;
  if (table && typeof table === 'object') {
    const n = (table as Record<string, unknown>).tableNumber ?? (table as Record<string, unknown>).number;
    if (n != null && String(n).trim()) return String(n).trim();
  }

  const line = String(orderObj?.addressLine || orderObj?.deliveryInstructions || '');
  const m = line.match(/table\s*#?\s*([A-Za-z0-9_-]+)/i);
  if (m?.[1]) return m[1];

  return '';
}

export function resolveWaiterName(orderObj: Record<string, unknown>, orderType: string): string {
  const persisted = String(orderObj?.waiterName || orderObj?.waiter_name || '').trim();
  if (persisted) return persisted;

  const fromWaiter = personLabel(orderObj?.waiter);
  if (fromWaiter) return fromWaiter;

  if (orderType === 'DINE_IN') {
    const fromCustomer = personLabel(orderObj?.customer);
    if (fromCustomer && fromCustomer.toLowerCase() !== 'walk-in customer') {
      return fromCustomer;
    }
  }

  return '';
}

export function normalizeOrderPayload(o: any) {
  const orderObj = (o?.toObject ? o.toObject() : o) as Record<string, unknown>;
  const tableNumber = resolveTableNumber(orderObj);
  const items = Array.isArray(orderObj?.items)
    ? orderObj.items.map((it: any) => {
        const product = it?.product && typeof it.product === 'object' ? it.product : null;
        const imagePath =
          it?.image ||
          product?.imageUrl ||
          product?.image ||
          (Array.isArray(product?.images) ? product.images[0] : null);
        return {
          ...it,
          id: it?._id?.toString?.() || it?.id,
          productName: it?.productName || product?.name,
          image: imagePath,
          product: product
            ? {
                _id: product._id?.toString?.() || product._id,
                name: product.name,
                imageUrl: imagePath,
                image: imagePath,
              }
            : it?.product,
        };
      })
    : [];

  const orderType = String(orderObj?.orderType || '').toUpperCase();
  const waiterName = resolveWaiterName(orderObj, orderType);
  const customerFromPopulated = personLabel(orderObj?.customer);
  const customerName =
    orderType === 'DINE_IN'
      ? waiterName || String(orderObj?.customerName || '—')
      : customerFromPopulated
        ? customerFromPopulated
        : String(orderObj?.customerName || 'Guest');

  const isDineIn = orderType === 'DINE_IN' || orderType === 'PICKUP' || Boolean(tableNumber && orderType !== 'DELIVERY');

  return {
    ...orderObj,
    id: (orderObj?._id as any)?.toString?.() || orderObj?.id,
    orderNumber: orderObj?.orderNumber,
    status: orderObj?.status,
    orderType: orderType || (isDineIn ? 'DINE_IN' : orderType),
    createdAt: orderObj?.createdAt,
    tableNumber: tableNumber || null,
    items,
    finalAmount: orderObj?.totalAmount,
    total: orderObj?.totalAmount,
    totalAmount: orderObj?.totalAmount,
    waiterName: waiterName || null,
    customerName,
    partyLabel: isDineIn || orderType === 'DINE_IN' ? 'Waiter' : 'Customer',
    partyName: isDineIn || orderType === 'DINE_IN' ? waiterName || '—' : customerName,
    waiter:
      orderObj?.waiter && typeof orderObj.waiter === 'object'
        ? {
            _id: (orderObj.waiter as any)._id?.toString?.() || (orderObj.waiter as any)._id,
            displayName: waiterName || (orderObj.waiter as any).displayName,
            name: (orderObj.waiter as any).name,
            email: (orderObj.waiter as any).email,
          }
        : orderObj?.waiter,
    customer:
      orderObj?.customer && typeof orderObj.customer === 'object'
        ? {
            _id: (orderObj.customer as any)._id?.toString?.() || (orderObj.customer as any)._id,
            displayName: (orderObj.customer as any).displayName,
            name: (orderObj.customer as any).name,
            email: (orderObj.customer as any).email,
            phoneNumber: (orderObj.customer as any).phoneNumber,
          }
        : orderObj?.customer,
    paymentStatus: orderObj.paymentStatus,
    paymentMethod: orderObj.paymentMethod,
    completedAt: orderObj.completedAt,
    invoiceNumber: orderObj.invoiceNumber,
  };
}
