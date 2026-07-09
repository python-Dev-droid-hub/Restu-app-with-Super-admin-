import { Request } from 'express';
import { Document, Types } from 'mongoose';

export type SuperAdminRole =
  | 'SUPER_ADMIN'
  | 'SUPPORT_AGENT'
  | 'BILLING_MANAGER'
  | 'ONBOARDING_AGENT';

export type SubscriptionStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELLED'
  | 'SUSPENDED'
  | 'EXPIRED';

export interface ISuperAdminJWTPayload {
  superAdminId: string;
  email: string;
  role: SuperAdminRole;
}

export interface ISuperAdminRequest extends Request {
  superAdmin?: ISuperAdminDocument;
}

export interface IPlanFeatures {
  dine_in: boolean;
  delivery: boolean;
  takeaway: boolean;
  kitchen_display: boolean;
  rider_app: boolean;
  analytics: boolean;
  white_label: boolean;
  custom_domain: boolean;
  api_access: boolean;
  fbr_integration: boolean;
  loyalty_program: boolean;
  offline_mode: boolean;
}

export interface ITenantSettings {
  currency: string;
  timezone: string;
  language: string;
  tax_rate: number;
  service_charge: number;
  delivery_fee: number;
  order_prefix: string;
}

export interface ISuperAdminDocument extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  displayName?: string;
  phoneNumber?: string;
  role: SuperAdminRole;
  isActive: boolean;
  lastLoginAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}
