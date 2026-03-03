import axios, { AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

class ApiClient {
  private instance: AxiosInstance;
  private baseURL: string;

  constructor() {
    // For mobile development, use the computer's IP address instead of localhost
    // Replace with your computer's IP address (run ipconfig/ifconfig to find it)
    this.baseURL = __DEV__
      ? 'http://192.168.18.179:3000/api'  // Replace with your computer's IP
      : 'http://your-production-api-url/api'; // For production

    console.log('[API] Base URL:', this.baseURL);

    this.instance = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
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
        console.error('[API Error]', error.message, error.code);
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
}

export const api = new ApiClient();
export default api;
