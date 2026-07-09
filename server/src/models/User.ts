import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from '@/types';

const userSchema = new Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false,
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: [255, 'Display name cannot exceed 255 characters'],
  },
  phoneNumber: {
    type: String,
    trim: true,
    match: [/^\+[1-9]\d{7,14}$/, 'Please enter a valid phone number'],
  },
  role: {
    type: String,
    enum: ['CUSTOMER', 'RIDER', 'ADMIN', 'WAITER', 'CHEF', 'BRANCH_MANAGER', 'SUPER_ADMIN'],
    required: [true, 'Role is required'],
    default: 'CUSTOMER',
  },
  profileImage: {
    type: String,
    trim: true,
    maxlength: [500, 'Profile image URL cannot exceed 500 characters'],
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  phoneVerified: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // For Riders
  vehicleNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'Vehicle number cannot exceed 50 characters'],
  },
  vehicleType: {
    type: String,
    trim: true,
    maxlength: [50, 'Vehicle type cannot exceed 50 characters'],
  },
  // Rider duty status
  onDuty: {
    type: Boolean,
    default: false,
  },
  // Rider current location for auto-assignment
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      required: false,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: undefined,
    },
  },
  lastLocationUpdate: {
    type: Date,
  },
  // For Chefs
  specialization: {
    type: String,
    trim: true,
    maxlength: [100, 'Specialization cannot exceed 100 characters'],
  },
  // For Waiters
  assignedSection: {
    type: String,
    trim: true,
    maxlength: [50, 'Assigned section cannot exceed 50 characters'],
  },
  // Branch Assignment for staff members
  assignedBranch: {
    type: Schema.Types.ObjectId,
    ref: 'Branch',
  },
  /** SaaS tenant scope (optional — set when user belongs to a restaurant tenant) */
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'SaasTenant',
    index: true,
  },
  fcmToken: {
    type: String,
    trim: true,
  },
  lastLoginAt: {
    type: Date,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc: any, ret: any) {
      delete ret.passwordHash;
      return ret;
    },
  },
});

// Hash password before saving
userSchema.pre('save', async function(this: any, next: any) {
  // Ensure we never persist an invalid GeoJSON point (breaks 2dsphere index)
  if (this.currentLocation) {
    const coords = this.currentLocation.coordinates;
    const isValidCoords = Array.isArray(coords) && coords.length === 2 && coords.every((n: any) => typeof n === 'number');
    if (!isValidCoords) {
      this.currentLocation = undefined;
    }
  }

  if (!this.isModified('passwordHash')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, (this as any).passwordHash);
};

// Get user's public profile
userSchema.methods.getPublicProfile = function() {
  return {
    _id: this._id,
    email: this.email,
    name: this.displayName, // For client compatibility
    displayName: this.displayName,
    role: this.role,
    phoneNumber: this.phoneNumber,
    profileImage: this.profileImage,
    avatar: this.profileImage, // For client compatibility
    emailVerified: this.emailVerified,
    phoneVerified: this.phoneVerified,
    assignedBranch: this.assignedBranch,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
    isActive: this.isActive,
    tenantId: this.tenantId?.toString?.() || this.tenantId || undefined,
  };
};

// Indexes for better performance (email already indexed via unique: true)
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1, deletedAt: 1 });
userSchema.index({ assignedBranch: 1 });
userSchema.index({ tenantId: 1 });
userSchema.index({ currentLocation: '2dsphere' });

// Pre-find middleware to exclude deleted records
userSchema.pre(/^find/, function(this: any, next: any) {
  if (!this.getQuery().deletedAt) {
    this.where({ deletedAt: null });
  }
  next();
});

// Method to soft delete
userSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

// Method to restore
userSchema.methods.restore = function() {
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

// Static method to find users by role
userSchema.statics.findByRole = function(role: string) {
  return this.find({ 
    role: role,
    isActive: true,
    deletedAt: null 
  });
};

// Static method to find staff by branch
userSchema.statics.findStaffByBranch = function(branchId: string) {
  return this.find({
    assignedBranch: branchId,
    role: { $in: ['WAITER', 'CHEF', 'BRANCH_MANAGER'] },
    isActive: true,
    deletedAt: null
  });
};

export const User = mongoose.model<IUser>('User', userSchema);
