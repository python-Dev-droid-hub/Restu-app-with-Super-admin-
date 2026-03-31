import mongoose, { Schema } from 'mongoose';

/**
 * BranchProduct - Maps products to branches with activation status
 * This enables a global product catalog where each branch can activate/deactivate products
 */
const branchProductSchema = new Schema({
  branchId: {
    type: Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Branch ID is required'],
    index: true,
  },
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required'],
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  // Optional: Branch-specific price override
  branchPrice: {
    type: Number,
    min: [0, 'Price cannot be negative'],
    default: null,
  },
  // Optional: Branch-specific availability
  isAvailable: {
    type: Boolean,
    default: true,
  },
  // Who activated this product for the branch
  activatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  activatedAt: {
    type: Date,
    default: null,
  },
  deactivatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  deactivatedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Compound unique index - one product per branch
branchProductSchema.index({ branchId: 1, productId: 1 }, { unique: true });

// Index for quick lookup of active products for a branch
branchProductSchema.index({ branchId: 1, isActive: 1 });

// Virtual to get product details
branchProductSchema.virtual('product', {
  ref: 'Product',
  localField: 'productId',
  foreignField: '_id',
  justOne: true,
});

// Static method to get active products for a branch
branchProductSchema.statics.getActiveProductsForBranch = async function(branchId: string) {
  return this.find({ branchId, isActive: true })
    .populate('productId')
    .lean();
};

// Static method to check if product is active for branch
branchProductSchema.statics.isProductActiveForBranch = async function(branchId: string, productId: string): Promise<boolean> {
  const mapping = await this.findOne({ branchId, productId, isActive: true }).lean();
  return !!mapping;
};

// Static method to activate product for branch
branchProductSchema.statics.activateProductForBranch = async function(
  branchId: string,
  productId: string,
  userId: string
) {
  return this.findOneAndUpdate(
    { branchId, productId },
    {
      $set: {
        isActive: true,
        activatedBy: userId,
        activatedAt: new Date(),
      },
      $unset: {
        deactivatedBy: 1,
        deactivatedAt: 1,
      },
    },
    { upsert: true, new: true }
  );
};

// Static method to deactivate product for branch
branchProductSchema.statics.deactivateProductForBranch = async function(
  branchId: string,
  productId: string,
  userId: string
) {
  return this.findOneAndUpdate(
    { branchId, productId },
    {
      $set: {
        isActive: false,
        deactivatedBy: userId,
        deactivatedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );
};

// Static method to get all branch activations for a product
branchProductSchema.statics.getProductBranchActivations = async function(productId: string) {
  return this.find({ productId })
    .populate('branchId', 'name branchName code')
    .populate('activatedBy', 'name email')
    .lean();
};

export const BranchProduct = mongoose.model('BranchProduct', branchProductSchema);
export default BranchProduct;
