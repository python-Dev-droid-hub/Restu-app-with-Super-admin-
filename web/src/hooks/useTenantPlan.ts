import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { getAuthToken } from '../utils/authStorage';
import { isSuperAdminPath } from '../utils/tenantBranding';
import { isNavKeyAllowed } from '../config/planRules';

export interface TenantPlanFeatures {
  dine_in?: boolean;
  delivery?: boolean;
  takeaway?: boolean;
  kitchen_display?: boolean;
  rider_app?: boolean;
  analytics?: boolean;
  white_label?: boolean;
  custom_domain?: boolean;
  api_access?: boolean;
  fbr_integration?: boolean;
  loyalty_program?: boolean;
  offline_mode?: boolean;
}

export interface TenantPlanSummary {
  planName: string;
  planSlug: string;
  maxBranches: number;
  maxStaffAccounts: number;
  maxMenuItems: number;
  maxOrdersPerMonth: number;
  features: TenantPlanFeatures;
  navAccess?: Record<string, boolean>;
  usage: {
    branches: number;
    staff: number;
    menuItems: number;
    ordersThisMonth: number;
  };
  canAddBranch: boolean;
  canAddStaff: boolean;
  canAddMenuItem: boolean;
  canCreateOrder: boolean;
  allowedStaffRoles: string[];
}

const DEFAULT_PLAN: TenantPlanSummary = {
  planName: '',
  planSlug: '',
  maxBranches: 999,
  maxStaffAccounts: 999,
  maxMenuItems: 99999,
  maxOrdersPerMonth: 999999,
  features: {},
  usage: { branches: 0, staff: 0, menuItems: 0, ordersThisMonth: 0 },
  canAddBranch: true,
  canAddStaff: true,
  canAddMenuItem: true,
  canCreateOrder: true,
  allowedStaffRoles: ['ADMIN', 'BRANCH_MANAGER', 'CHEF', 'WAITER', 'RIDER', 'CUSTOMER'],
};

export function useTenantPlan() {
  const [plan, setPlan] = useState<TenantPlanSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!getAuthToken() || isSuperAdminPath(window.location.pathname)) {
      setPlan(null);
      return;
    }
    setLoading(true);
    try {
      const res: any = await api.get('/tenant/plan');
      setPlan(res?.data?.plan || null);
    } catch {
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onRefresh = () => void refresh();
    window.addEventListener('tenant-branding-refresh', onRefresh);
    window.addEventListener('userDataUpdated', onRefresh);
    return () => {
      window.removeEventListener('tenant-branding-refresh', onRefresh);
      window.removeEventListener('userDataUpdated', onRefresh);
    };
  }, [refresh]);

  const effective = plan || DEFAULT_PLAN;

  const hasFeature = (key: keyof TenantPlanFeatures) => {
    if (!plan) return true;
    return !!effective.features?.[key];
  };

  const isNavAllowed = (navKey: string) => {
    if (!plan) return true;
    if (plan.navAccess && navKey in plan.navAccess) {
      return plan.navAccess[navKey];
    }
    return isNavKeyAllowed(navKey, hasFeature);
  };

  return {
    plan: effective,
    loading,
    refresh,
    hasFeature,
    isNavAllowed,
    canAddBranch: plan ? plan.canAddBranch : true,
    canAddStaff: plan ? plan.canAddStaff : true,
    canAddMenuItem: plan ? plan.canAddMenuItem : true,
    canCreateOrder: plan ? plan.canCreateOrder : true,
    allowedStaffRoles: plan?.allowedStaffRoles || DEFAULT_PLAN.allowedStaffRoles,
    isTenantPlan: !!plan,
  };
}
