import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '@/models/User';
import { IAuthRequest, IJWTPayload } from '@/types';
import { createError } from '@/utils';
import { logger } from '@/utils/logger';
import { normalizeUserRole, userHasRole } from '@/utils/roles';

const isProd = process.env.NODE_ENV === 'production';

export const authenticate = async (
  req: IAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const cookieToken = (req as any).cookies?.accessToken as string | undefined;
    const headerToken = req.header('Authorization')?.replace(/^Bearer\s+/i, '');
    // Prefer Bearer header (web/mobile explicit session) over stale cookies
    const token = headerToken || cookieToken;

    if (!token) {
      throw createError('Access denied. No token provided.', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as IJWTPayload;

    const user = await User.findById(decoded.userId)
      .select('-passwordHash')
      .populate('assignedBranch', '_id name branchName branchCode code');
    if (!user) {
      throw createError('Invalid token. User not found.', 401);
    }

    if (!user.isActive) {
      throw createError('Account is deactivated.', 401);
    }

    (user as any).role = normalizeUserRole(user.role);
    req.user = user;
    next();
  } catch (error) {
    if (!isProd) {
      logger.debug(`[AUTH] ${req.method} ${req.path}: ${(error as Error).message}`);
    }
    next(error);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: IAuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(createError('Access denied. Authentication required.', 401));
    }

    if (!userHasRole(req.user.role, roles)) {
      return next(
        createError(
          `Access denied. Insufficient permissions (your role: ${normalizeUserRole(req.user.role) || 'unknown'}).`,
          403
        )
      );
    }

    next();
  };
};

export const optionalAuth = async (
  req: IAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const cookieToken = (req as any).cookies?.accessToken as string | undefined;
    const headerToken = req.header('Authorization')?.replace(/^Bearer\s+/i, '');
    // Prefer Bearer header (web/mobile explicit session) over stale cookies
    const token = headerToken || cookieToken;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as IJWTPayload;
      const user = await User.findById(decoded.userId)
        .select('-passwordHash')
        .populate('assignedBranch', '_id name branchName branchCode code');

      if (user && user.isActive) {
        req.user = user;
      }
    }

    next();
  } catch {
    next();
  }
};
