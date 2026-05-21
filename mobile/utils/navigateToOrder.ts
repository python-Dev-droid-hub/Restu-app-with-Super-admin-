type OrderNavSource = {
  _id?: string;
  id?: string;
  orderNumber?: string;
  order_number?: string;
};

/** Navigate within the tab navigator when nested, otherwise use stack navigation. */
export function navigateToTabScreen(
  navigation: { navigate: (screen: string, params?: object) => void; getParent?: () => unknown },
  screen: string,
  params?: object
) {
  const tabNavigation = navigation.getParent?.() as typeof navigation | undefined;
  if (tabNavigation) {
    tabNavigation.navigate(screen, params);
    return;
  }
  navigation.navigate(screen, params);
}

/** Navigate to Orders tab, highlight matching order, and open details. */
export function navigateToOrder(
  navigation: { navigate: (screen: string, params?: object) => void; getParent?: () => unknown },
  order: OrderNavSource
) {
  const orderId = String(order._id || order.id || '').trim();
  const orderNumber = String(order.orderNumber || order.order_number || '').trim();

  navigateToTabScreen(navigation, 'AdminOrders', {
    ...(orderId ? { orderId } : {}),
    ...(orderNumber ? { orderNumber } : {}),
    highlightOrder: true,
    openDetails: true,
  });
}

export function getOrderId(order: OrderNavSource): string {
  return String(order._id || order.id || '').trim();
}

export function getOrderNumber(order: OrderNavSource): string {
  return String(order.orderNumber || order.order_number || '').trim();
}

export function ordersMatchTarget(
  order: OrderNavSource,
  target: { orderId?: string; orderNumber?: string }
): boolean {
  const id = getOrderId(order);
  const number = getOrderNumber(order);
  const targetId = String(target.orderId || '').trim();
  const targetNumber = String(target.orderNumber || '').trim();

  if (targetId && id && id === targetId) return true;
  if (targetNumber && number && number === targetNumber) return true;
  if (targetId && number && number === targetId) return true;
  if (targetNumber && id && id.endsWith(targetNumber.slice(-6))) return true;

  return false;
}
