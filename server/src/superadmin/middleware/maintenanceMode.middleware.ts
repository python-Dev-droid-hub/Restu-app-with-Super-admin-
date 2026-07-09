import { Request, Response, NextFunction } from 'express';
import { isMaintenanceMode } from '@/superadmin/services/platformSettings.service';

const BYPASS_PREFIXES = [
  '/api/superadmin',
  '/superadmin',
  '/api/auth/login',
  '/auth/login',
  '/api/auth/refresh',
  '/auth/refresh',
  '/api/auth/refresh-token',
  '/auth/refresh-token',
  '/api/auth/impersonate',
  '/auth/impersonate',
  '/api/auth/exit-impersonate',
  '/auth/exit-impersonate',
  '/api/health',
  '/health',
];

function requestPath(req: Request): string {
  return (req.originalUrl || req.path || '').split('?')[0];
}

export const checkMaintenanceMode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const path = requestPath(req);
    if (BYPASS_PREFIXES.some((p) => path.startsWith(p) || path.includes(p))) return next();

    if (await isMaintenanceMode()) {
      res.status(503).json({
        success: false,
        message: 'Platform is under maintenance. Please try again later.',
        statusCode: 503,
        maintenance: true,
      });
      return;
    }
    next();
  } catch {
    next();
  }
};
