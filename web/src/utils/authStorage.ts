/** Web auth — token kept in memory; optional localStorage persist for non-rider roles. */

const ACCESS_KEY = 'auth_token';
const LEGACY_KEY = 'authToken';
const PERSIST_KEY = 'auth_persist';

let memoryAccessToken: string | null = null;
let memoryRefreshToken: string | null = null;

function readStoredRole(): string {
  const fromSession = sessionStorage.getItem('userRole');
  if (fromSession) return String(fromSession).trim().toUpperCase();
  try {
    const raw = sessionStorage.getItem('userData') || localStorage.getItem('userData');
    if (!raw) return '';
    const user = JSON.parse(raw);
    return String(user?.role || '').trim().toUpperCase();
  } catch {
    return '';
  }
}

function hydrateAuthFromStorage(): void {
  const token = localStorage.getItem(ACCESS_KEY) || localStorage.getItem(LEGACY_KEY);
  if (!token) return;

  if (localStorage.getItem(PERSIST_KEY) === '1') {
    memoryAccessToken = token;
    memoryRefreshToken = sessionStorage.getItem('refresh_token');
    return;
  }

  // Legacy sessions: restore admin/staff only — never auto-restore rider after refresh
  const role = readStoredRole();
  if (role && role !== 'RIDER') {
    memoryAccessToken = token;
    memoryRefreshToken = sessionStorage.getItem('refresh_token');
    localStorage.setItem(PERSIST_KEY, '1');
    return;
  }

  // Stale rider credentials from older builds
  if (role === 'RIDER') {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(LEGACY_KEY);
    localStorage.removeItem('userData');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
  }
}

hydrateAuthFromStorage();

export function getAuthToken(): string | null {
  return memoryAccessToken;
}

export function getRefreshToken(): string | null {
  return memoryRefreshToken;
}

export type AuthSessionOptions = {
  /** When false, session ends on page refresh (used for riders). Default true. */
  persist?: boolean;
};

export function setAuthSession(
  accessToken: string,
  refreshToken?: string,
  options: AuthSessionOptions = {}
): void {
  const persist = options.persist !== false;
  memoryAccessToken = accessToken;
  memoryRefreshToken = refreshToken ?? null;

  sessionStorage.setItem(ACCESS_KEY, accessToken);
  if (refreshToken) sessionStorage.setItem('refresh_token', refreshToken);

  if (persist) {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(LEGACY_KEY, accessToken);
    localStorage.setItem(PERSIST_KEY, '1');
  } else {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(LEGACY_KEY);
    localStorage.removeItem(PERSIST_KEY);
  }
}

export function setUserProfile(
  user: Record<string, unknown>,
  options: AuthSessionOptions = {}
): void {
  const persist = options.persist !== false;
  const role = String(user.role || '').trim().toUpperCase();
  const json = JSON.stringify({ ...user, role });

  sessionStorage.setItem('userData', json);
  if (role) sessionStorage.setItem('userRole', role);

  const id = user._id || user.id;
  if (id) sessionStorage.setItem('userId', String(id));

  if (persist) {
    localStorage.setItem('userData', json);
    if (role) localStorage.setItem('userRole', role);
    if (id) localStorage.setItem('userId', String(id));
  } else {
    localStorage.removeItem('userData');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
  }
}

export function getStoredRole(): string {
  const fromSession = sessionStorage.getItem('userRole');
  if (fromSession) return String(fromSession).trim().toUpperCase();
  try {
    const raw = localStorage.getItem('userData');
    if (!raw) return '';
    return String(JSON.parse(raw)?.role || '').trim().toUpperCase();
  } catch {
    return '';
  }
}

export function clearAuthSession(): void {
  memoryAccessToken = null;
  memoryRefreshToken = null;
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem('refresh_token');
  sessionStorage.removeItem('userData');
  sessionStorage.removeItem('userRole');
  sessionStorage.removeItem('userId');
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(LEGACY_KEY);
  localStorage.removeItem(PERSIST_KEY);
  localStorage.removeItem('userRole');
  localStorage.removeItem('userData');
  localStorage.removeItem('userId');
}

export function hasAuthSession(): boolean {
  return Boolean(getAuthToken());
}

export function isRiderEphemeralSession(): boolean {
  return getStoredRole() === 'RIDER' && localStorage.getItem(PERSIST_KEY) !== '1';
}
