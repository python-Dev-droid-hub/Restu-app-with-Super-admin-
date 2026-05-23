import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { resolveStaffBranchId } from './notificationCountSync';

export function isBranchManagerRoute(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.pathname.startsWith('/manager') ||
    String(localStorage.getItem('userRole') || '').toUpperCase() === 'BRANCH_MANAGER'
  );
}

/** Locked branch id for branch managers; empty for admin. */
export function useManagerBranchScope() {
  const location = useLocation();
  const isBranchManager = useMemo(
    () =>
      location.pathname.startsWith('/manager') ||
      String(localStorage.getItem('userRole') || '').toUpperCase() === 'BRANCH_MANAGER',
    [location.pathname]
  );

  const [assignedBranchId, setAssignedBranchId] = useState(() =>
    isBranchManager ? resolveStaffBranchId() : ''
  );

  useEffect(() => {
    if (!isBranchManager) return;
    const sync = () => setAssignedBranchId(resolveStaffBranchId());
    sync();
    window.addEventListener('profileUpdated', sync);
    window.addEventListener('userDataUpdated', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('profileUpdated', sync);
      window.removeEventListener('userDataUpdated', sync);
      window.removeEventListener('storage', sync);
    };
  }, [isBranchManager]);

  /** Branch managers never pick a branch in filters — use assigned branch only. */
  const hideBranchFilter = isBranchManager;

  return { isBranchManager, assignedBranchId, hideBranchFilter };
}
