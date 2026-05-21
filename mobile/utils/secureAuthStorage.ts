import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'secure_auth_access';
const REFRESH_KEY = 'secure_auth_refresh';
const LEGACY_ACCESS = 'authToken';
const LEGACY_REFRESH = 'refreshToken';

async function secureGet(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function secureSet(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

async function secureDelete(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* ignore */
  }
}

export async function migrateLegacyAuthTokens(): Promise<void> {
  const legacyAccess = await AsyncStorage.getItem(LEGACY_ACCESS);
  const legacyRefresh = await AsyncStorage.getItem(LEGACY_REFRESH);
  if (legacyAccess) {
    await secureSet(ACCESS_KEY, legacyAccess);
    await AsyncStorage.removeItem(LEGACY_ACCESS);
  }
  if (legacyRefresh) {
    await secureSet(REFRESH_KEY, legacyRefresh);
    await AsyncStorage.removeItem(LEGACY_REFRESH);
  }
}

export async function getAccessToken(): Promise<string | null> {
  const secure = await secureGet(ACCESS_KEY);
  if (secure) return secure;
  const legacy = await AsyncStorage.getItem(LEGACY_ACCESS);
  if (legacy) {
    await migrateLegacyAuthTokens();
    return legacy;
  }
  return null;
}

export async function getRefreshToken(): Promise<string | null> {
  return secureGet(REFRESH_KEY);
}

export async function setAuthTokens(accessToken: string, refreshToken?: string): Promise<void> {
  await secureSet(ACCESS_KEY, accessToken);
  await AsyncStorage.removeItem(LEGACY_ACCESS);
  if (refreshToken) {
    await secureSet(REFRESH_KEY, refreshToken);
    await AsyncStorage.removeItem(LEGACY_REFRESH);
  }
}

export async function clearAuthTokens(): Promise<void> {
  await secureDelete(ACCESS_KEY);
  await secureDelete(REFRESH_KEY);
  await AsyncStorage.multiRemove([LEGACY_ACCESS, LEGACY_REFRESH, 'userRole', 'userData', 'userId']);
}
