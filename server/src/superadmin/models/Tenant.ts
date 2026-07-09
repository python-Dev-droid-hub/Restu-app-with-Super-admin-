import mongoose, { Schema } from 'mongoose';
import { ITenantSettings } from '@/superadmin/types';

const defaultSettings: ITenantSettings = {
  currency: 'PKR',
  timezone: 'Asia/Karachi',
  language: 'en',
  tax_rate: 5,
  service_charge: 10,
  delivery_fee: 150,
  order_prefix: 'ORD',
};

const tenantSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    legalName: { type: String, trim: true },
    logoUrl: { type: String, trim: true },
    faviconUrl: { type: String, trim: true },
    primaryColor: { type: String, default: '#FA4A0C' },
    secondaryColor: { type: String, default: '#2D2D2D' },
    ownerName: { type: String, required: true, trim: true },
    ownerEmail: { type: String, required: true, unique: true, lowercase: true, trim: true },
    ownerPhone: { type: String, required: true, trim: true },
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    businessType: {
      type: String,
      enum: ['RESTAURANT', 'CAFE', 'BAKERY', 'CLOUD_KITCHEN', 'FOOD_TRUCK'],
      default: 'RESTAURANT',
    },
    cuisineType: { type: String, trim: true },
    registrationNumber: { type: String, trim: true },
    taxNumber: { type: String, trim: true },
    addressLine: { type: String, trim: true },
    city: { type: String, trim: true },
    country: { type: String, default: 'Pakistan', trim: true },
    customDomain: { type: String, unique: true, sparse: true, trim: true },
    customDomainVerified: { type: Boolean, default: false },
    planId: { type: Schema.Types.ObjectId, ref: 'SaasPlan', required: true },
    subscriptionStatus: {
      type: String,
      enum: ['TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'SUSPENDED', 'EXPIRED'],
      default: 'TRIAL',
    },
    trialEndsAt: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    trialWarningSentAt: { type: Date },
    subscriptionStartsAt: { type: Date },
    subscriptionEndsAt: { type: Date },
    billingCycle: { type: String, enum: ['MONTHLY', 'YEARLY'], default: 'MONTHLY' },
    currentMonthOrders: { type: Number, default: 0 },
    lastUsageResetAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    suspendedReason: { type: String },
    suspendedAt: { type: Date },
    onboardingCompleted: { type: Boolean, default: false },
    onboardingStep: { type: Number, default: 1 },
    settings: { type: Schema.Types.Mixed, default: () => ({ ...defaultSettings }) },
    featureOverrides: { type: Schema.Types.Mixed, default: {} },
    launchedBy: { type: Schema.Types.ObjectId, ref: 'SuperAdmin' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

tenantSchema.index({ subscriptionStatus: 1, isActive: 1 });
tenantSchema.index({ city: 1 });
tenantSchema.index({ createdAt: -1 });

tenantSchema.pre(/^find/, function (this: mongoose.Query<any, any>, next) {
  if (!this.getQuery().deletedAt && !this.getQuery().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

export const Tenant = mongoose.model('SaasTenant', tenantSchema, 'saas_tenants');
