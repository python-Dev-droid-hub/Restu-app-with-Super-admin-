import Toast from 'react-native-toast-message';

interface NotificationData {
  type: string;
  title: string;
  message: string;
  data?: any;
}

export const handleNotificationByType = (notification: NotificationData) => {
  const { type, title, message } = notification;

  console.log('[NotificationHandler] Processing notification:', type);

  switch (type) {
    // CUSTOMER notifications
    case 'ORDER_PLACED':
    case 'ORDER_CONFIRMED':
      showToast('✅ Order Confirmed', message || 'Your order has been confirmed');
      break;

    case 'ORDER_PREPARING':
    case 'KITCHEN_ACCEPTED':
      showToast('🍳 Preparing', message || 'Your order is being prepared');
      break;

    case 'ORDER_READY':
    case 'READY':
      showToast('🎉 Order Ready!', message || 'Your order is ready for pickup');
      vibrate();
      break;

    case 'ORDER_OUT_FOR_DELIVERY':
    case 'OUT_FOR_DELIVERY':
      showToast('🚗 On the Way', message || 'Your order is out for delivery');
      break;

    case 'ORDER_DELIVERED':
    case 'DELIVERED':
      showToast('✅ Delivered', message || 'Your order has been delivered');
      // Could trigger rating prompt here
      break;

    case 'RIDER_ASSIGNED':
    case 'ASSIGNED':
      showToast('👤 Rider Assigned', message || 'A rider has been assigned to your order');
      break;

    case 'ORDER_CANCELLED':
    case 'CANCELLED':
      showToast('❌ Cancelled', message || 'Your order has been cancelled');
      break;

    // CHEF notifications
    case 'NEW_COOKING_ORDER':
      showToast('🍳 New Order!', message || 'New order ready to cook');
      vibrate();
      break;

    case 'ORDER_PRIORITY':
      showToast('⚠️ Priority', message || 'High priority order received');
      vibrate();
      break;

    // RIDER notifications
    case 'DELIVERY_ASSIGNED':
      showToast('📦 New Delivery', message || 'You have a new delivery assignment');
      vibrate();
      break;

    case 'DELIVERY_AVAILABLE':
      showToast('📦 Available', message || 'New delivery available');
      break;

    // MANAGER / BRANCH notifications
    case 'BRANCH_ORDER':
      showToast('📋 New Order', message || 'New order received');
      break;

    // System notifications
    case 'SYSTEM':
    case 'GENERAL':
      showToast(title || 'Notification', message);
      break;

    default:
      console.log('[NotificationHandler] Unknown notification type:', type);
      // Show generic toast for unknown types
      if (title || message) {
        showToast(title || 'New Notification', message);
      }
  }
};

const showToast = (title: string, message?: string) => {
  Toast.show({
    type: 'success',
    text1: title,
    text2: message,
    duration: 3000,
    position: 'top',
    visibilityTime: 3000,
    autoHide: true,
    topOffset: 50,
  });
};

const vibrate = () => {
  // Note: For actual haptic feedback, install expo-haptics:
  // npx expo install expo-haptics
  // Then import * as Haptics from 'expo-haptics';
  // Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  console.log('[NotificationHandler] Vibrate triggered');
};

export default handleNotificationByType;
