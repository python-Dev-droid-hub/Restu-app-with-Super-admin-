import axios, { AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

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

    const getMetroHost = (): string | null => {
      const scriptURL = (NativeModules as any)?.SourceCode?.scriptURL as string | undefined;
      if (!scriptURL) {
        return null;
      }

      try {
        return new URL(scriptURL).hostname || null;
      } catch {
        const match = scriptURL.match(/https?:\/\/([^/:]+)/i);
        return match?.[1] || null;
      }
    };

    const getConfiguredAppApiUrl = (): string | null => {
      return normalizeApiUrl(appConfig?.expo?.extra?.apiUrl);
    };

    const resolveDevelopmentApiConfig = (): { url: string; source: string } => {
      const configuredUrl = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL);
      if (configuredUrl) {
        return { url: configuredUrl, source: 'EXPO_PUBLIC_API_URL' };
      }

      const appConfigUrl = getConfiguredAppApiUrl();
      if (appConfigUrl) {
        return { url: appConfigUrl, source: 'app.json extra.apiUrl' };
      }

      const metroHost = getMetroHost();
      if (metroHost) {
        return { url: `http://${metroHost}:3000/api`, source: 'NativeModules.SourceCode.scriptURL' };
      }

      if (Platform.OS === 'android') {
        return { url: 'http://10.0.2.2:3000/api', source: 'android emulator fallback' };
      }

      return { url: 'http://localhost:3000/api', source: 'ios localhost fallback' };
    };

    const prodApiUrl =
      normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL_PRODUCTION) || 'https://your-production-api.com/api';

    const devConfig = resolveDevelopmentApiConfig();
    this.baseURL = __DEV__ ? devConfig.url : prodApiUrl;
    this.baseURLSource = __DEV__ ? devConfig.source : 'EXPO_PUBLIC_API_URL_PRODUCTION';

    console.log('[API] Base URL:', this.baseURL);
    console.log('[API] Base URL source:', this.baseURLSource);
    console.log('[API] Host sources:', {
      env: process.env.EXPO_PUBLIC_API_URL || null,
      appConfig: appConfig?.expo?.extra?.apiUrl || null,
      sourceCode: (NativeModules as any)?.SourceCode?.scriptURL || null,
    });
    console.log('[API] Environment:', __DEV__ ? 'development' : 'production');

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
        console.log('[API Request]', config.method?.toUpperCase(), config.url);
        return config;
      },
      (error: any) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.instance.interceptors.response.use(
      (response: any) => {
        console.log('[API Response]', response.status, response.config.url);
        return response;
      },
      async (error: any) => {
        console.error(
          '[API Error]',
          error.message,
          error.code,
          '| baseURL:',
          error.config?.baseURL || this.baseURL
        );
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
      return {
        success: false,
        message: error.response?.data?.message || 'Network error',
      };
    }
  }

  async post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.instance.post(url, data);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Network error',
      };
    }
  }

  async put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.instance.put(url, data);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Network error',
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
      return {
        success: false,
        message: error.response?.data?.message || 'Network error',
      };
    }
  }

  async delete<T = any>(url: string): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.instance.delete(url);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Network error',
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
      return {
        success: false,
        message: error.response?.data?.message || 'Network error',
      };
    }
  }
}

export const api = new ApiClient();
export default api;
