import mongoose, { Schema } from 'mongoose';

const loginLogSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, index: true },
    superAdminId: { type: Schema.Types.ObjectId, ref: 'SuperAdmin' },
    success: { type: Boolean, required: true },
    ip: { type: String },
    userAgent: { type: String },
    failureReason: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

loginLogSchema.index({ createdAt: -1 });

export const SuperAdminLoginLog = mongoose.model(
  'SuperAdminLoginLog',
  loginLogSchema,
  'superadmin_login_logs'
);
