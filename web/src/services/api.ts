import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig, AxiosError } from 'axios';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const sanitizeApiBaseUrl = (rawUrl?: string): string | null => {
  const value = rawUrl?.trim();
  if (!value) return null;
  const normalized = value.replace(/\/$/, '');
  return /^https?:\/\/[^/\s]+/i.test(normalized) ? normalized : null;
};

const resolveApiBaseUrl = (): string => {
  const envUrl = sanitizeApiBaseUrl(import.meta.env.VITE_API_URL);
  if (envUrl) return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  
  if (import.meta.env.DEV) {
    return '/api';
  }
  
  if (typeof window !== 'undefined') {
    const { protocol, host } = window.location;
    // Default to the same host but port 3101 if no env var is provided
    // This is a common fallback but VITE_API_URL should ideally be set in production
    return `${protocol}//${host.split(':')[0]}:3000/api`;
  }
  
  return 'http://localhost:3000/api';
};

const API_BASE_URL = resolveApiBaseUrl();

class ApiClient {
  private instance: AxiosInstance;
  private hasHandledUnauthorized = false;

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.instance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('auth_token') || localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
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
          // Token expired/invalid: clear storage and force re-auth
          localStorage.removeItem('auth_token');
          localStorage.removeItem('authToken');
          localStorage.removeItem('userRole');
          localStorage.removeItem('userData');
          delete this.instance.defaults.headers.common.Authorization;

          if (!this.hasHandledUnauthorized && typeof window !== 'undefined') {
            this.hasHandledUnauthorized = true;
            const currentPath = window.location.pathname || '';
            if (!currentPath.startsWith('/login')) {
              window.location.replace('/login');
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private async request<T>(method: string, url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.instance.request({
        method,
        url,
        data,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        const responseData = error.response.data || {};
        const details = Array.isArray(responseData?.details)
          ? responseData.details.map((d: any) => d?.message || d?.path?.join?.('.') || '').filter(Boolean).join(', ')
          : '';
        const backendMessage =
          responseData?.error ||
          responseData?.message ||
          details ||
          error.message ||
          'Request failed';
        return {
          success: false,
          error: backendMessage,
        };
      }
      return {
        success: false,
        error: error.message || 'Network error - please check if server is running',
      };
    }
  }

  // Generic HTTP methods for flexible API calls
  async get<T>(url: string): Promise<ApiResponse<T>> {
    return this.request('GET', url);
  }

  async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request('POST', url, data);
  }

  async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request('PUT', url, data);
  }

