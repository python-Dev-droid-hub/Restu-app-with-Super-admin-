import jwt, { SignOptions } from 'jsonwebtoken';
import { IJWTPayload } from '@/types';

export const generateAccessToken = (payload: IJWTPayload): string => {
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRE || '7d') as any,
  };
  return jwt.sign(payload, process.env.JWT_SECRET!, options);
};

export const generateRefreshToken = (payload: IJWTPayload): string => {
  const options: SignOptions = {
    expiresIn: (process.env.JWT_REFRESH_EXPIRE || '30d') as any,
  };
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, options);
};

export const verifyAccessToken = (token: string): IJWTPayload => {
  return jwt.verify(token, process.env.JWT_SECRET!) as IJWTPayload;
};

export const verifyRefreshToken = (token: string): IJWTPayload => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as IJWTPayload;
};

export const generateTokenPair = (payload: IJWTPayload) => {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  
  return {
    accessToken,
    refreshToken,
    expiresIn: process.env.JWT_EXPIRE || '7d',
  };
};
