import { Request, Response } from 'express';
import { IApiResponse } from '@/types';

export const notFoundHandler = (req: Request, res: Response): void => {
  const response: IApiResponse = {
    success: false,
    message: `Route ${req.originalUrl} not found`,
    statusCode: 404,
  };

  res.status(404).json(response);
};
