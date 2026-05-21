/** Dine-in party + table labels for order cards (mirrors server normalizeOrderPayload). */

function personLabel(person: unknown): string {
  if (!person || typeof person !== 'object') return '';
  const p = person as Record<string, unknown>;
  const name = String(p.displayName || p.name || '').trim();
  if (name) return name;
  const email = String(p.email || '').trim();
  if (email.includes('@')) return email.split('@')[0];
  return '';
}

export function resolveTableNumber(raw: Record<string, unknown>): string {
  const direct = raw?.tableNumber ?? raw?.table_number;
  if (direct != null && String(direct).trim()) return String(direct).trim();

  const table = raw?.table;
  if (table && typeof table === 'object') {
    const n =
      (table as Record<string, unknown>).tableNumber ??
      (table as Record<string, unknown>).number;
    if (n != null && String(n).trim()) return String(n).trim();
  }

  const line = String(raw?.addressLine || raw?.address_line || raw?.deliveryInstructions || '');
  const m = line.match(/table\s*#?\s*([A-Za-z0-9_-]+)/i);
  if (m?.[1]) return m[1];

  return '';
}

export function resolveWaiterName(raw: Record<string, unknown>, orderType: string): string {
  const persisted = String(raw?.waiterName || raw?.waiter_name || '').trim();
  if (persisted) return persisted;
  const fromWaiter = personLabel(raw?.waiter);
  if (fromWaiter) return fromWaiter;
  if (orderType === 'DINE_IN') {
    const fromCustomer = personLabel(raw?.customer);
    if (fromCustomer && fromCustomer.toLowerCase() !== 'walk-in customer') return fromCustomer;
  }
  return '';
}

export function enrichOrderParty(raw: Record<string, unknown>) {
  const orderType = String(raw?.orderType || raw?.order_type || '').toUpperCase();
  const tableNumber = resolveTableNumber(raw);
  const waiterName = resolveWaiterName(raw, orderType);
  const isDineIn = orderType === 'DINE_IN' || orderType === 'PICKUP' || Boolean(tableNumber && orderType !== 'DELIVERY');
  const partyName = isDineIn ? waiterName || '—' : String(raw?.customerName || raw?.customer_name || 'Guest');

  return {
    ...raw,
    orderType: orderType || (isDineIn ? 'DINE_IN' : orderType),
    tableNumber: tableNumber || null,
    waiterName: waiterName || null,
    partyLabel: isDineIn ? 'Waiter' : 'Customer',
    partyName,
    customerName: isDineIn ? partyName : raw?.customerName ?? raw?.customer_name,
  };
}
