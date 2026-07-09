const ACCESS_KEY = 'superadmin_token';
const REFRESH_KEY = 'superadmin_refresh';
const ADMIN_KEY = 'superadmin_user';

export function getSuperAdminToken(): string | null {
  return sessionStorage.getItem(ACCESS_KEY) || localStorage.getItem(ACCESS_KEY);
}

export function setSuperAdminSession(
  accessToken: string,
  refreshToken?: string,
  user?: Record<string, unknown>
): void {
  sessionStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(ACCESS_KEY, accessToken);
  if (refreshToken) {
    sessionStorage.setItem(REFRESH_KEY, refreshToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  }
  if (user) {
    localStorage.setItem(ADMIN_KEY, JSON.stringify(user));
  }
}

export function getSuperAdminUser(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(ADMIN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSuperAdminSession(): void {
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ADMIN_KEY);
}

export function hasSuperAdminSession(): boolean {
  return Boolean(getSuperAdminToken());
}
