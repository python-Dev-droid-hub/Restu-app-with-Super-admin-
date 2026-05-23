/**
 * One-shot HTTP bootstrap when Socket.IO is unavailable (not used for live updates).
 */
import { api } from '../services/api';

function unwrap<T>(res: { success?: boolean; data?: unknown } | null | undefined): T | null {
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

export async function fetchChefDashboardHttp(branchId?: string) {
  const q = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
  const res = await api.get(`/dashboard/chef/overview${q}`);
  return unwrap(res);
}

export async function fetchWaiterDashboardHttp() {
  const res = await api.getWaiterDashboardOverview();
  return unwrap(res);
}

export async function fetchRiderDashboardHttp() {
  const res = await api.get('/dashboard/rider/overview');
  return unwrap(res);
}
