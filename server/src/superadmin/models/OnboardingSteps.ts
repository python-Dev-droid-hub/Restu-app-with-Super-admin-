import mongoose, { Schema } from 'mongoose';

const onboardingStepsSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'SaasTenant', required: true, unique: true },
    stepProfileComplete: { type: Boolean, default: false },
    stepBranchCreated: { type: Boolean, default: false },
    stepMenuAdded: { type: Boolean, default: false },
    stepStaffAdded: { type: Boolean, default: false },
    stepTableAdded: { type: Boolean, default: false },
    stepTestOrder: { type: Boolean, default: false },
    stepPaymentSetup: { type: Boolean, default: false },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

export const OnboardingSteps = mongoose.model(
  'SaasOnboardingSteps',
  onboardingStepsSchema,
  'saas_onboarding_steps'
);
