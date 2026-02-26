import mongoose, { Schema } from 'mongoose';

const dealProductSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  }
}, { _id: false });

const dealSchema = new Schema({
  branch: {
    type: Schema.Types.ObjectId,
    ref: 'Branch',
    // null means applicable to all branches
  },
  title: {
    type: String,
    required: [true, 'Deal title is required'],
    trim: true,
    maxlength: [255, 'Deal title cannot exceed 255 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
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
  maxDiscountAmount: {
    type: Number,
    min: [0, 'Maximum discount amount cannot be negative']
  },
  minOrderAmount: {
    type: Number,
    default: 0,
    min: [0, 'Minimum order amount cannot be negative']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  expiryDate: {
    type: Date,
    required: [true, 'Expiry date is required']
  },
  imageUrl: {
    type: String,
    trim: true,
    maxlength: [500, 'Image URL cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  excludeCoupons: {
    type: Boolean,
    default: true
  },
  products: {
    type: [dealProductSchema],
    default: []
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better performance
dealSchema.index({ branch: 1 });
dealSchema.index({ isActive: 1, deletedAt: 1 });
dealSchema.index({ startDate: 1, expiryDate: 1 });
dealSchema.index({ 'products.product': 1 });

// Pre-find middleware to exclude deleted records
dealSchema.pre(/^find/, function(this: any, next: any) {
  if (!this.getQuery().deletedAt) {
    this.where({ deletedAt: { $eq: null } });
  }
  next();
});

// Validation for dates
dealSchema.pre('save', function(next: any) {
  if (this.startDate >= this.expiryDate) {
    return next(new Error('Expiry date must be after start date'));
  }
  next();
});

// Method to check if deal is currently active
dealSchema.methods.isCurrentlyActive = function(date: Date = new Date()): boolean {
  return this.isActive && 
         date >= this.startDate && 
         date <= this.expiryDate;
};

// Method to calculate discount for an amount
dealSchema.methods.calculateDiscount = function(orderAmount: number): number {
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

// Method to check if product is included in deal
dealSchema.methods.hasProduct = function(productId: string): boolean {
  return this.products.some((p: any) => p.product.toString() === productId.toString());
};

// Method to soft delete
dealSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

// Method to restore
dealSchema.methods.restore = function() {
  this.deletedAt = null;
  return this.save();
};

// Static method to find active deals
dealSchema.statics.findActive = function(branchId?: string, productId?: string) {
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
  
  if (productId) {
    filter['products.product'] = productId;
  }
  
  return this.find(filter)
    .populate('branch', 'branchName branchCode')
    .populate('products.product', 'name imageUrl')
    .sort({ expiryDate: 1 });
};

// Static method to find deals applicable to products
dealSchema.statics.findApplicableToProducts = function(productIds: string[], branchId?: string) {
  const now = new Date();
  const filter: any = {
    isActive: true,
    deletedAt: null,
    startDate: { $lte: now },
    expiryDate: { $gte: now },
    'products.product': { $in: productIds }
  };
  
  if (branchId) {
    filter.$or = [
      { branch: branchId },
      { branch: null }
    ];
  }
  
  return this.find(filter)
    .populate('branch', 'branchName branchCode')
    .populate('products.product', 'name imageUrl');
};

// Static method to get best deal for order
dealSchema.statics.getBestDealForOrder = function(productIds: string[], orderAmount: number, branchId?: string) {
  const now = new Date();
  const filter: any = {
    isActive: true,
    deletedAt: null,
    startDate: { $lte: now },
    expiryDate: { $gte: now },
    minOrderAmount: { $lte: orderAmount },
    $or: [
      { 'products.product': { $in: productIds } },
      { 'products': { $size: 0 } } // Deals applicable to all products
    ]
  };
  
  if (branchId) {
    filter.$or = [
      { branch: branchId },
      { branch: null }
    ];
  }
  
  return this.find(filter)
    .populate('branch', 'branchName branchCode')
    .populate('products.product', 'name imageUrl')
    .sort({ discountValue: -1 });
};

export const Deal = mongoose.model('Deal', dealSchema);
