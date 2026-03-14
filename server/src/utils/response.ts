import { Response, Request, NextFunction } from 'express';
import { IApiResponse, IPaginatedResponse } from '@/types';

// Async error handler wrapper
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message: string = 'Operation successful',
  statusCode: number = 200
): Response => {
  const response: IApiResponse<T> = {
    success: true,
    message,
    data,
    statusCode,
  };

  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message: string = 'Operation failed',
  statusCode: number = 400,
  error?: string
): Response => {
  const response: IApiResponse = {
    success: false,
    message,
    statusCode,
    error,
  };

  return res.status(statusCode).json(response);
};

export const sendPaginatedResponse = <T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number,
  message: string = 'Data retrieved successfully'
): Response => {
  const pages = Math.ceil(total / limit);
  
  const response: IApiResponse<IPaginatedResponse<T>> = {
    success: true,
    message,
    data: {
      data,
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    },
    statusCode: 200,
  };

  return res.status(200).json(response);
};

export const sendCreated = <T>(
  res: Response,
  data: T,
  message: string = 'Resource created successfully'
): Response => {
  return sendSuccess(res, data, message, 201);
};

export const sendNoContent = (res: Response): Response => {
  return res.status(204).send();
};
