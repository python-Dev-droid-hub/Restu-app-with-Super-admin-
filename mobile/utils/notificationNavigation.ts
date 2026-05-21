import { createNavigationContainerRef } from '@react-navigation/native';
import { navigateToOrder } from './navigateToOrder';

export const navigationRef = createNavigationContainerRef<Record<string, object | undefined>>();

export function extractOrderFromNotification(payload: {
  data?: Record<string, unknown>;
  relatedOrderId?: string;
  orderId?: string;
}): { orderId?: string; orderNumber?: string } {
  const data = payload.data || {};
  const orderId = String(
    payload.orderId ||
      payload.relatedOrderId ||
      data.orderId ||
      data.order_id ||
      data.relatedOrderId ||
      ''
  ).trim();
  const orderNumber = String(data.orderNumber || data.order_number || '').trim();

  return {
    orderId: orderId || undefined,
    orderNumber: orderNumber || undefined,
  };
}

export function handleNotificationNavigation(
  notification: {
    data?: Record<string, unknown>;
    relatedOrderId?: string;
    orderId?: string;
    type?: string;
  },
  userRole?: string
) {
  if (!navigationRef.isReady()) {
    console.warn('[NotificationNav] Navigation not ready');
    return false;
  }

  const { orderId, orderNumber } = extractOrderFromNotification(notification);
  if (!orderId && !orderNumber) return false;

  const role = String(userRole || '').toUpperCase();

  if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'BRANCH_MANAGER') {
    navigateToOrder(navigationRef as never, { _id: orderId, orderNumber });
    return true;
  }

  if (role === 'WAITER') {
    navigationRef.navigate('WaiterTabs' as never, {
      screen: 'OrderForm',
      params: { orderId },
    } as never);
    return true;
  }

  if (role === 'CHEF') {
    navigationRef.navigate('ChefTabs' as never, {
      screen: 'KitchenDisplay',
      params: { orderId },
    } as never);
    return true;
  }

  if (role === 'RIDER') {
    navigationRef.navigate('RiderTabs' as never, {
      screen: 'RiderHome',
      params: { orderId },
    } as never);
    return true;
  }

  if (role === 'CUSTOMER') {
    navigationRef.navigate('CustomerTabs' as never, {
      screen: 'CustomerOrders',
      params: { orderId },
    } as never);
    return true;
  }

  return false;
}
