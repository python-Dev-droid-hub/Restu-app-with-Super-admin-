import { useCallback, useEffect, useState } from 'react';
import { api } from '../components/api/client';

export type OrderProximity = {
  branchDistanceMeters: number | null;
  deliveryDistanceMeters: number | null;
  canPickUp: boolean;
  canDeliver: boolean;
  pickupRangeMeters: number;
  deliveryRangeMeters: number;
  rider?: { fresh?: boolean } | null;
};

export function useOrderProximity(orderId: string | null, enabled: boolean, refreshKey = 0) {
  const [proximity, setProximity] = useState<OrderProximity | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProximity = useCallback(async () => {
    if (!orderId || !enabled) return;
    setLoading(true);
    try {
      const res = await api.get<OrderProximity>(`/orders/${orderId}/proximity`);
      if (res.success && res.data) {
        setProximity(res.data as OrderProximity);
      }
    } catch {
      setProximity(null);
    } finally {
      setLoading(false);
    }
  }, [orderId, enabled]);

  useEffect(() => {
    void fetchProximity();
  }, [fetchProximity, refreshKey]);

  return { proximity, loading, refetch: fetchProximity };
}
