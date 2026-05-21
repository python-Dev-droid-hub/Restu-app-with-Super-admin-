/** Dine-in orders are taken by waiters; delivery/takeaway show customer. */

type OrderLike = Record<string, unknown> | null | undefined;

function personName(person: unknown): string {
  if (!person || typeof person !== 'object') return '';
  const p = person as Record<string, unknown>;
  const name = String(p.displayName || p.name || '').trim();
  if (name) return name;
  const email = String(p.email || '').trim();
  if (email.includes('@')) return email.split('@')[0];
  return '';
}

export function getOrderType(raw: OrderLike): string {
  return String(raw?.orderType || raw?.order_type || '').trim().toUpperCase();
}

export function resolveTableNumber(raw: OrderLike): string {
  if (!raw) return '';
  const direct = raw.tableNumber ?? raw.table_number;
  if (direct != null && String(direct).trim()) return String(direct).trim();
  const table = raw.table;
  if (table && typeof table === 'object') {
    const n =
      (table as Record<string, unknown>).tableNumber ?? (table as Record<string, unknown>).number;
    if (n != null && String(n).trim()) return String(n).trim();
  }
  const line = String(raw.addressLine || raw.deliveryInstructions || '');
  const m = line.match(/table\s*#?\s*([A-Za-z0-9_-]+)/i);
  if (m?.[1]) return m[1];
  return '';
}

export function isDineInOrder(raw: OrderLike): boolean {
  const t = getOrderType(raw);
  if (t === 'DINE_IN' || t === 'DINE-IN' || t === 'PICKUP') return true;
  return Boolean(resolveTableNumber(raw)) && t !== 'DELIVERY';
}

export function getWaiterDisplayName(raw: OrderLike): string {
  if (!raw) return '';

  const persisted = String(raw.waiterName || raw.waiter_name || '').trim();
  if (persisted) return persisted;

  const fromWaiterField = personName(raw.waiter);
  if (fromWaiterField) return fromWaiterField;

  if (isDineInOrder(raw)) {
    const fromCustomer = personName(raw.customer);
    if (fromCustomer && fromCustomer.toLowerCase() !== 'walk-in customer') {
      return fromCustomer;
    }
  }

  return '';
}

export function getCustomerDisplayName(raw: OrderLike): string {
  if (!raw) return '';
  const fromCustomer = personName(raw.customer);
  if (fromCustomer) return fromCustomer;
  return String(raw.customerName || raw.customer_name || '').trim();
}

export function getOrderPartyDisplay(raw: OrderLike): {
  label: string;
  name: string;
  orderType: string;
  tableNumber: string;
} {
  const orderType = getOrderType(raw) || (isDineInOrder(raw) ? 'DINE_IN' : '');
  const tableNumber = resolveTableNumber(raw);
  if (isDineInOrder(raw) || orderType === 'DINE_IN') {
    const waiterName = getWaiterDisplayName(raw);
    return {
      orderType: orderType || 'DINE_IN',
      tableNumber,
      label: 'Waiter',
      name: waiterName || '—',
    };
  }
  const customerName = getCustomerDisplayName(raw);
  return {
    orderType,
    tableNumber,
    label: 'Customer',
    name: customerName || 'Guest',
  };
}

export function getOrderListDisplayName(raw: OrderLike): string {
  return getOrderPartyDisplay(raw).name;
}

export function enrichOrderParty<T extends Record<string, unknown>>(raw: T): T & {
  orderType: string;
  partyLabel: string;
  partyName: string;
  waiterName: string | null;
  customerName: string;
  tableNumber: string | null;
} {
  const serverPartyName = String(raw.partyName || '').trim();
  const serverWaiter = String(raw.waiterName || '').trim();
  const serverTable =
    raw.tableNumber != null && String(raw.tableNumber).trim()
      ? String(raw.tableNumber).trim()
      : resolveTableNumber(raw);

  const party = getOrderPartyDisplay(raw);
  const waiterName = serverWaiter || getWaiterDisplayName(raw) || null;
  const partyName = serverPartyName || party.name;
  const partyLabel = String(raw.partyLabel || party.label);

  return {
    ...raw,
    orderType: party.orderType || getOrderType(raw),
    tableNumber: serverTable || party.tableNumber || null,
    partyLabel,
    partyName,
    waiterName,
    customerName: partyName,
  };
}
