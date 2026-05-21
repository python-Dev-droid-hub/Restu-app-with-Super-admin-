/** Normalize role strings from DB / legacy clients for authorization checks. */

const ROLE_ALIASES: Record<string, string> = {
  MANAGER: 'BRANCH_MANAGER',
  BRANCHMANAGER: 'BRANCH_MANAGER',
  'BRANCH-MANAGER': 'BRANCH_MANAGER',
  SUPERADMIN: 'SUPER_ADMIN',
  'SUPER-ADMIN': 'SUPER_ADMIN',
};

export function normalizeUserRole(role: unknown): string {
  const upper = String(role || '').trim().toUpperCase();
  return ROLE_ALIASES[upper] || upper;
}

export function userHasRole(userRole: unknown, allowed: string[]): boolean {
  const normalized = normalizeUserRole(userRole);
  const allowedSet = new Set(allowed.map((r) => normalizeUserRole(r)));
  return allowedSet.has(normalized);
}

export const STAFF_USER_LIST_ROLES = ['ADMIN', 'BRANCH_MANAGER', 'SUPER_ADMIN'] as const;
