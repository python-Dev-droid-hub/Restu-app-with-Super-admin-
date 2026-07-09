import { useCallback, useEffect, useState } from 'react';
import { superAdminApi } from '../services/superAdminApi';

export type SuperAdminPlan = {
  _id: string;
  name: string;
  slug?: string;
  priceMonthly?: number;
  isActive?: boolean;
};

export function parseSuperAdminPlans(res: unknown): SuperAdminPlan[] {
  const r = res as Record<string, unknown>;
  const data = r?.data as Record<string, unknown> | undefined;
  if (Array.isArray(data?.plans)) return data.plans as SuperAdminPlan[];
  const nested = data?.data as Record<string, unknown> | undefined;
  if (Array.isArray(nested?.plans)) return nested.plans as SuperAdminPlan[];
  if (Array.isArray(r?.plans)) return r.plans as SuperAdminPlan[];
  if (Array.isArray(data)) return data as SuperAdminPlan[];
  return [];
}

export async function fetchSuperAdminPlans(): Promise<SuperAdminPlan[]> {
  const res = await superAdminApi.get('/plans');
  return parseSuperAdminPlans(res);
}

export function useSuperAdminPlans() {
  const [plans, setPlans] = useState<SuperAdminPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchSuperAdminPlans();
      setPlans(list);
      return list;
    } catch (e: unknown) {
      setPlans([]);
      setError(e instanceof Error ? e.message : 'Failed to load plans');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { plans, loading, error, refresh };
}
