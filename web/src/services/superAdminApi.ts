import axios, { type AxiosInstance, type InternalAxiosRequestConfig, isAxiosError } from 'axios';
import {
  clearSuperAdminSession,
  getSuperAdminToken,
  setSuperAdminSession,
} from '../utils/superAdminAuthStorage';
import { resolveApiBaseUrl } from '../utils/resolveApiBaseUrl';

function superAdminBaseUrl(): string {
  const base = resolveApiBaseUrl().replace(/\/$/, '');
  return `${base}/superadmin`;
}

let refreshPromise: Promise<boolean> | null = null;

export function superAdminApiErrorMessage(err: unknown, fallback = 'Request failed'): string {
  if (isAxiosError(err)) {
    const msg = (err.response?.data as { message?: string })?.message;
    return msg || err.message || fallback;
  }
  return err instanceof Error ? err.message : fallback;
}

export async function refreshSuperAdminSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refresh = localStorage.getItem('superadmin_refresh');
    if (!refresh) {
      clearSuperAdminSession();
      return false;
    }
    try {
      const res = await axios.post(`${superAdminBaseUrl()}/auth/refresh`, { refreshToken: refresh });
      const tokens = res.data?.data?.tokens;
      if (tokens?.accessToken) {
        setSuperAdminSession(tokens.accessToken, tokens.refreshToken);
        return true;
      }
    } catch {
      /* invalid or expired refresh */
    }
    clearSuperAdminSession();
    return false;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

class SuperAdminApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      config.baseURL = superAdminBaseUrl();
      const token = getSuperAdminToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    this.instance.interceptors.response.use(
      (res) => res,
      async (error) => {
        const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
        const url = String(original?.url || '');
        const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/refresh');

        if (error.response?.status === 401 && isAuthRoute) {
          clearSuperAdminSession();
        } else if (error.response?.status === 401 && original && !original._retry && !isAuthRoute) {
          original._retry = true;
          const refreshed = await refreshSuperAdminSession();
          if (refreshed) {
            original.headers.Authorization = `Bearer ${getSuperAdminToken()}`;
            return this.instance(original);
          }
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/superadmin/login')) {
            window.location.replace('/superadmin/login');
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T = unknown>(url: string, params?: Record<string, unknown>) {
    const res = await this.instance.get(url, { params });
    return res.data as T;
  }

  async post<T = unknown>(url: string, data?: unknown) {
    const res = await this.instance.post(url, data);
    return res.data as T;
  }

  async patch<T = unknown>(url: string, data?: unknown) {
    const res = await this.instance.patch(url, data);
    return res.data as T;
  }

  async delete<T = unknown>(url: string, data?: unknown) {
    const res = await this.instance.delete(url, { data });
    return res.data as T;
  }
}

export const superAdminApi = new SuperAdminApiClient();
