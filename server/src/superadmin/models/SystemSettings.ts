import mongoose, { Schema } from 'mongoose';

const systemSettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true }
);

export const SystemSettings = mongoose.model(
  'SaasSystemSettings',
  systemSettingsSchema,
  'saas_system_settings'
);
