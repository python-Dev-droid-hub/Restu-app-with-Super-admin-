import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { ISuperAdminDocument } from '@/superadmin/types';

const superAdminSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    displayName: { type: String, trim: true },
    phoneNumber: { type: String, trim: true },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'SUPPORT_AGENT', 'BILLING_MANAGER', 'ONBOARDING_AGENT'],
      default: 'SUPER_ADMIN',
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

superAdminSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (err) {
    next(err as Error);
  }
});

superAdminSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const SuperAdmin = mongoose.model<ISuperAdminDocument>(
  'SuperAdmin',
  superAdminSchema
);
