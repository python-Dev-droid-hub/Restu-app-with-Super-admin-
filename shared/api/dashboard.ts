import { api } from './client';

// Admin Dashboard Types
export interface AdminStats {
  totalUsers: number;
  totalRestaurants: number;
  totalOrders: number;
  totalRevenue: number;
  usersChange: number;
  restaurantsChange: number;
  ordersChange: number;
  revenueChange: number;
}

// Customer Dashboard Types
export interface CustomerStats {
  totalOrders: number;
  recentOrders: any[];
  favorites: any[];
}

// Rider Dashboard Types
export interface RiderStats {
  assignedDeliveries: number;
  completedDeliveries: number;
  todayEarnings: number;
  weeklyEarnings: number;
}

// Waiter Dashboard Types
export interface WaiterStats {
  activeTables: number;
  ordersToServe: number;
  recentOrders: any[];
}

// Chef Dashboard Types
export interface ChefStats {
  pendingOrders: number;
  preparingOrders: number;
  completedToday: number;
  avgPreparationTime: number;
}

// Manager Dashboard Types
export interface ManagerStats {
  totalOrders: number;
  todayOrders: number;
  revenue: number;
  activeStaff: number;
}

// Dashboard API endpoints
export const dashboardApi = {
  // Admin
  getAdminStats: async () => {
    return api.get<AdminStats>('/dashboard/admin/stats');
  },

  // Customer
  getCustomerStats: async () => {
    return api.get<CustomerStats>('/dashboard/customer/stats');
  },

  // Rider
  getRiderStats: async () => {
    return api.get<RiderStats>('/dashboard/rider/stats');
  },

  // Waiter
  getWaiterStats: async () => {
    return api.get<WaiterStats>('/dashboard/waiter/stats');
  },

  // Chef
  getChefStats: async () => {
    return api.get<ChefStats>('/dashboard/chef/stats');
  },

  // Manager
  getManagerStats: async () => {
    return api.get<ManagerStats>('/dashboard/manager/stats');
  },
};
