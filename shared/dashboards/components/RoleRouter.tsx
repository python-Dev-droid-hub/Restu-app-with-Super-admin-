import { useAuth } from '../../hooks/useAuth';
import type { User } from '../../api/auth';

type UserRole = User['role'];

interface RoleRouterProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const roleDashboardPaths: Record<UserRole, string> = {
  ADMIN: '/admin',
  CUSTOMER: '/customer',
  RIDER: '/rider',
  WAITER: '/waiter',
  CHEF: '/chef',
  BRANCH_MANAGER: '/manager',
};

export function RoleRouter({ children, fallback: _fallback }: RoleRouterProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    window.location.href = '/login';
    return null;
  }

  const userRole = user.role;
  const currentPath = window.location.pathname;
  const allowedPath = roleDashboardPaths[userRole];

  // Check if user is accessing their allowed dashboard
  if (!currentPath.startsWith(allowedPath)) {
    window.location.href = allowedPath;
    return null;
  }

  return <>{children}</>;
}

export function getDashboardPath(role: UserRole): string {
  return roleDashboardPaths[role];
}

export function useRoleRedirect() {
  const { user } = useAuth();

  const redirectToDashboard = () => {
    if (user?.role) {
      const path = getDashboardPath(user.role);
      window.location.href = path;
    }
  };

  return { redirectToDashboard, getDashboardPath };
}
