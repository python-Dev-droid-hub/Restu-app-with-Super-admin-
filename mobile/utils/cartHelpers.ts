// Cart Calculation Helpers

import { colors } from '../theme';

export interface CartItem {
  _id: string;
  name: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  size?: string;
  specialInstructions?: string[];
  image?: string;
}

export interface BillDetails {
  subtotal: number;
  deliveryFee: number;
  discount: number;
  tax: number;
  taxPercentage: number;
  total: number;
}

/**
 * Calculate subtotal from cart items
 */
export function calculateSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/**
 * Calculate discount amount
 */
export function calculateDiscount(subtotal: number, discountPercent: number): number {
  return Math.round(subtotal * (discountPercent / 100) * 100) / 100;
}

/**
 * Calculate tax amount
 */
export function calculateTax(subtotal: number, taxPercent: number = 5): number {
  return Math.round(subtotal * (taxPercent / 100) * 100) / 100;
}

/**
 * Calculate delivery fee based on distance
 */
export function calculateDeliveryFee(distance: number): number {
  if (distance <= 0) return 0;
  if (distance <= 3) return 0; // Free within 3km
  if (distance <= 5) return 30;
  if (distance <= 10) return 50;
  return 80;
}

/**
 * Apply promo code discount
 */
export function applyPromoCode(code: string, subtotal: number): { discount: number; message: string } {
  const promoCodes: Record<string, number> = {
    'WELCOME20': 20,
    'FIRSTORDER': 25,
    'WINGS10': 10,
    'SPECIAL30': 30,
    'RAMADAN': 15,
  };
  
  const discountPercent = promoCodes[code.toUpperCase()];
  
  if (!discountPercent) {
    return { discount: 0, message: 'Invalid promo code' };
  }
  
  const discount = calculateDiscount(subtotal, discountPercent);
  return { discount, message: `${discountPercent}% discount applied!` };
}

/**
 * Calculate complete bill breakdown
 */
export function calculateBill(
  items: CartItem[],
  options: {
    deliveryFee?: number;
    promoCode?: string;
    taxPercent?: number;
  } = {}
): BillDetails {
  const subtotal = calculateSubtotal(items);
  
  // Apply promo code if provided
  let discount = 0;
  if (options.promoCode) {
    discount = applyPromoCode(options.promoCode, subtotal).discount;
  }
  
  const discountedSubtotal = subtotal - discount;
  const resolvedTaxPercent = typeof options.taxPercent === 'number' ? options.taxPercent : 5;
  const tax = calculateTax(discountedSubtotal, resolvedTaxPercent);
  const deliveryFee = options.deliveryFee ?? 50;
  const total = discountedSubtotal + tax + deliveryFee;
  
  return {
    subtotal,
    deliveryFee,
    discount,
    tax,
    taxPercentage: resolvedTaxPercent,
    total: Math.round(total * 100) / 100,
  };
}

/**
 * Get total item count in cart
 */
export function getCartItemCount(items: CartItem[]): number {
  return items.reduce((count, item) => count + item.quantity, 0);
}

/**
 * Format bill details for display
 */
export function formatBillDetails(bill: BillDetails): Array<{ label: string; value: string; color?: string }> {
  return [
    { label: 'Subtotal', value: `₹${Number(bill.subtotal || 0).toFixed(2)}` },
    { label: 'Delivery Fee', value: bill.deliveryFee === 0 ? 'FREE' : `₹${Number(bill.deliveryFee || 0).toFixed(2)}`, color: bill.deliveryFee === 0 ? colors.success : undefined },
    ...(bill.discount > 0 ? [{ label: 'Discount', value: `-₹${Number(bill.discount || 0).toFixed(2)}`, color: colors.danger }] : []),
    { label: `Tax (${bill.taxPercentage}%)`, value: `₹${Number(bill.tax || 0).toFixed(2)}` },
    { label: 'TOTAL', value: `₹${Number(bill.total || 0).toFixed(2)}`, color: colors.primary },
  ];
}
