import mongoose, { Schema } from 'mongoose';

const activityLogSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'SaasTenant', required: true, index: true },
    performedBy: { type: Schema.Types.ObjectId },
    performedByType: { type: String, default: 'SUPER_ADMIN' },
    action: { type: String, required: true },
    description: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activityLogSchema.index({ createdAt: -1 });

export const TenantActivityLog = mongoose.model(
  'SaasTenantActivityLog',
  activityLogSchema,
  'saas_tenant_activity_logs'
);
