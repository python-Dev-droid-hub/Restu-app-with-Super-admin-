import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { api } from '../components/api/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type PushNotificationPayload = {
  id?: string;
  _id?: string;
  type?: string;
  title?: string;
  message?: string;
  body?: string;
  data?: Record<string, unknown>;
};

let androidChannelReady = false;

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android' || androidChannelReady) return;
  await Notifications.setNotificationChannelAsync('orders', {
    name: 'Orders & alerts',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1A1A2E',
    sound: 'default',
    enableVibrate: true,
    showBadge: true,
  });
  androidChannelReady = true;
}

export async function requestPushPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.warn('[Push] Physical device required for notifications');
    return false;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

/** Register FCM/APNs device token with backend (for push when app is closed — requires Firebase on server). */
export async function registerDevicePushTokenWithServer(): Promise<boolean> {
  try {
    const granted = await requestPushPermissions();
    if (!granted) return false;

    await ensureAndroidChannel();

    let token = '';
    try {
      const device = await Notifications.getDevicePushTokenAsync();
      token = String(device?.data || '').trim();
    } catch (e) {
      console.warn('[Push] Native device token unavailable (add google-services.json for FCM):', e);
    }

    if (!token) {
      try {
        const expo = await Notifications.getExpoPushTokenAsync({
          projectId: '20b77239-f89f-4f35-afd4-4997e0f84e54',
        });
        token = String(expo?.data || '').trim();
      } catch (e) {
        console.warn('[Push] Expo push token failed:', e);
      }
    }

    if (!token) return false;

    const res: any = await api.post('/notifications/register-device', {
      fcmToken: token,
      token,
    });

    return Boolean(res?.success);
  } catch (error) {
    console.warn('[Push] registerDevicePushTokenWithServer failed:', error);
    return false;
  }
}

/** Show a system notification banner (works when app is backgrounded; needs socket while app runs). */
export async function presentSystemNotification(payload: PushNotificationPayload): Promise<void> {
  try {
    const granted = await requestPushPermissions();
    if (!granted) return;

    await ensureAndroidChannel();

    const title = String(payload.title || 'Restaurant App').trim() || 'Restaurant App';
    const body = String(payload.message || payload.body || '').trim() || 'New notification';
    const data: Record<string, string> = {
      type: String(payload.type || ''),
    };
    if (payload.data) {
      for (const [k, v] of Object.entries(payload.data)) {
        if (v != null) data[k] = String(v);
      }
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        data,
        ...(Platform.OS === 'android' ? { channelId: 'orders' } : {}),
      },
      trigger: null,
    });
  } catch (error) {
    console.warn('[Push] presentSystemNotification failed:', error);
  }
}

export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

export async function initializePushNotifications(): Promise<void> {
  await requestPushPermissions();
  await ensureAndroidChannel();
  await registerDevicePushTokenWithServer();
}
