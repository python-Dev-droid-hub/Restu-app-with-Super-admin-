import { Request, Response } from 'express';
import { SuperAdmin, SuperAdminLoginLog } from '@/superadmin/models';
import { ISuperAdminRequest } from '@/superadmin/types';
import { generateSuperAdminTokenPair, verifySuperAdminRefreshToken } from '@/superadmin/utils/superAdminJwt';
import {
  setRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
} from '@/superadmin/utils/refreshTokenStore';
import { sanitizeSuperAdmin } from '@/superadmin/utils/helpers';
import { parseDurationToMs } from '@/utils/tokenTtl';
import { asyncHandler, sendSuccess, createError } from '@/utils';

async function logLoginAttempt(
  email: string,
  success: boolean,
  req: Request,
  superAdminId?: string,
  failureReason?: string
) {
  await SuperAdminLoginLog.create({
    email: email.toLowerCase(),
    superAdminId,
    success,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    failureReason,
  }).catch(() => {});
}

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) throw createError('Email and password are required.', 400);

  const superAdmin = await SuperAdmin.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!superAdmin || !superAdmin.isActive) {
    await logLoginAttempt(email, false, req, undefined, 'Invalid credentials or inactive account');
    throw createError('Invalid credentials.', 401);
  }

  const valid = await superAdmin.comparePassword(password);
  if (!valid) {
    await logLoginAttempt(email, false, req, String(superAdmin._id), 'Invalid password');
    throw createError('Invalid credentials.', 401);
  }

  superAdmin.lastLoginAt = new Date();
  await superAdmin.save();
  await logLoginAttempt(email, true, req, String(superAdmin._id));

  const payload = {
    superAdminId: String(superAdmin._id),
    email: superAdmin.email,
    role: superAdmin.role,
  };

  const tokens = generateSuperAdminTokenPair(payload);
  const refreshTtl = parseDurationToMs(process.env.SUPER_ADMIN_REFRESH_EXPIRY || '7d', 7 * 24 * 60 * 60 * 1000);
  await setRefreshToken(String(superAdmin._id), tokens.refreshToken, refreshTtl);

  sendSuccess(res, {
    superAdmin: sanitizeSuperAdmin(superAdmin),
    tokens,
  }, 'Login successful');
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw createError('Refresh token is required.', 400);

  const decoded = verifySuperAdminRefreshToken(refreshToken);
  const stored = await getRefreshToken(decoded.superAdminId);
  if (!stored || stored !== refreshToken) {
    throw createError('Invalid refresh token.', 401);
  }

  const superAdmin = await SuperAdmin.findById(decoded.superAdminId);
  if (!superAdmin || !superAdmin.isActive) {
    throw createError('Account not found or deactivated.', 401);
  }

  const payload = {
    superAdminId: String(superAdmin._id),
    email: superAdmin.email,
    role: superAdmin.role,
  };

  const tokens = generateSuperAdminTokenPair(payload);
  const refreshTtl = parseDurationToMs(process.env.SUPER_ADMIN_REFRESH_EXPIRY || '7d', 7 * 24 * 60 * 60 * 1000);
  await setRefreshToken(String(superAdmin._id), tokens.refreshToken, refreshTtl);

  sendSuccess(res, { tokens }, 'Token refreshed');
});

export const logout = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  if (req.superAdmin) {
    await deleteRefreshToken(String(req.superAdmin._id));
  }
  sendSuccess(res, null, 'Logged out successfully');
});

export const me = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  sendSuccess(res, { superAdmin: sanitizeSuperAdmin(req.superAdmin) });
});
