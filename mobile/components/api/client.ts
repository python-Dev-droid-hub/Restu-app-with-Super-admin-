import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { resolveApiBaseUrl } from '../../utils/resolveApiBaseUrl';
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
} from '../../utils/secureAuthStorage';

const appConfig = require('../../app.json');

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

class ApiClient {
  private instance: AxiosInstance;
  private baseURL: string;
  private baseURLSource: string;
  private refreshInFlight: Promise<boolean> | null = null;
  private buildRequestTarget(config: any, fallbackUrl: string): string {
    const baseURL = String(config?.baseURL || this.baseURL || '');
    const url = String(config?.url || fallbackUrl || '');
    if (!baseURL) {
      return url;
    }
    const trimmedBase = baseURL.replace(/\/+$/, '');
    const trimmedUrl = url.replace(/^\/+/, '');
    return `${trimmedBase}/${trimmedUrl}`;
  }

  constructor() {
    const resolvedConfig = resolveApiBaseUrl(appConfig?.expo?.extra?.apiUrl);
    this.baseURL = resolvedConfig.url;
    this.baseURLSource = resolvedConfig.source;

    if (__DEV__) {
      console.log('[API] Base URL:', this.baseURL);
      console.log('[API] Base URL source:', this.baseURLSource);
      console.log('[API] Mode:', resolvedConfig.mode);
      console.log('[API] Env:', {
        apiTarget: process.env.EXPO_PUBLIC_API_TARGET || 'local',
        devUrl: process.env.EXPO_PUBLIC_API_URL || '(auto from Expo Metro IP)',
        devPort: process.env.EXPO_PUBLIC_API_DEV_PORT || '3101',
        prodUrl: process.env.EXPO_PUBLIC_API_URL_PRODUCTION || null,
        appEnv: process.env.EXPO_PUBLIC_APP_ENV || '(unset)',
      });
      this.logDevServerReachability();
    }

    this.instance = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // Increased from 10s to 30s for slower networks
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.instance.interceptors.request.use(
      async (config: any) => {
        const token = await getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        if (__DEV__) {
          console.log('[API Request]', config.method?.toUpperCase(), config.url);
        }
        return config;
      },
      (error: any) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.instance.interceptors.response.use(
      (response: any) => {
        if (__DEV__) {
          console.log('[API Response]', response.status, response.config.url);
        }
        return response;
      },
      async (error: any) => {
        if (__DEV__) {
          console.error(
            '[API Error]',
            error.message,
            error.code,
            '| baseURL:',
            error.config?.baseURL || this.baseURL
          );
        }
        const originalRequest = error.config;
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          originalRequest._retry = true;
          const refreshed = await this.tryRefreshToken();
          if (refreshed) {
            const token = await getAccessToken();
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return this.instance(originalRequest);
          }
          await clearAuthTokens();
        }
        return Promise.reject(error);
      }
    );
  }

  private async tryRefreshToken(): Promise<boolean> {
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = (async () => {
      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) return false;
        const response = await axios.post(
          `${this.baseURL}/auth/refresh`,
          { refreshToken },
          { timeout: 15000, headers: { 'Content-Type': 'application/json' } }
        );
        const data = response.data?.data || response.data;
        const accessToken = data?.tokens?.accessToken || data?.accessToken;
        const newRefresh = data?.tokens?.refreshToken || data?.refreshToken;
        if (!accessToken) return false;
        await setAuthTokens(accessToken, newRefresh || refreshToken);
        return true;
      } catch {
        return false;
      } finally {
        this.refreshInFlight = null;
      }
    })();
    return this.refreshInFlight;
  }

  getBaseURL(): string {
    return this.baseURL;
  }

  private async logDevServerReachability(): Promise<void> {
    const healthUrl = this.baseURL.replace(/\/api\/?$/, '/health');
    try {
      const response = await fetch(healthUrl, { method: 'GET' });
      if (response.ok) {
        console.log('[API] Backend reachable:', healthUrl);
        return;
      }
      console.warn('[API] Backend responded with HTTP', response.status, '|', healthUrl);
    } catch {
      console.error(
        '[API] Cannot reach backend at',
        healthUrl,
        '— start server: cd server && pnpm dev (PORT must match EXPO_PUBLIC_API_DEV_PORT, default 3101)'
      );
    }
  }

  async get<T = any>(url: string): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.instance.get(url);
      return response.data;
    } catch (error: any) {
      const requestTarget = this.buildRequestTarget(error?.config, url);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.response?.data?.error ||
          (error?.response ? `Request failed (${error.response.status})` : `Network error (${error.code || 'NO_CODE'})`) +
            `: ${requestTarget}`,
      };
    }
  }

  async post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.instance.post(url, data);
      return response.data;
    } catch (error: any) {
      const requestTarget = this.buildRequestTarget(error?.config, url);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.response?.data?.error ||
          (error?.response ? `Request failed (${error.response.status})` : `Network error (${error.code || 'NO_CODE'})`) +
            `: ${requestTarget}`,
      };
    }
  }

  async put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.instance.put(url, data);
      return response.data;
    } catch (error: any) {
      const requestTarget = this.buildRequestTarget(error?.config, url);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.response?.data?.error ||
          (error?.response ? `Request failed (${error.response.status})` : `Network error (${error.code || 'NO_CODE'})`) +
            `: ${requestTarget}`,
      };
    }
  }

  async patch<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      // Mock response for profile updates during development
      if (url === '/users/current' && __DEV__) {
        console.log('🔧 DEV MODE: Mocking profile update response');
        return {
          success: true,
          data: {
            id: 'current',
            name: data?.display_name || 'Chef Michael',
            phone_number: data?.phone_number || '+92-300-1234567',
            specialization: data?.specialization || 'Italian Cuisine, Grilling',
            avatar: data?.profile_image || null,
            email: 'chef@restaurant.com',
            branch: 'Main Branch - Gulberg'
          } as T,
          message: 'Profile updated successfully (mock response)'
        };
      }

      const response: AxiosResponse<ApiResponse<T>> = await this.instance.patch(url, data);
      return response.data;
    } catch (error: any) {
      const requestTarget = this.buildRequestTarget(error?.config, url);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.response?.data?.error ||
          (error?.response ? `Request failed (${error.response.status})` : `Network error (${error.code || 'NO_CODE'})`) +
            `: ${requestTarget}`,
      };
    }
  }

  async delete<T = any>(url: string): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.instance.delete(url);
      return response.data;
    } catch (error: any) {
      const requestTarget = this.buildRequestTarget(error?.config, url);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.response?.data?.error ||
          (error?.response ? `Request failed (${error.response.status})` : `Network error (${error.code || 'NO_CODE'})`) +
            `: ${requestTarget}`,
      };
    }
  }

  async uploadFile<T = any>(url: string, formData: FormData): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.instance.patch(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error: any) {
      const requestTarget = this.buildRequestTarget(error?.config, url);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.response?.data?.error ||
          (error?.response ? `Request failed (${error.response.status})` : `Network error (${error.code || 'NO_CODE'})`) +
            `: ${requestTarget}`,
      };
    }
  }
}

export const api = new ApiClient();
export default api;
