import mongoose, { Schema } from 'mongoose';

const subscriptionSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'SaasTenant', required: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: 'SaasPlan', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'PKR' },
    billingCycle: { type: String, enum: ['MONTHLY', 'YEARLY'], required: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'CANCELLED', 'EXPIRED', 'PAST_DUE'],
      default: 'ACTIVE',
    },
    startedAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    cancelledAt: { type: Date },
    cancelReason: { type: String },
    paymentMethod: { type: String },
    transactionRef: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Subscription = mongoose.model(
  'SaasSubscription',
  subscriptionSchema,
  'saas_subscriptions'
);
