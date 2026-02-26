import mongoose, { Schema } from 'mongoose';

const couponRedemptionSchema = new Schema({
  coupon: {
    type: Schema.Types.ObjectId,
    ref: 'Coupon',
    required: [true, 'Coupon is required']
  },
  order: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order is required']
  },
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer is required']
  },
  discountAmount: {
    type: Number,
    required: [true, 'Discount amount is required'],
    min: [0, 'Discount amount cannot be negative']
  },
  redeemedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const couponSchema = new Schema({
  branch: {
    type: Schema.Types.ObjectId,
    ref: 'Branch',
    // null means applicable to all branches
  },
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: [50, 'Coupon code cannot exceed 50 characters'],
    match: [/^[A-Z0-9]+$/, 'Coupon code can only contain letters and numbers']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  discountType: {
    type: String,
    enum: ['PERCENTAGE', 'FIXED_AMOUNT'],
    required: [true, 'Discount type is required']
  },
  discountValue: {
    type: Number,
    required: [true, 'Discount value is required'],
    min: [0, 'Discount value cannot be negative']
  },
  maxUsage: {
    type: Number,
    default: 1,
    min: [1, 'Max usage must be at least 1']
  },
  usedCount: {
    type: Number,
    default: 0,
    min: [0, 'Used count cannot be negative']
  },
  maxUsagePerCustomer: {
    type: Number,
    default: 1,
    min: [1, 'Max usage per customer must be at least 1']
  },
  minOrderAmount: {
    type: Number,
    default: 0,
    min: [0, 'Minimum order amount cannot be negative']
  },
  maxDiscountAmount: {
    type: Number,
    min: [0, 'Maximum discount amount cannot be negative']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  expiryDate: {
    type: Date,
    required: [true, 'Expiry date is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  excludeDealProducts: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by is required']
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better performance
couponSchema.index({ branch: 1 });
couponSchema.index({ code: 1, isActive: 1 });
couponSchema.index({ startDate: 1, expiryDate: 1 });
couponSchema.index({ createdBy: 1 });

// Unique index for coupon redemption
couponRedemptionSchema.index({ coupon: 1, order: 1, customer: 1 }, { unique: true });
couponRedemptionSchema.index({ coupon: 1 });
couponRedemptionSchema.index({ customer: 1 });
couponRedemptionSchema.index({ order: 1 });

// Pre-find middleware to exclude deleted records
couponSchema.pre(/^find/, function(this: any, next: any) {
  if (!this.getQuery().deletedAt) {
    this.where({ deletedAt: null });
  }
  next();
});

// Validation for dates
couponSchema.pre('save', function(next: any) {
  if (this.startDate >= this.expiryDate) {
    return next(new Error('Expiry date must be after start date'));
  }
  next();
});

// Method to check if coupon is currently active
couponSchema.methods.isCurrentlyActive = function(date: Date = new Date()): boolean {
  return this.isActive && 
         date >= this.startDate && 
         date <= this.expiryDate &&
         this.usedCount < this.maxUsage;
};

// Method to calculate discount for an amount
couponSchema.methods.calculateDiscount = function(orderAmount: number): number {
  if (!this.isCurrentlyActive()) {
    return 0;
  }
  
  if (orderAmount < this.minOrderAmount) {
    return 0;
  }
  
  let discount = 0;
  
  if (this.discountType === 'PERCENTAGE') {
    discount = (orderAmount * this.discountValue) / 100;
    if (this.maxDiscountAmount && discount > this.maxDiscountAmount) {
      discount = this.maxDiscountAmount;
    }
  } else {
    discount = this.discountValue;
  }
  
  return Math.min(discount, orderAmount);
};

// Method to check if customer can use this coupon
couponSchema.methods.canCustomerUse = async function(customerId: string): Promise<boolean> {
  if (!this.isCurrentlyActive()) {
    return false;
  }
  
  // Check usage limit per customer
  const CouponRedemption = mongoose.model('CouponRedemption');
  const customerUsageCount = await CouponRedemption.countDocuments({
    coupon: this._id,
    customer: customerId
  });
  
  return customerUsageCount < this.maxUsagePerCustomer;
};

// Method to redeem coupon
couponSchema.methods.redeem = async function(orderId: string, customerId: string, orderAmount: number): Promise<any> {
  if (!await this.canCustomerUse(customerId)) {
    throw new Error('Customer cannot use this coupon');
  }
  
  const discountAmount = this.calculateDiscount(orderAmount);
  
  if (discountAmount === 0) {
    throw new Error('Coupon is not applicable to this order');
  }
  
  // Create redemption record
  const CouponRedemption = mongoose.model('CouponRedemption');
  const redemption = new CouponRedemption({
    coupon: this._id,
    order: orderId,
    customer: customerId,
    discountAmount
  });
  
  await redemption.save();
  
  // Update coupon usage count
  this.usedCount += 1;
  await this.save();
  
  return redemption;
};

// Method to soft delete
couponSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

// Method to restore
couponSchema.methods.restore = function() {
  this.deletedAt = null;
  return this.save();
};

// Static method to find active coupons
couponSchema.statics.findActive = function(branchId?: string) {
  const now = new Date();
  const filter: any = {
    isActive: true,
    deletedAt: null,
    startDate: { $lte: now },
    expiryDate: { $gte: now }
  };
  
  if (branchId) {
    filter.$or = [
      { branch: branchId },
      { branch: null }
    ];
  }
  
  return this.find(filter)
    .populate('branch', 'branchName branchCode')
    .populate('createdBy', 'displayName email')
    .sort({ expiryDate: 1 });
};

// Static method to find coupon by code
couponSchema.statics.findByCode = function(code: string) {
  return this.findOne({
    code: code.toUpperCase(),
    isActive: true,
    deletedAt: null
  })
    .populate('branch', 'branchName branchCode');
};

// Static method to validate coupon for customer
couponSchema.statics.validateForCustomer = async function(code: string, customerId: string, orderAmount: number, branchId?: string) {
  const coupon = await (this as any).findByCode(code);
  
  if (!coupon) {
    throw new Error('Coupon not found or inactive');
  }
  
  // Check branch applicability
  if (coupon.branch && branchId && coupon.branch.toString() !== branchId.toString()) {
    throw new Error('Coupon is not applicable to this branch');
  }
  
  if (!await coupon.canCustomerUse(customerId)) {
    throw new Error('Customer cannot use this coupon');
  }
  
  if (orderAmount < coupon.minOrderAmount) {
    throw new Error(`Minimum order amount of ${coupon.minOrderAmount} required`);
  }
  
  const discountAmount = coupon.calculateDiscount(orderAmount);
  
  if (discountAmount === 0) {
    throw new Error('Coupon is not applicable to this order');
  }
  
  return {
    coupon,
    discountAmount,
    finalAmount: orderAmount - discountAmount
  };
};

export const Coupon = mongoose.model('Coupon', couponSchema);
export const CouponRedemption = mongoose.model('CouponRedemption', couponRedemptionSchema);
