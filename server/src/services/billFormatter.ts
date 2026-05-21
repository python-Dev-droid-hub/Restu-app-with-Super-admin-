export type BillOrder = {
  orderNumber: string;
  orderType?: string;
  tableNumber?: string;
  createdAt?: Date | string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    sizeName?: string;
  }>;
  subtotal?: number;
  taxAmount?: number;
  deliveryFee?: number;
  serviceCharge?: number;
  totalAmount?: number;
  finalAmount?: number;
  waiterName?: string;
  paymentMethod?: string;
  paymentStatus?: string;
};

export function formatBillText(
  order: BillOrder,
  meta: { restaurantName: string; branchName: string }
): string {
  const lines: string[] = [];
  const width = 42;
  const center = (text: string) => {
    const t = text.slice(0, width);
    const pad = Math.max(0, Math.floor((width - t.length) / 2));
    return ' '.repeat(pad) + t;
  };
  const row = (left: string, right: string) => {
    const l = left.slice(0, width - right.length - 1);
    const space = Math.max(1, width - l.length - right.length);
    return l + ' '.repeat(space) + right;
  };

  lines.push(center(meta.restaurantName));
  lines.push(center(meta.branchName));
  lines.push('='.repeat(width));
  lines.push(`Order: ${order.orderNumber}`);
  if (order.tableNumber) lines.push(`Table: ${order.tableNumber}`);
  if (order.orderType) lines.push(`Type: ${order.orderType}`);
  const when = order.createdAt ? new Date(order.createdAt) : new Date();
  lines.push(`Date: ${when.toLocaleString()}`);
  if (order.waiterName) lines.push(`Waiter: ${order.waiterName}`);
  lines.push('-'.repeat(width));

  for (const item of order.items) {
    const name = item.sizeName ? `${item.productName} (${item.sizeName})` : item.productName;
    lines.push(name.slice(0, width));
    lines.push(
      row(
        `  ${item.quantity} x ${item.unitPrice.toFixed(2)}`,
        item.totalPrice.toFixed(2)
      )
    );
  }

  lines.push('-'.repeat(width));
  const subtotal = order.subtotal ?? order.totalAmount ?? 0;
  const tax = order.taxAmount ?? 0;
  const delivery = order.deliveryFee ?? 0;
  const service = order.serviceCharge ?? 0;
  const total = order.finalAmount ?? order.totalAmount ?? subtotal + tax + delivery + service;

  lines.push(row('Subtotal', subtotal.toFixed(2)));
  if (tax > 0) lines.push(row('Tax', tax.toFixed(2)));
  if (service > 0) lines.push(row('Service', service.toFixed(2)));
  if (delivery > 0) lines.push(row('Delivery', delivery.toFixed(2)));
  lines.push(row('TOTAL', total.toFixed(2)));
  if (order.paymentMethod) lines.push(`Payment: ${order.paymentMethod}`);
  lines.push('='.repeat(width));
  lines.push(center('Thank you!'));
  lines.push('\n');

  return lines.join('\n');
}
