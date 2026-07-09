import mongoose, { Schema } from 'mongoose';

const announcementSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    type: {
      type: String,
      enum: ['INFO', 'WARNING', 'MAINTENANCE', 'NEW_FEATURE'],
      default: 'INFO',
    },
    targetType: {
      type: String,
      enum: ['ALL', 'PLAN', 'TENANTS', 'CITIES'],
      default: 'ALL',
    },
    targetPlanId: { type: Schema.Types.ObjectId, ref: 'SaasPlan' },
    targetTenantIds: [{ type: Schema.Types.ObjectId, ref: 'SaasTenant' }],
    targetCities: [{ type: String, trim: true }],
    channels: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: ['DRAFT', 'SCHEDULED', 'SENT'],
      default: 'DRAFT',
    },
    scheduledAt: { type: Date },
    sentAt: { type: Date },
    viewCount: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'SuperAdmin' },
  },
  { timestamps: true }
);

export const PlatformAnnouncement = mongoose.model(
  'SaasPlatformAnnouncement',
  announcementSchema,
  'saas_platform_announcements'
);
