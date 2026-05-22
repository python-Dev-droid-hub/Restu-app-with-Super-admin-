export type OrderType = 'DELIVERY' | 'DINE_IN' | 'TAKEAWAY';
export type OrderStatus =
  | 'PENDING'
  | 'KITCHEN_ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'RIDER_ASSIGNED'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'SERVED'
  | 'COMPLETED'
  | 'CANCELLED';

const KITCHEN_ROLES = ['CHEF', 'KITCHEN', 'COOK', 'HEAD_CHEF', 'SOUS_CHEF', 'KITCHEN_MANAGER'] as const;

const VALID_TRANSITIONS: Record<OrderType, Partial<Record<OrderStatus, OrderStatus[]>>> = {
  DINE_IN: {
    PENDING: ['READY', 'KITCHEN_ACCEPTED', 'PREPARING', 'CANCELLED'],
    KITCHEN_ACCEPTED: ['READY', 'PREPARING', 'CANCELLED'],
    PREPARING: ['READY', 'CANCELLED'],
    READY: ['SERVED', 'CANCELLED'],
    SERVED: ['COMPLETED', 'CANCELLED'],
  },
  TAKEAWAY: {
    PENDING: ['READY', 'KITCHEN_ACCEPTED', 'PREPARING', 'CANCELLED'],
    KITCHEN_ACCEPTED: ['READY', 'PREPARING', 'CANCELLED'],
    PREPARING: ['READY', 'CANCELLED'],
    READY: ['COMPLETED', 'CANCELLED'],
  },
  DELIVERY: {
    PENDING: ['READY', 'KITCHEN_ACCEPTED', 'PREPARING', 'CANCELLED'],
    KITCHEN_ACCEPTED: ['READY', 'PREPARING', 'CANCELLED'],
    PREPARING: ['READY', 'CANCELLED'],
    READY: ['RIDER_ASSIGNED', 'CANCELLED'],
    RIDER_ASSIGNED: ['PICKED_UP', 'CANCELLED'],
    PICKED_UP: ['OUT_FOR_DELIVERY', 'CANCELLED'],
    OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
    DELIVERED: ['COMPLETED', 'CANCELLED'],
  },
};

/** Role may force these targets regardless of normal flow (admins). */
const ROLE_OVERRIDE_TARGETS: Record<string, OrderStatus[]> = {
  ADMIN: [
    'PENDING',
    'KITCHEN_ACCEPTED',
    'PREPARING',
    'READY',
    'RIDER_ASSIGNED',
    'PICKED_UP',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'SERVED',
    'COMPLETED',
    'CANCELLED',
  ],
  SUPER_ADMIN: [
    'PENDING',
    'KITCHEN_ACCEPTED',
    'PREPARING',
    'READY',
    'RIDER_ASSIGNED',
    'PICKED_UP',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'SERVED',
    'COMPLETED',
    'CANCELLED',
  ],
  BRANCH_MANAGER: [
    'PENDING',
    'KITCHEN_ACCEPTED',
    'PREPARING',
    'READY',
    'SERVED',
    'COMPLETED',
    'CANCELLED',
  ],
  CHEF: ['KITCHEN_ACCEPTED', 'PREPARING', 'READY'],
  KITCHEN: ['KITCHEN_ACCEPTED', 'PREPARING', 'READY'],
  COOK: ['KITCHEN_ACCEPTED', 'PREPARING', 'READY'],
  HEAD_CHEF: ['KITCHEN_ACCEPTED', 'PREPARING', 'READY'],
  SOUS_CHEF: ['KITCHEN_ACCEPTED', 'PREPARING', 'READY'],
  KITCHEN_MANAGER: ['KITCHEN_ACCEPTED', 'PREPARING', 'READY'],
  WAITER: ['READY', 'SERVED', 'COMPLETED', 'PICKED_UP'],
  RIDER: ['PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'],
};

export function normalizeOrderType(value?: string): OrderType {
  const t = String(value || 'DELIVERY').toUpperCase();
  if (t === 'DINE_IN' || t === 'DINEIN') return 'DINE_IN';
  if (t === 'TAKEAWAY' || t === 'PICKUP') return 'TAKEAWAY';
  return 'DELIVERY';
}

function roleMaySetStatus(role: string, next: OrderStatus, orderType: OrderType): boolean {
  const targets = ROLE_OVERRIDE_TARGETS[role];
  if (!targets?.includes(next)) return false;
  if (role === 'WAITER') {
    if (orderType === 'DINE_IN') {
      return ['READY', 'SERVED', 'COMPLETED', 'CANCELLED'].includes(next);
    }
    return ['PICKED_UP', 'SERVED', 'COMPLETED', 'CANCELLED'].includes(next);
  }
  if (KITCHEN_ROLES.includes(role as (typeof KITCHEN_ROLES)[number])) {
    return ['KITCHEN_ACCEPTED', 'PREPARING', 'READY'].includes(next);
  }
  if (role === 'RIDER') {
    return ['PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(next);
  }
  return true;
}

export function isValidStatusTransition(
  currentStatus: string,
  newStatus: string,
  orderType: string,
  role?: string
): boolean {
  const current = String(currentStatus || '').toUpperCase() as OrderStatus;
  const next = String(newStatus || '').toUpperCase() as OrderStatus;
  const type = normalizeOrderType(orderType);
  const normalizedRole = String(role || '').toUpperCase();

  if (current === next) return true;

  if (['ADMIN', 'SUPER_ADMIN'].includes(normalizedRole)) {
    return true;
  }

  if (next === 'CANCELLED') {
    return ['ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'WAITER'].includes(normalizedRole);
  }

  const flowAllowed = VALID_TRANSITIONS[type]?.[current] || [];
  if (!flowAllowed.includes(next)) {
    return false;
  }

  if (['BRANCH_MANAGER', 'MANAGER'].includes(normalizedRole)) {
    return true;
  }

  return roleMaySetStatus(normalizedRole, next, type);
}

export function getInitialStatusForOrder(orderType: string, creatorRole?: string): OrderStatus {
  const type = normalizeOrderType(orderType);
  const role = String(creatorRole || '').toUpperCase();
  if (type === 'DINE_IN' && role === 'WAITER') {
    return 'PREPARING';
  }
  return 'PENDING';
}
