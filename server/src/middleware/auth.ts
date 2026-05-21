import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '@/models/User';
import { IAuthRequest, IJWTPayload } from '@/types';
import { createError } from '@/utils';
import { logger } from '@/utils/logger';

const isProd = process.env.NODE_ENV === 'production';

export const authenticate = async (
  req: IAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const cookieToken = (req as any).cookies?.accessToken as string | undefined;
    const headerToken = req.header('Authorization')?.replace(/^Bearer\s+/i, '');
    const token = cookieToken || headerToken;

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

    if (!roles.includes(req.user.role)) {
      return next(createError('Access denied. Insufficient permissions.', 403));
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
    const token = cookieToken || headerToken;

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
