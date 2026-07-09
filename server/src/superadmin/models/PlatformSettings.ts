import mongoose, { Schema } from 'mongoose';

const platformSettingsSchema = new Schema(
  {
    key: { type: String, default: 'platform', unique: true },
    platformName: { type: String, default: 'Restaurant SaaS Platform' },
    platformLogoUrl: { type: String },
    supportEmail: { type: String, default: 'support@yourapp.com' },
    supportPhone: { type: String },
    defaultTimezone: { type: String, default: 'Asia/Karachi' },
    defaultCurrency: { type: String, default: 'PKR' },
    maintenanceMode: { type: Boolean, default: false },
    trialPeriodDays: { type: Number, default: 14 },
    defaultPlanId: { type: Schema.Types.ObjectId, ref: 'SaasPlan' },
  },
  { timestamps: true }
);

export const PlatformSettings = mongoose.model(
  'SaasPlatformSettings',
  platformSettingsSchema,
  'saas_platform_settings'
);
