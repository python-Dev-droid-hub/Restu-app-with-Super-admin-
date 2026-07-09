import { Response, NextFunction } from 'express';
import { SuperAdmin } from '@/superadmin/models';
import { ISuperAdminRequest } from '@/superadmin/types';
import { verifySuperAdminAccessToken } from '@/superadmin/utils/superAdminJwt';
import { createError } from '@/utils';

export const authenticateSuperAdmin = async (
  req: ISuperAdminRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const headerToken = req.header('Authorization')?.replace(/^Bearer\s+/i, '');
    const cookieToken = (req as any).cookies?.superAdminAccessToken as string | undefined;
    const token = headerToken || cookieToken;

    if (!token) {
      throw createError('Access denied. No super admin token provided.', 401);
    }

    const decoded = verifySuperAdminAccessToken(token);
    const superAdmin = await SuperAdmin.findById(decoded.superAdminId).select('+passwordHash');
    if (!superAdmin || !superAdmin.isActive) {
      throw createError('Invalid token or deactivated account.', 401);
    }

    req.superAdmin = superAdmin;
    next();
  } catch (error) {
    next(error);
  }
};
