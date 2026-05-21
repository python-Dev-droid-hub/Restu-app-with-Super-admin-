/** Web auth session — Bearer token for API/sockets; httpOnly cookies are sent via withCredentials. */

const ACCESS_KEY = 'auth_token';
const LEGACY_KEY = 'authToken';

export function getAuthToken(): string | null {
  return (
    sessionStorage.getItem(ACCESS_KEY) ||
    localStorage.getItem(ACCESS_KEY) ||
    localStorage.getItem(LEGACY_KEY)
  );
}

export function setAuthSession(accessToken: string, refreshToken?: string): void {
  sessionStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(LEGACY_KEY, accessToken);
  if (refreshToken) {
    sessionStorage.setItem('refresh_token', refreshToken);
  }
}

export function clearAuthSession(): void {
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem('refresh_token');
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(LEGACY_KEY);
  localStorage.removeItem('userRole');
  localStorage.removeItem('userData');
  localStorage.removeItem('userId');
}

export function hasAuthSession(): boolean {
  if (getAuthToken()) return true;
  try {
    const raw = localStorage.getItem('userData');
    if (!raw) return false;
    const user = JSON.parse(raw);
    return Boolean(user?.role);
  } catch {
    return false;
  }
}
