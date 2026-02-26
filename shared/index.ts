// API Client
export { api, ApiClient, setAuthToken, getAuthToken } from './api/client';
export type { ApiResponse, ApiError } from './api/client';

// Auth API
export { authApi } from './api/auth';
export type { User, Tokens, LoginCredentials, RegisterData, PasswordResetData } from './api/auth';

// Dashboard API
export { dashboardApi } from './api/dashboard';
export type { AdminStats, CustomerStats, RiderStats, WaiterStats, ChefStats, ManagerStats } from './api/dashboard';

// Auth Provider
export { AuthProvider, AuthContext } from './auth/AuthProvider';
export type { AuthContextValue } from './auth/AuthProvider';

// Hooks
export { useAuth } from './hooks/useAuth';
export {
  useLogin,
  useRegister,
  useLogout,
  usePasswordReset,
  useEmailVerification,
} from './hooks/useAuthActions';
export {
  useAdminStats,
  useCustomerStats,
  useRiderStats,
  useWaiterStats,
  useChefStats,
  useManagerStats,
} from './hooks/useDashboard';

// Dashboard Components
export { RoleRouter, getDashboardPath, useRoleRedirect } from './dashboards/components/RoleRouter';
export { DashboardLayout } from './layouts/DashboardLayout';
export type { NavItem } from './layouts/DashboardLayout';
export { StatCard } from './dashboards/components/StatCard';
export { NavigationMenu, getNavigationItems, useNavigation } from './dashboards/components/NavigationMenu';
export type { NavItem as NavigationItem } from './dashboards/components/NavigationMenu';

// Admin Dashboard Components
export { AdminDashboard } from './dashboards/AdminDashboard/AdminDashboard';
export { UserManagement } from './dashboards/AdminDashboard/UserManagement';
export { RestaurantManagement } from './dashboards/AdminDashboard/RestaurantManagement';
export { Analytics } from './dashboards/AdminDashboard/Analytics';

// Customer Dashboard
export { CustomerDashboard } from './dashboards/CustomerDashboard/CustomerDashboard';

// Rider Dashboard
export { RiderDashboard } from './dashboards/RiderDashboard/RiderDashboard';

// Waiter Dashboard
export { WaiterDashboard } from './dashboards/WaiterDashboard/WaiterDashboard';

// Chef Dashboard
export { ChefDashboard } from './dashboards/ChefDashboard/ChefDashboard';

// Branch Manager Dashboard
export { BranchManagerDashboard } from './dashboards/BranchManagerDashboard/BranchManagerDashboard';
