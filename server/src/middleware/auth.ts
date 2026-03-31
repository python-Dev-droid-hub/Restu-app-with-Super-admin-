import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '@/models/User';
import { IAuthRequest, IJWTPayload } from '@/types';
import { createError } from '@/utils';

export const authenticate = async (
  req: IAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const cookieToken = (req as any).cookies?.accessToken as string | undefined;
    const headerToken = req.header('Authorization')?.replace('Bearer ', '');
    const token = cookieToken || headerToken;

    console.log('🔐 [AUTH] Request to:', req.path);
    console.log('🔐 [AUTH] Token present:', !!token);
    console.log('🔐 [AUTH] Header Auth:', req.header('Authorization')?.substring(0, 30));

    if (!token) {
      console.log('🔐 [AUTH] NO TOKEN - rejecting');
      throw createError('Access denied. No token provided.', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as IJWTPayload;
    console.log('🔐 [AUTH] Token decoded, userId:', decoded.userId);
    
    const user = await User.findById(decoded.userId)
      .select('-passwordHash')
      .populate('assignedBranch', '_id name branchName branchCode code');
    if (!user) {
      console.log('🔐 [AUTH] User not found in DB');
      throw createError('Invalid token. User not found.', 401);
    }

    if (!user.isActive) {
      console.log('🔐 [AUTH] User is deactivated');
      throw createError('Account is deactivated.', 401);
    }

    console.log('🔐 [AUTH] Success - user:', user.email, 'role:', user.role);
    req.user = user;
    next();
  } catch (error) {
    console.log('🔐 [AUTH] Error:', (error as Error).message);
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
    const token = req.header('Authorization')?.replace('Bearer ', '');

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
  } catch (error) {
    // If token is invalid, continue without user
    next();
  }
};
