import mongoose, { Schema } from 'mongoose';

const tenantBranchSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'SaasTenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, uppercase: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'User' },
    addressLine: { type: String, required: true, trim: true },
    city: { type: String, trim: true },
    area: { type: String, trim: true },
    lat: { type: Number },
    lng: { type: Number },
    openingTime: { type: String, default: '09:00' },
    closingTime: { type: String, default: '23:00' },
    isOpen24Hours: { type: Boolean, default: false },
    printerIp: { type: String, trim: true },
    printerPort: { type: Number, default: 9100 },
    printerType: { type: String, default: 'THERMAL' },
    deliveryRadiusKm: { type: Number, default: 10 },
    isActive: { type: Boolean, default: true },
    isAcceptingOrders: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

tenantBranchSchema.index({ tenantId: 1, isActive: 1 });

tenantBranchSchema.pre(/^find/, function (this: mongoose.Query<any, any>, next) {
  if (!this.getQuery().deletedAt) {
    this.where({ deletedAt: null });
  }
  next();
});

export const TenantBranch = mongoose.model(
  'SaasTenantBranch',
  tenantBranchSchema,
  'saas_tenant_branches'
);
