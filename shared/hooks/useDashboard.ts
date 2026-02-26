import { useState, useEffect } from 'react';
import { dashboardApi, AdminStats, CustomerStats, RiderStats, WaiterStats, ChefStats, ManagerStats } from '../api/dashboard';

// Generic hook for fetching dashboard stats
function useDashboardStats<T>(
  fetchFn: () => Promise<{ success: boolean; data: T; message: string }>
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchFn();
      if (response.success) {
        setData(response.data);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchFn]);

  return { data, loading, error, refetch: fetchData };
}

// Admin Dashboard Stats Hook
export function useAdminStats() {
  return useDashboardStats<AdminStats>(dashboardApi.getAdminStats);
}

// Customer Dashboard Stats Hook
export function useCustomerStats() {
  return useDashboardStats<CustomerStats>(dashboardApi.getCustomerStats);
}

// Rider Dashboard Stats Hook
export function useRiderStats() {
  return useDashboardStats<RiderStats>(dashboardApi.getRiderStats);
}

// Waiter Dashboard Stats Hook
export function useWaiterStats() {
  return useDashboardStats<WaiterStats>(dashboardApi.getWaiterStats);
}

// Chef Dashboard Stats Hook
export function useChefStats() {
  return useDashboardStats<ChefStats>(dashboardApi.getChefStats);
}

// Manager Dashboard Stats Hook
export function useManagerStats() {
  return useDashboardStats<ManagerStats>(dashboardApi.getManagerStats);
}
