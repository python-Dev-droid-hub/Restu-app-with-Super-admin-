import { api } from '../components/api/client';

/**
 * Registers device push token with backend (FCM).
 * Wire expo-notifications or @react-native-firebase/messaging to obtain the token,
 * then call this after login.
 */
export async function registerDeviceForPush(fcmToken: string): Promise<boolean> {
  const token = String(fcmToken || '').trim();
  if (!token) return false;

  try {
    const response = await api.post('/notifications/register-device', {
      fcmToken: token,
      token,
    });
    return response.success === true;
  } catch (error) {
    console.warn('[Push] register-device failed:', error);
    return false;
  }
}
