/**
 * Browser API base — always same-origin `/api` (Vite preview / nginx proxy → :3101).
 * Set VITE_API_DIRECT=true only for a separate API domain (not same VPS IP).
 */
export function resolveApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return '/api';
  }

  const forceDirect = import.meta.env.VITE_API_DIRECT === 'true';
  if (!forceDirect) {
    return '/api';
  }

  const envRaw = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (!envRaw || envRaw === '/api') {
    return '/api';
  }

  if (/^https?:\/\//i.test(envRaw)) {
    try {
      const apiUrl = new URL(envRaw.endsWith('/api') ? envRaw : `${envRaw.replace(/\/$/, '')}/api`);
      return apiUrl.toString().replace(/\/$/, '');
    } catch {
      return '/api';
    }
  }

  return '/api';
}

export function resolveApiOrigin(): string {
  const base = resolveApiBaseUrl();
  if (base.startsWith('http')) {
    return base.replace(/\/api\/?$/, '');
  }
  return window.location.origin;
}
