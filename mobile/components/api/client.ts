import axios, { AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    const normalizeApiUrl = (value?: string | null): string | null => {
      const trimmedValue = String(value || '').trim();
      if (!trimmedValue) {
        return null;
      }

      return trimmedValue.endsWith('/api')
        ? trimmedValue
        : `${trimmedValue.replace(/\/+$/, '')}/api`;
    };

    const PRODUCTION_API_FALLBACK = 'https://api.your-restaurant-app.com/api';

    const isLocalOrPrivateNetworkUrl = (value: string): boolean => {
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
    };

    const getConfiguredAppApiUrl = (): string | null => {
      return normalizeApiUrl(appConfig?.expo?.extra?.apiUrl);
    };

    const resolveApiConfig = (): { url: string; source: string } => {
      const configuredUrl = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL);
      if (configuredUrl) {
        if (!__DEV__ && isLocalOrPrivateNetworkUrl(configuredUrl)) {
          // Ignore local/private URLs in release builds.
        } else {
        return { url: configuredUrl, source: 'EXPO_PUBLIC_API_URL' };
        }
      }

      const configuredProductionUrl = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL_PRODUCTION);
      if (configuredProductionUrl) {
        if (!__DEV__ && isLocalOrPrivateNetworkUrl(configuredProductionUrl)) {
          // Ignore local/private URLs in release builds.
        } else {
        return { url: configuredProductionUrl, source: 'EXPO_PUBLIC_API_URL_PRODUCTION' };
        }
      }

      const appConfigUrl = getConfiguredAppApiUrl();
      if (appConfigUrl) {
        if (!__DEV__ && isLocalOrPrivateNetworkUrl(appConfigUrl)) {
          // Ignore local/private URLs in release builds.
        } else {
        return { url: appConfigUrl, source: 'app.json extra.apiUrl' };
        }
      }

      return { url: PRODUCTION_API_FALLBACK, source: 'default production fallback' };
    };

    const resolvedConfig = resolveApiConfig();
    this.baseURL = resolvedConfig.url;
    this.baseURLSource = resolvedConfig.source;

    if (__DEV__) {
      console.log('[API] Base URL:', this.baseURL);
      console.log('[API] Base URL source:', this.baseURLSource);
      console.log('[API] Host sources:', {
        env: process.env.EXPO_PUBLIC_API_URL || null,
        envProd: process.env.EXPO_PUBLIC_API_URL_PRODUCTION || null,
        appConfig: appConfig?.expo?.extra?.apiUrl || null,
      });
      console.log('[API] Environment:', __DEV__ ? 'development' : 'production');
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
        const token = await AsyncStorage.getItem('authToken');
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
        if (error.response?.status === 401) {
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('userRole');
        }
        return Promise.reject(error);
      }
    );
  }

  getBaseURL(): string {
    return this.baseURL;
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
