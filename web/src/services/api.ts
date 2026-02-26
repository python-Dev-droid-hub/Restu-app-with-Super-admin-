import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig, AxiosError } from 'axios';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.instance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('auth_token');
        console.log(`API Request to ${config.url} - Token exists:`, !!token);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('Token preview:', token.substring(0, 20) + '...');
        } else {
          console.warn('No auth token found in localStorage!');
        }
        return config;
      },
      (error: AxiosError) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired, clear storage and redirect to login
          localStorage.removeItem('auth_token');
          localStorage.removeItem('userRole');
          localStorage.removeItem('userData');
          // Navigation would be handled by the app
        }
        return Promise.reject(error);
      }
    );
  }

  private async request<T>(method: string, url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      console.log(`API Request: ${method} ${url}`, data);
      const response: AxiosResponse<ApiResponse<T>> = await this.instance.request({
        method,
        url,
        data,
      });
      console.log(`API Response: ${method} ${url}`, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`API Error: ${method} ${url}`, error);
      if (error.response) {
        return {
          success: false,
          error: error.response.data?.message || error.message || 'Request failed',
        };
      }
      return {
        success: false,
        error: error.message || 'Network error - please check if server is running',
      };
    }
  }

  // Products/Menu Management
  async getAllProducts() {
    return this.request('GET', '/menu/admin/products');
  }

  async getAllCategories() {
    return this.request('GET', '/menu/admin/categories');
  }

  async createCategory(data: any) {
    return this.request('POST', '/menu/admin/categories', data);
  }

  async updateCategory(categoryId: string, data: any) {
    return this.request('PUT', `/menu/admin/categories/${categoryId}`, data);
  }

  async deleteCategory(categoryId: string) {
    return this.request('DELETE', `/menu/admin/categories/${categoryId}`);
  }

  async createProduct(data: any) {
    return this.request('POST', '/menu/admin/products', data);
  }

  async updateProduct(productId: string, data: any) {
    return this.request('PUT', `/menu/admin/products/${productId}`, data);
  }

  async deleteProduct(productId: string) {
    return this.request('DELETE', `/menu/admin/products/${productId}`);
  }

  // User Management
  async getAllUsers() {
    return this.request('GET', '/users');
  }

  async getUserById(userId: string) {
    return this.request('GET', `/users/${userId}`);
  }

  async deactivateUser(userId: string) {
    return this.request('PUT', `/users/${userId}/deactivate`);
  }

  async deleteUser(userId: string) {
    return this.request('DELETE', `/users/${userId}`);
  }

  // Restaurant/Branch Management
  async getAllRestaurants() {
    return this.request('GET', '/restaurants');
  }

  async createRestaurant(data: any) {
    return this.request('POST', '/restaurants', data);
  }

  async updateRestaurant(restaurantId: string, data: any) {
    return this.request('PUT', `/restaurants/${restaurantId}`, data);
  }

  async deleteRestaurant(restaurantId: string) {
    return this.request('DELETE', `/restaurants/${restaurantId}`);
  }

  // Orders
  async getAllOrders() {
    return this.request('GET', '/orders/admin/all');
  }

  async updateOrderStatus(orderId: string, status: string) {
    return this.request('PUT', `/orders/${orderId}/status`, { status });
  }

  // Dashboard/Analytics
  async getDashboardStats() {
    return this.request('GET', '/dashboard/admin/stats');
  }

  async getReports(params?: { startDate?: string; endDate?: string }) {
    const queryString = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
    return this.request('GET', `/dashboard/admin/analytics${queryString}`);
  }

  // Notifications
  async getAdminNotifications(params?: { page?: number; limit?: number }) {
    const queryString = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
    return this.request('GET', `/notifications/admin${queryString}`);
  }

  async getNotificationUnreadCount() {
    return this.request('GET', '/notifications/admin/unread-count');
  }

  async getRecentNotifications(limit?: number) {
    const queryString = limit ? `?limit=${limit}` : '';
    return this.request('GET', `/notifications/admin/recent${queryString}`);
  }

  async markNotificationAsRead(notificationId: string) {
    return this.request('PUT', `/notifications/${notificationId}/read`);
  }

  // Settings
  async getSettings() {
    return this.request('GET', '/settings');
  }

  async updateSettings(data: any) {
    return this.request('PUT', '/settings', data);
  }
}

export const api = new ApiClient();