  async patch<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request('PATCH', url, data);
  }

  async delete<T>(url: string): Promise<ApiResponse<T>> {
    return this.request('DELETE', url);
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

  // Image Upload
  async uploadImage(base64Data: string, filename: string) {
    return this.request('POST', '/upload', {
      image: base64Data,
      filename: filename,
    });
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
    return this.request('GET', '/branches');
  }

  async createRestaurant(data: any) {
    return this.request('POST', '/branches', data);
  }

  async updateRestaurant(restaurantId: string, data: any) {
    return this.request('PUT', `/branches/${restaurantId}`, data);
  }

  async deleteRestaurant(restaurantId: string) {
    return this.request('DELETE', `/branches/${restaurantId}`);
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

  async getAdminDashboardStats(params?: { period?: string; branchId?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.period) queryParams.append('period', params.period);
    if (params?.branchId && params.branchId !== 'all') queryParams.append('branchId', params.branchId);
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request('GET', `/dashboard/admin/stats${queryString}`);
  }

  async getAdminWaitersPerformance(params?: { period?: string; branchId?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.period) queryParams.append('period', params.period);
    if (params?.branchId && params.branchId !== 'all') queryParams.append('branchId', params.branchId);
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request('GET', `/dashboard/admin/performance/waiters${queryString}`);
  }

  async getAdminRidersPerformance(params?: { period?: string; branchId?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.period) queryParams.append('period', params.period);
    if (params?.branchId && params.branchId !== 'all') queryParams.append('branchId', params.branchId);
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request('GET', `/dashboard/admin/performance/riders${queryString}`);
  }

  async getAdminBranchesPerformance(params?: { period?: string; branchId?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.period) queryParams.append('period', params.period);
    if (params?.branchId && params.branchId !== 'all') queryParams.append('branchId', params.branchId);
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request('GET', `/dashboard/admin/performance/branches${queryString}`);
  }

  async getAdminOrders(params?: { limit?: number; period?: string; branchId?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.period) queryParams.append('period', params.period);
    if (params?.branchId && params.branchId !== 'all') queryParams.append('branchId', params.branchId);
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request('GET', `/orders${queryString}`);
  }

  async getAdminProducts(params?: { limit?: number; branchId?: string; activationBranchId?: string; onlyActivated?: boolean }) {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.branchId && params.branchId !== 'all') queryParams.append('branchId', params.branchId);
    if (params?.activationBranchId && params.activationBranchId !== 'all') queryParams.append('activationBranchId', params.activationBranchId);
    if (params?.onlyActivated) queryParams.append('onlyActivated', 'true');
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request('GET', `/menu/admin/products${queryString}`);
  }

  async getAllBranches() {
    return this.request('GET', '/branches');
  }

  // Dashboard Analytics
  async getDashboardAnalytics(params?: { range?: string }) {
    const queryString = params?.range ? `?range=${params.range}` : '';
    return this.request('GET', `/dashboard/admin/analytics${queryString}`);
  }

  // Super Admin Dashboard
  async getSuperAdminStats() {
    return this.request('GET', '/dashboard/superadmin/stats');
  }

  async getSuperAdminBranches() {
    return this.request('GET', '/dashboard/superadmin/branches');
  }

  async getSuperAdminRevenue(params?: { range?: string }) {
    const queryString = params?.range ? `?range=${params.range}` : '';
    return this.request('GET', `/dashboard/superadmin/revenue${queryString}`);
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

  // Admin: Mark any notification as read
  async markAdminNotificationAsRead(notificationId: string) {
    return this.request('PUT', `/notifications/admin/${notificationId}/read`);
  }

  async markNotificationAsRead(notificationId: string) {
    return this.request('PUT', `/notifications/${notificationId}/read`);
  }

  // Reports/Analytics
  async getReports(params?: { startDate?: string; endDate?: string }) {
    const queryString = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
    return this.request('GET', `/dashboard/admin/analytics${queryString}`);
  }

  // Settings
  async getSettings() {
    return this.request('GET', '/settings');
  }

  async updateSettings(data: any) {
    return this.request('PUT', '/settings', data);
  }

  // Product Sizes
  async getProductSizes() {
    return this.request('GET', '/product-sizes/sizes');
  }

  async createProductSize(data: any) {
    return this.request('POST', '/product-sizes', data);
  }

  async updateProductSize(id: string, data: any) {
    return this.request('PUT', `/product-sizes/${id}`, data);
  }

  async deleteProductSize(id: string) {
    return this.request('DELETE', `/product-sizes/${id}`);
  }

  // Tables
  async getTables() {
    return this.request('GET', '/tables');
  }

  async createTable(data: any) {
    return this.request('POST', '/tables', data);
  }

  async updateTable(id: string, data: any) {
    return this.request('PUT', `/tables/${id}`, data);
  }

  async deleteTable(id: string) {
    return this.request('DELETE', `/tables/${id}`);
  }

  // Banners
  async getBanners() {
    return this.request('GET', '/banners');
  }

  async createBanner(data: any) {
    return this.request('POST', '/banners', data);
  }

  async updateBanner(id: string, data: any) {
    return this.request('PUT', `/banners/${id}`, data);
  }

  async deleteBanner(id: string) {
    return this.request('DELETE', `/banners/${id}`);
  }

  // Deals
  async getDeals(params?: { branch?: string; isActive?: boolean; page?: number; limit?: number }) {
    const queryString = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
    return this.request('GET', `/deals${queryString}`);
  }

  async getActiveDeals(branch?: string) {
    const queryString = branch ? `?branch=${branch}` : '';
    return this.request('GET', `/deals/active${queryString}`);
  }

  async getDealById(id: string) {
    return this.request('GET', `/deals/${id}`);
  }

  async createDeal(data: any) {
    return this.request('POST', '/deals', data);
  }

  async updateDeal(id: string, data: any) {
    return this.request('PUT', `/deals/${id}`, data);
  }

  async deleteDeal(id: string) {
    return this.request('DELETE', `/deals/${id}`);
  }

  // Deal Campaigns
  async getDealCampaigns() {
    return this.request('GET', '/deals/campaigns');
  }

  async getDealCampaignById(id: string) {
    return this.request('GET', `/deals/campaigns/${id}`);
  }

  async createDealCampaign(data: any) {
    return this.request('POST', '/deals/campaigns', data);
  }

  async updateDealCampaign(id: string, data: any) {
    return this.request('PATCH', `/deals/campaigns/${id}`, data);
  }

  async deleteDealCampaign(id: string) {
    return this.request('DELETE', `/deals/campaigns/${id}`);
  }

  async addDealToCampaign(campaignId: string, data: any) {
    return this.request('POST', `/deals/campaigns/${campaignId}/deals`, data);
  }

  async updateDealInCampaign(campaignId: string, dealId: string, data: any) {
    return this.request('PATCH', `/deals/campaigns/${campaignId}/deals/${dealId}`, data);
  }

  async deleteDealFromCampaign(campaignId: string, dealId: string) {
    return this.request('DELETE', `/deals/campaigns/${campaignId}/deals/${dealId}`);
  }

  // Branches (additional methods)
  async getBranches() {
    return this.request('GET', '/branches');
  }

  async getBranchById(id: string) {
    return this.request('GET', `/branches/${id}`);
  }

  async createBranch(data: any) {
    return this.request('POST', '/branches', data);
  }

  async updateBranch(id: string, data: any) {
    return this.request('PUT', `/branches/${id}`, data);
  }

  async deleteBranch(id: string) {
    return this.request('DELETE', `/branches/${id}`);
  }

  async activateBranch(id: string) {
    return this.request('PATCH', `/branches/${id}/activate`);
  }

  async deactivateBranch(id: string) {
    return this.request('PATCH', `/branches/${id}/deactivate`);
  }

  // Coupons
  async getCoupons() {
    return this.request('GET', '/coupons');
  }

  async getCouponById(id: string) {
    return this.request('GET', `/coupons/${id}`);
  }

  async createCoupon(data: any) {
    return this.request('POST', '/coupons', data);
  }

  async updateCoupon(id: string, data: any) {
    return this.request('PUT', `/coupons/${id}`, data);
  }

  async deleteCoupon(id: string) {
    return this.request('DELETE', `/coupons/${id}`);
  }

  // Users/Customers (additional methods)
  async getUsers(params?: { role?: string; page?: number; limit?: number }) {
    const queryString = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
    return this.request('GET', `/users${queryString}`);
  }

  async updateUser(id: string, data: any) {
    return this.request('PUT', `/users/${id}`, data);
  }

  // Reports
  async getSalesReport(params?: { startDate?: string; endDate?: string; branchId?: string }) {
    const queryString = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
    return this.request('GET', `/dashboard/admin/sales-report${queryString}`);
  }

  async getOrderReport(params?: { startDate?: string; endDate?: string; branchId?: string }) {
    const queryString = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
    return this.request('GET', `/dashboard/admin/order-report${queryString}`);
  }

  // Mark all notifications as read
  async markAllNotificationsAsRead() {
    return this.request('PUT', '/notifications/mark-all-read');
  }

  // Admin: Delete any notification
  async deleteAdminNotification(id: string) {
    return this.request('DELETE', `/notifications/admin/${id}`);
  }

  // Delete notification (user's own)
  async deleteNotification(id: string) {
    return this.request('DELETE', `/notifications/${id}`);
  }

  // Reset settings
  async resetSettings() {
    return this.request('POST', '/settings/reset');
  }

  // Helper function to get full image URL
  getImageUrl(imagePath: string | undefined): string {
    if (!imagePath) return '';
    const lower = imagePath.trim().toLowerCase();
    if (lower.startsWith('file:')) return '';
    // If already a full URL, return as-is
    if (
      imagePath.startsWith('http://') ||
      imagePath.startsWith('https://') ||
      imagePath.startsWith('data:image') ||
      imagePath.startsWith('blob:')
    ) {
      return imagePath;
    }
    // Get base URL without /api suffix
    const serverBase = API_BASE_URL.replace('/api', '');
    // Ensure path starts with /
    const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    const finalUrl = `${serverBase}${path}`;
    return finalUrl;
  }
}

export const api = new ApiClient();
