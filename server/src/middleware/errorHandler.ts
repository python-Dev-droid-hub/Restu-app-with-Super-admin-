import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';
import { ICustomError, IApiResponse } from '@/types';

export const errorHandler = (
  error: ICustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values((error as any).errors)
      .map((err: any) => err.message)
      .join(', ');
  }

  // Mongoose duplicate key error
  if (error.name === 'MongoServerError' && (error as any).code === 11000) {
    statusCode = 400;
    const field = Object.keys((error as any).keyValue)[0];
    message = `${field} already exists`;
  }

  // Mongoose cast error
  if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Log error
  // - 4xx: expected client/auth errors -> warn, no stack noise
  // - 5xx: server errors -> error with stack
  if (statusCode >= 500) {
    logger.error({
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  } else {
    logger.warn({
      message: error.message,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  }

  // Send error response
  const response: IApiResponse & { suspended?: boolean; maintenance?: boolean } = {
    success: false,
    message,
    statusCode,
  };

  if ((error as any).suspended) response.suspended = true;
  if ((error as any).maintenance) response.maintenance = true;

  // Include stack trace in development
  // Only include stack for 5xx errors to avoid confusing expected 401/403/400 responses.
  if (process.env.NODE_ENV === 'development' && statusCode >= 500) {
    response.error = error.stack;
  }

  res.status(statusCode).json(response);
};

export const createError = (message: string, statusCode: number): ICustomError => {
  const error = new Error(message) as ICustomError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
