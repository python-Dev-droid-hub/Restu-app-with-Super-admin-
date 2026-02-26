import mongoose, { Schema } from 'mongoose';

const branchInventorySchema = new Schema({
  branch: {
    type: Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Branch is required']
  },
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  quantityAvailable: {
    type: Number,
    default: 0,
    min: [0, 'Quantity available cannot be negative']
  },
  reorderLevel: {
    type: Number,
    default: 10,
    min: [0, 'Reorder level cannot be negative']
  },
  category: {
    type: String,
    default: 'Other'
  },
  lastRestockedAt: {
    type: Date
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound index for unique branch-product combination
branchInventorySchema.index({ branch: 1, product: 1 }, { unique: true });

// Indexes for better performance
branchInventorySchema.index({ branch: 1 });
branchInventorySchema.index({ product: 1 });
branchInventorySchema.index({ quantityAvailable: 1 });

// Pre-find middleware to exclude deleted records
branchInventorySchema.pre(/^find/, function(this: any, next: any) {
  if (!this.getQuery().deletedAt) {
    this.where({ deletedAt: null });
  }
  next();
});

// Method to check if item needs restocking
branchInventorySchema.methods.needsRestocking = function(): boolean {
  return this.quantityAvailable <= this.reorderLevel;
};

// Method to update quantity
branchInventorySchema.methods.updateQuantity = function(newQuantity: number, reason?: string) {
  if (newQuantity < 0) {
    throw new Error('Quantity cannot be negative');
  }
  
  const oldQuantity = this.quantityAvailable;
  this.quantityAvailable = newQuantity;
  
  // Update last restocked at if quantity increased
  if (newQuantity > oldQuantity) {
    this.lastRestockedAt = new Date();
  }
  
  return this.save();
};

// Method to add stock
branchInventorySchema.methods.addStock = function(quantity: number) {
  if (quantity <= 0) {
    throw new Error('Quantity to add must be positive');
  }
  
  this.quantityAvailable += quantity;
  this.lastRestockedAt = new Date();
  return this.save();
};

// Method to remove stock
branchInventorySchema.methods.removeStock = function(quantity: number) {
  if (quantity <= 0) {
    throw new Error('Quantity to remove must be positive');
  }
  
  if (this.quantityAvailable < quantity) {
    throw new Error('Insufficient stock available');
  }
  
  this.quantityAvailable -= quantity;
  return this.save();
};

// Method to soft delete
branchInventorySchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  return this.save();
};

// Method to restore
branchInventorySchema.methods.restore = function() {
  this.deletedAt = null;
  return this.save();
};

// Static method to find inventory by branch
branchInventorySchema.statics.findByBranch = function(branchId: string, includeLowStock?: boolean) {
  const filter: any = { branch: branchId };
  
  if (includeLowStock) {
    filter.$expr = { $lte: ['$quantityAvailable', '$reorderLevel'] };
  }
  
  return this.find(filter)
    .populate('product', 'name imageUrl hasSizes')
    .sort({ quantityAvailable: 1 });
};

// Static method to find low stock items
branchInventorySchema.statics.findLowStock = function(branchId?: string) {
  const filter: any = {
    $expr: { $lte: ['$quantityAvailable', '$reorderLevel'] }
  };
  
  if (branchId) {
    filter.branch = branchId;
  }
  
  return this.find(filter)
    .populate('branch', 'branchName branchCode')
    .populate('product', 'name imageUrl')
    .sort({ quantityAvailable: 1 });
};

// Static method to find inventory by product
branchInventorySchema.statics.findByProduct = function(productId: string) {
  return this.find({ product: productId })
    .populate('branch', 'branchName branchCode')
    .sort({ quantityAvailable: -1 });
};

// Static method to update or create inventory
branchInventorySchema.statics.upsertInventory = async function(branchId: string, productId: string, quantity: number, reorderLevel?: number) {
  const existing = await this.findOne({ branch: branchId, product: productId });
  
  if (existing) {
    existing.quantityAvailable = quantity;
    if (reorderLevel !== undefined) {
      existing.reorderLevel = reorderLevel;
    }
    existing.lastRestockedAt = new Date();
    return await existing.save();
  } else {
    const inventory = new this({
      branch: branchId,
      product: productId,
      quantityAvailable: quantity,
      reorderLevel: reorderLevel || 10,
      lastRestockedAt: new Date()
    });
    return await inventory.save();
  }
};

// Static method to check product availability
branchInventorySchema.statics.checkAvailability = async function(branchId: string, productId: string, requiredQuantity: number): Promise<boolean> {
  const inventory = await this.findOne({ branch: branchId, product: productId });
  
  if (!inventory) {
    return false; // No inventory record means not available
  }
  
  return inventory.quantityAvailable >= requiredQuantity;
};

// Static method to get inventory statistics
branchInventorySchema.statics.getInventoryStats = function(branchId?: string) {
  const matchStage: any = {};
  if (branchId) {
    matchStage.branch = new mongoose.Types.ObjectId(branchId);
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        totalQuantity: { $sum: '$quantityAvailable' },
        lowStockItems: {
          $sum: {
            $cond: [{ $lte: ['$quantityAvailable', '$reorderLevel'] }, 1, 0]
          }
        },
        outOfStockItems: {
          $sum: {
            $cond: [{ $eq: ['$quantityAvailable', 0] }, 1, 0]
          }
        }
      }
    }
  ]);
};

export const BranchInventory = mongoose.model('BranchInventory', branchInventorySchema);
