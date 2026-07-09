import { useEffect } from 'react';
import { getSuperAdminToken } from '../utils/superAdminAuthStorage';
import { refreshSuperAdminSession } from '../services/superAdminApi';

/** Proactively refresh super admin token before 15 min expiry. */
export function useSuperAdminTokenRefresh() {
  useEffect(() => {
    if (!getSuperAdminToken()) return;

    void refreshSuperAdminSession();
    const interval = setInterval(() => {
      if (getSuperAdminToken()) void refreshSuperAdminSession();
    }, 12 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
}
