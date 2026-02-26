/**
 * Permission Helper Functions
 * Centralized role-based permission checks for the restaurant app
 */

// User Roles
export type UserRole =
  | 'CUSTOMER'
  | 'RIDER'
  | 'BRANCH_MANAGER'
  | 'WAITER'
  | 'CHEF'
  | 'SUPER_ADMIN';

export interface User {
  id: string;
  email: string;
  displayName?: string;
  role: UserRole;
  assignedBranchId?: string | null;
}

/**
 * Check if user is SUPER_ADMIN
 */
export const isSuperAdmin = (userRole: UserRole | string): boolean => {
  return userRole === 'SUPER_ADMIN';
};

/**
 * Check if user is BRANCH_MANAGER
 */
export const isBranchManager = (userRole: UserRole | string): boolean => {
  return userRole === 'BRANCH_MANAGER';
};

/**
 * Check if user is CHEF
 */
export const isChef = (userRole: UserRole | string): boolean => {
  return userRole === 'CHEF';
};

/**
 * Check if user is WAITER
 */
export const isWaiter = (userRole: UserRole | string): boolean => {
  return userRole === 'WAITER';
};

/**
 * Check if user is RIDER
 */
export const isRider = (userRole: UserRole | string): boolean => {
  return userRole === 'RIDER';
};

/**
 * Check if user is CUSTOMER
 */
export const isCustomer = (userRole: UserRole | string): boolean => {
  return userRole === 'CUSTOMER';
};

/**
 * Check if user can manage branches (SUPER_ADMIN only)
 */
export const canManageBranches = (userRole: UserRole | string): boolean => {
  return userRole === 'SUPER_ADMIN';
};

/**
 * Check if user can create branches (SUPER_ADMIN only)
 */
export const canCreateBranches = (userRole: UserRole | string): boolean => {
  return userRole === 'SUPER_ADMIN';
};

/**
 * Check if user can edit branches (SUPER_ADMIN only)
 */
export const canEditBranches = (userRole: UserRole | string): boolean => {
  return userRole === 'SUPER_ADMIN';
};

/**
 * Check if user can delete/deactivate branches (SUPER_ADMIN only)
 */
export const canDeleteBranches = (userRole: UserRole | string): boolean => {
  return userRole === 'SUPER_ADMIN';
};

/**
 * Check if user can audit branches (SUPER_ADMIN only)
 */
export const canAuditBranches = (userRole: UserRole | string): boolean => {
  return userRole === 'SUPER_ADMIN';
};

/**
 * Check if user can assign branch managers (SUPER_ADMIN only)
 */
export const canAssignBranchManager = (userRole: UserRole | string): boolean => {
  return userRole === 'SUPER_ADMIN';
};

/**
 * Check if user can view all branches (SUPER_ADMIN) or just their branch
 */
export const canViewAllBranches = (userRole: UserRole | string): boolean => {
  return userRole === 'SUPER_ADMIN';
};

/**
 * Check if user can view a specific branch
 * SUPER_ADMIN can view all, BRANCH_MANAGER can view only their assigned branch
 */
export const canViewBranch = (
  user: User,
  branchId: string
): boolean => {
  if (user.role === 'SUPER_ADMIN') return true;
  return user.assignedBranchId === branchId;
};

/**
 * Get branch ID for user
 * SUPER_ADMIN returns null (access to all branches)
 * BRANCH_MANAGER returns their assigned_branch_id
 */
export const getBranchIdForUser = (user: User): string | null => {
  if (user.role === 'SUPER_ADMIN') return null;
  return user.assignedBranchId || null;
};

/**
 * Check if user has admin access (BRANCH_MANAGER or SUPER_ADMIN)
 */
export const hasAdminAccess = (userRole: UserRole | string): boolean => {
  return ['BRANCH_MANAGER', 'SUPER_ADMIN'].includes(userRole);
};

/**
 * Check if user can manage staff
 * Both BRANCH_MANAGER (their branch) and SUPER_ADMIN (all branches) can manage staff
 */
