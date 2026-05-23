export const NOTIFICATIONS_UPDATED_EVENT = 'notificationsUpdated';

export type NotificationsUpdatedDetail = {
  unreadCount?: number;
};

/** Branch id for staff dashboards (manager/admin/chef). */
export function resolveStaffBranchId(): string {
  const fromStorage = localStorage.getItem('selectedBranchId');
  if (fromStorage?.trim()) return fromStorage.trim();
  try {
    const raw = localStorage.getItem('userData');
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    const ab = parsed?.assignedBranch;
    if (!ab) return '';
    if (typeof ab === 'string') return ab;
    return String(ab._id || ab.id || '');
  } catch {
    return '';
  }
}

export function publishNotificationUnreadCount(unreadCount: number) {
  window.dispatchEvent(
    new CustomEvent<NotificationsUpdatedDetail>(NOTIFICATIONS_UPDATED_EVENT, {
      detail: { unreadCount: Math.max(0, unreadCount) },
    })
  );
}

export async function fetchUserUnreadNotificationCount(
  get: (path: string) => Promise<{ success?: boolean; data?: unknown }>
): Promise<number> {
  try {
    const res = await get('/notifications/unread-count');
    if (!res?.success) return 0;
    const data = res.data as { unreadCount?: number } | undefined;
    const n = Number(data?.unreadCount ?? 0);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  } catch {
    return 0;
  }
}
