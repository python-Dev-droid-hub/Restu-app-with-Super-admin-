/**
 * One-shot HTTP bootstrap when Socket.IO is unavailable (not used for live updates).
 */
import { api } from '../services/api';

function unwrap<T>(res: { success?: boolean; data?: T } | null | undefined): T | null {
  if (!res?.success) return null;
  return (res.data ?? null) as T | null;
}

export async function fetchAdminBranchesHttp() {
  const res = await api.getAdminBranchesOverview();
  return unwrap<{ branches?: unknown[] }>(res);
}

export async function fetchAdminDashboardHttp(params: {
  period?: string;
  branchId?: string;
  limit?: number;
}) {
  const res = await api.getAdminDashboardOverview(params);
  return unwrap(res);
}

export async function fetchChefDashboardHttp() {
  const res = await api.getChefDashboardOverview();
  return unwrap(res);
}

export async function fetchWaiterDashboardHttp() {
  const res = await api.getWaiterDashboardOverview();
  return unwrap(res);
}