export const canManageStaff = (userRole: UserRole | string): boolean => {
  return ['BRANCH_MANAGER', 'SUPER_ADMIN'].includes(userRole);
};

/**
 * Check if user can manage inventory
 */
export const canManageInventory = (userRole: UserRole | string): boolean => {
  return ['BRANCH_MANAGER', 'CHEF', 'SUPER_ADMIN'].includes(userRole);
};

/**
 * Check if user can manage orders
 */
export const canManageOrders = (userRole: UserRole | string): boolean => {
  return ['BRANCH_MANAGER', 'WAITER', 'CHEF', 'SUPER_ADMIN'].includes(userRole);
};

/**
 * Check if user can view financial data
 * SUPER_ADMIN can view all, BRANCH_MANAGER can view their branch only
 */
export const canViewFinancialData = (userRole: UserRole | string): boolean => {
  return ['BRANCH_MANAGER', 'SUPER_ADMIN'].includes(userRole);
};

/**
 * Get role display name for UI
 */
export const getRoleDisplayName = (role: UserRole | string): string => {
  const displayNames: Record<string, string> = {
    'SUPER_ADMIN': 'Super Admin',
    'BRANCH_MANAGER': 'Branch Manager',
    'CHEF': 'Chef',
    'WAITER': 'Waiter',
    'RIDER': 'Rider',
    'CUSTOMER': 'Customer',
  };
  return displayNames[role] || role;
};

/**
 * Get role description for UI
 */
export const getRoleDescription = (role: UserRole | string): string => {
  const descriptions: Record<string, string> = {
    'SUPER_ADMIN': 'Full system access. Manage all branches, assign managers, view all data.',
    'BRANCH_MANAGER': 'Manage single branch. Cannot create branches or view other branches.',
    'CHEF': 'Kitchen operations. Manage recipes and ingredients.',
    'WAITER': 'Table service. Take orders and manage tables.',
    'RIDER': 'Delivery operations. Deliver orders to customers.',
    'CUSTOMER': 'Order food and track deliveries.',
  };
  return descriptions[role] || '';
};

/**
 * Get permissions list for a role
 */
export const getRolePermissions = (role: UserRole | string): string[] => {
  const permissions: Record<string, string[]> = {
    'SUPER_ADMIN': [
      'Create branches',
      'Edit branches',
      'Delete branches',
      'Audit all branches',
      'Assign branch managers',
      'View all income',
      'Manage all staff',
      'View all orders',
    ],
    'BRANCH_MANAGER': [
      'Manage assigned branch',
      'Manage branch staff',
      'View branch income',
      'Manage branch orders',
      'Manage branch inventory',
    ],
    'CHEF': [
      'View recipes',
      'Manage ingredients',
      'Update order status',
      'Kitchen display access',
    ],
    'WAITER': [
      'Take orders',
      'Manage tables',
      'View menu',
      'Process payments',
    ],
    'RIDER': [
      'View assigned deliveries',
      'Update delivery status',
      'Track earnings',
    ],
    'CUSTOMER': [
      'Place orders',
      'Track orders',
      'View order history',
      'Manage profile',
    ],
  };
  return permissions[role] || [];
};

/**
 * Middleware-style check for routes/components
 * Returns true if allowed, throws/returns false if not
 */
export const requireSuperAdmin = (userRole: UserRole | string): boolean => {
  if (!isSuperAdmin(userRole)) {
    return false;
  }
  return true;
};

/**
 * Check if user requires branch assignment
 * BRANCH_MANAGER must have assigned_branch_id
 */
export const requiresBranchAssignment = (userRole: UserRole | string): boolean => {
  return userRole === 'BRANCH_MANAGER';
};

/**
 * Validate that BRANCH_MANAGER has branch assignment
 */
export const validateBranchAssignment = (user: User): boolean => {
  if (user.role === 'BRANCH_MANAGER' && !user.assignedBranchId) {
    return false;
  }
  return true;
};
