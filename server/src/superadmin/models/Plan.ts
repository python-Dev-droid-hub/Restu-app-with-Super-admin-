import mongoose, { Schema } from 'mongoose';
import { IPlanFeatures } from '@/superadmin/types';

const defaultFeatures: IPlanFeatures = {
  dine_in: true,
  delivery: false,
  takeaway: false,
  kitchen_display: false,
  rider_app: false,
  analytics: false,
  white_label: false,
  custom_domain: false,
  api_access: false,
  fbr_integration: false,
  loyalty_program: false,
  offline_mode: false,
};

const planSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    priceMonthly: { type: Number, required: true, min: 0 },
    priceYearly: { type: Number, min: 0 },
    maxBranches: { type: Number, default: 1 },
    maxStaffAccounts: { type: Number, default: 5 },
    maxMenuItems: { type: Number, default: 50 },
    maxOrdersPerMonth: { type: Number, default: 500 },
    features: { type: Schema.Types.Mixed, default: () => ({ ...defaultFeatures }) },
    isActive: { type: Boolean, default: true },
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Plan = mongoose.model('SaasPlan', planSchema, 'saas_plans');
