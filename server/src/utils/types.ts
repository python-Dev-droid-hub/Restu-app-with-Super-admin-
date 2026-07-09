import { Request } from 'express';
import { IUser } from '@/types';

export interface IAuthRequest extends Request {
  user?: IUser;
  authTenantId?: string;
}
