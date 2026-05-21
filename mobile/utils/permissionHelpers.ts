/**
 * Permission Helper Functions
 * Centralized role-based permission checks for the restaurant app
 */

// User Roles (SUPER_ADMIN kept for legacy accounts — treated as ADMIN in the app)
export type UserRole =
  | 'CUSTOMER'
  | 'RIDER'
  | 'BRANCH_MANAGER'
  | 'WAITER'
  | 'CHEF'
  | 'ADMIN'
  | 'SUPER_ADMIN';

export interface User {
  id: string;
  email: string;
  displayName?: string;
  role: UserRole;
  assignedBranchId?: string | null;
}

const normalizeRole = (userRole: UserRole | string): string =>
  String(userRole || '').toUpperCase();

/** Restaurant administrator (includes legacy SUPER_ADMIN accounts). */
export const isAdminRole = (userRole: UserRole | string): boolean => {
  const role = normalizeRole(userRole);
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
};

/** @deprecated Use isAdminRole — legacy SUPER_ADMIN is mapped to admin in the UI. */
export const isSuperAdmin = isAdminRole;

export const isBranchManager = (userRole: UserRole | string): boolean => {
  return normalizeRole(userRole) === 'BRANCH_MANAGER';
};

export const isChef = (userRole: UserRole | string): boolean => {
  return normalizeRole(userRole) === 'CHEF';
};

export const isWaiter = (userRole: UserRole | string): boolean => {
  return normalizeRole(userRole) === 'WAITER';
};

export const isRider = (userRole: UserRole | string): boolean => {
  return normalizeRole(userRole) === 'RIDER';
};

export const isCustomer = (userRole: UserRole | string): boolean => {
  return normalizeRole(userRole) === 'CUSTOMER';
};

export const canManageBranches = isAdminRole;
export const canCreateBranches = isAdminRole;
export const canEditBranches = isAdminRole;
export const canDeleteBranches = isAdminRole;
export const canAuditBranches = isAdminRole;
export const canAssignBranchManager = isAdminRole;
export const canViewAllBranches = isAdminRole;

export const canViewBranch = (user: User, branchId: string): boolean => {
  if (isAdminRole(user.role)) return true;
  return user.assignedBranchId === branchId;
};

export const getBranchIdForUser = (user: User): string | null => {
  if (isAdminRole(user.role)) return null;
  return user.assignedBranchId || null;
};

export const hasAdminAccess = (userRole: UserRole | string): boolean => {
  const role = normalizeRole(userRole);
  return ['ADMIN', 'BRANCH_MANAGER', 'SUPER_ADMIN'].includes(role);
};

export const canManageStaff = (userRole: UserRole | string): boolean => {
  const role = normalizeRole(userRole);
  return ['ADMIN', 'BRANCH_MANAGER', 'SUPER_ADMIN'].includes(role);
};

export const canManageInventory = (userRole: UserRole | string): boolean => {
  const role = normalizeRole(userRole);
  return ['ADMIN', 'BRANCH_MANAGER', 'CHEF', 'SUPER_ADMIN'].includes(role);
};

export const canManageOrders = (userRole: UserRole | string): boolean => {
  const role = normalizeRole(userRole);
  return ['ADMIN', 'BRANCH_MANAGER', 'WAITER', 'CHEF', 'SUPER_ADMIN'].includes(role);
};

export const canViewFinancialData = (userRole: UserRole | string): boolean => {
  const role = normalizeRole(userRole);
  return ['ADMIN', 'BRANCH_MANAGER', 'SUPER_ADMIN'].includes(role);
};

export const getRoleDisplayName = (role: UserRole | string): string => {
  const displayNames: Record<string, string> = {
    ADMIN: 'Administrator',
    SUPER_ADMIN: 'Administrator',
    BRANCH_MANAGER: 'Branch Manager',
    CHEF: 'Chef',
    WAITER: 'Waiter',
    RIDER: 'Rider',
    CUSTOMER: 'Customer',
  };
  return displayNames[normalizeRole(role)] || String(role);
};

export const getRoleDescription = (role: UserRole | string): string => {
  const descriptions: Record<string, string> = {
    ADMIN: 'Manage restaurant operations, all branches, staff, and settings.',
    SUPER_ADMIN: 'Manage restaurant operations, all branches, staff, and settings.',
    BRANCH_MANAGER: 'Manage single branch. Cannot create branches or view other branches.',
    CHEF: 'Kitchen operations. Manage recipes and ingredients.',
    WAITER: 'Table service. Take orders and manage tables.',
    RIDER: 'Delivery operations. Deliver orders to customers.',
    CUSTOMER: 'Order food and track deliveries.',
  };
  return descriptions[normalizeRole(role)] || '';
};

export const getRolePermissions = (role: UserRole | string): string[] => {
  const adminPermissions = [
    'Create branches',
    'Edit branches',
    'Delete branches',
    'Audit all branches',
    'Assign branch managers',
    'View all income',
    'Manage all staff',
    'View all orders',
  ];
  const permissions: Record<string, string[]> = {
    ADMIN: adminPermissions,
    SUPER_ADMIN: adminPermissions,
    BRANCH_MANAGER: [
      'Manage assigned branch',
      'Manage branch staff',
      'View branch income',
      'Manage branch orders',
      'Manage branch inventory',
    ],
    CHEF: [
      'View recipes',
      'Manage ingredients',
      'Update order status',
      'Kitchen display access',
    ],
    WAITER: ['Take orders', 'Manage tables', 'View menu', 'Process payments'],
    RIDER: ['View assigned deliveries', 'Update delivery status', 'Track earnings'],
    CUSTOMER: ['Place orders', 'Track orders', 'View order history', 'Manage profile'],
  };
  return permissions[normalizeRole(role)] || [];
};

/** @deprecated Use isAdminRole */
export const requireSuperAdmin = (userRole: UserRole | string): boolean => isAdminRole(userRole);

export const requiresBranchAssignment = (userRole: UserRole | string): boolean => {
  return normalizeRole(userRole) === 'BRANCH_MANAGER';
};

export const validateBranchAssignment = (user: User): boolean => {
  if (user.role === 'BRANCH_MANAGER' && !user.assignedBranchId) {
    return false;
  }
  return true;
};

/** Stack navigator route for the user's home dashboard. */
export const getDashboardRouteForRole = (role: UserRole | string): string => {
  const r = normalizeRole(role);
  switch (r) {
    case 'ADMIN':
    case 'SUPER_ADMIN':
      return 'AdminDashboard';
    case 'BRANCH_MANAGER':
      return 'ManagerTabs';
    case 'CHEF':
      return 'ChefDashboard';
    case 'WAITER':
      return 'WaiterDashboard';
    case 'RIDER':
      return 'RiderDashboard';
    case 'CUSTOMER':
    default:
      return 'CustomerDashboard';
  }
};
