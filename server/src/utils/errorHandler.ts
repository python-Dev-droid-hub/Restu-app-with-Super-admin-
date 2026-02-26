import { ICustomError } from '@/types';

export const createError = (message: string, statusCode: number): ICustomError => {
  const error = new Error(message) as ICustomError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

export const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
