import jwt, { SignOptions } from 'jsonwebtoken';
import { ISuperAdminJWTPayload } from '@/superadmin/types';

function getSecret(): string {
  const secret = process.env.SUPER_ADMIN_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('SUPER_ADMIN_JWT_SECRET is not configured');
  return secret;
}

function getRefreshSecret(): string {
  const secret =
    process.env.SUPER_ADMIN_REFRESH_SECRET ||
    process.env.SUPER_ADMIN_JWT_SECRET ||
    process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('SUPER_ADMIN refresh secret is not configured');
  return secret;
}

export const generateSuperAdminAccessToken = (payload: ISuperAdminJWTPayload): string => {
  const options: SignOptions = {
    expiresIn: (process.env.SUPER_ADMIN_JWT_EXPIRY || '15m') as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign(payload, getSecret(), options);
};

export const generateSuperAdminRefreshToken = (payload: ISuperAdminJWTPayload): string => {
  const options: SignOptions = {
    expiresIn: (process.env.SUPER_ADMIN_REFRESH_EXPIRY || '7d') as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign(payload, getRefreshSecret(), options);
};

export const verifySuperAdminAccessToken = (token: string): ISuperAdminJWTPayload => {
  return jwt.verify(token, getSecret()) as ISuperAdminJWTPayload;
};

export const verifySuperAdminRefreshToken = (token: string): ISuperAdminJWTPayload => {
  return jwt.verify(token, getRefreshSecret()) as ISuperAdminJWTPayload;
};

export const generateSuperAdminTokenPair = (payload: ISuperAdminJWTPayload) => ({
  accessToken: generateSuperAdminAccessToken(payload),
  refreshToken: generateSuperAdminRefreshToken(payload),
  expiresIn: process.env.SUPER_ADMIN_JWT_EXPIRY || '15m',
});
