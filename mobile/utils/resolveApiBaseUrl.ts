import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const DEFAULT_API_PORT = '3101';

export function normalizeApiUrl(value?: string | null): string | null {
  const trimmedValue = String(value || '').trim();
  if (!trimmedValue) {
    return null;
  }

  return trimmedValue.endsWith('/api')
    ? trimmedValue
    : `${trimmedValue.replace(/\/+$/, '')}/api`;
}

/** Same LAN IP Expo uses for Metro (from QR / exp://192.168.x.x:8081). */
export function getExpoDevMachineHost(): string | null {
  const debuggerHost =
    Constants.expoConfig?.hostUri ??
    (Constants as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } }).manifest2?.extra
      ?.expoClient?.hostUri ??
    Constants.manifest?.debuggerHost;

  if (!debuggerHost) {
    return null;
  }

  const host = String(debuggerHost).split(':')[0]?.trim();
  if (!host || host === 'localhost' || host === '127.0.0.1') {
    return null;
  }

  return host;
}

export function isLocalOrPrivateNetworkUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.endsWith('.local')
    ) {
      return true;
    }

    const octets = hostname.split('.').map((part) => Number(part));
    if (octets.length !== 4 || octets.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
      return false;
    }

    const [a, b] = octets;
    if (a === 10) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true;

    return false;
  } catch {
    return false;
  }
}

export function resolveDevelopmentApiUrl(): { url: string; source: string } {
  const explicit = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL);
  if (explicit) {
    return { url: explicit, source: 'EXPO_PUBLIC_API_URL' };
  }

  const port = String(process.env.EXPO_PUBLIC_API_DEV_PORT || DEFAULT_API_PORT).trim();
  const expoHost = getExpoDevMachineHost();

  if (expoHost) {
    return {
      url: `http://${expoHost}:${port}/api`,
      source: `Expo Metro host (${expoHost}:${port})`,
    };
  }

  const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return {
    url: `http://${host}:${port}/api`,
    source: `default ${Platform.OS} dev host (${host}:${port})`,
  };
}

export function resolveProductionApiUrl(appConfigApiUrl?: string | null): {
  url: string;
  source: string;
} {
  const PRODUCTION_FALLBACK = 'https://api.your-restaurant-app.com/api';

  const candidates: Array<{ url: string | null; source: string }> = [
    {
      url: normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL_PRODUCTION),
      source: 'EXPO_PUBLIC_API_URL_PRODUCTION',
    },
    { url: normalizeApiUrl(appConfigApiUrl), source: 'app.json extra.apiUrl' },
  ];

  for (const candidate of candidates) {
    if (!candidate.url) continue;
    if (isLocalOrPrivateNetworkUrl(candidate.url)) continue;
    return { url: candidate.url, source: candidate.source };
  }

  const productionOverride = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL_PRODUCTION);
  if (productionOverride) {
    return {
      url: productionOverride,
      source: 'EXPO_PUBLIC_API_URL_PRODUCTION (private network)',
    };
  }

  return { url: PRODUCTION_FALLBACK, source: 'default production fallback' };
}

/**
 * In Expo dev only: force which backend to use without rebuilding the APK.
 * - local (default): PC/LAN server on EXPO_PUBLIC_API_DEV_PORT (3101)
 * - production: VPS URL from EXPO_PUBLIC_API_URL_PRODUCTION
 */
export function resolveApiTarget(): 'local' | 'production' {
  const target = String(process.env.EXPO_PUBLIC_API_TARGET || 'local').toLowerCase();
  return target === 'production' || target === 'prod' || target === 'vps' ? 'production' : 'local';
}

export function resolveApiBaseUrl(appConfigApiUrl?: string | null): {
  url: string;
  source: string;
  mode: 'development' | 'production';
} {
  const appEnv = String(process.env.EXPO_PUBLIC_APP_ENV || '').toLowerCase();
  const isReleaseBuild = appEnv === 'production' || appEnv === 'prod';
  const isExpoDev = __DEV__ && !isReleaseBuild;

  if (isExpoDev) {
    if (resolveApiTarget() === 'production') {
      const prod = resolveProductionApiUrl(appConfigApiUrl);
      return {
        ...prod,
        mode: 'development',
        source: `${prod.source} (EXPO_PUBLIC_API_TARGET=production)`,
      };
    }
    const dev = resolveDevelopmentApiUrl();
    return { ...dev, mode: 'development' };
  }

  const prod = resolveProductionApiUrl(appConfigApiUrl);
  return { ...prod, mode: 'production' };
}
