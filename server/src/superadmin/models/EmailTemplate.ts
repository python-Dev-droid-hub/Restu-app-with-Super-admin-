import mongoose, { Schema } from 'mongoose';

export const EMAIL_TEMPLATE_KEYS = [
  'WELCOME',
  'TRIAL_EXPIRY',
  'RENEWAL_REMINDER',
  'PAYMENT_FAILED',
  'SUSPENSION',
] as const;

const emailTemplateSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: EMAIL_TEMPLATE_KEYS,
    },
    name: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const EmailTemplate = mongoose.model(
  'SaasEmailTemplate',
  emailTemplateSchema,
  'saas_email_templates'
);
