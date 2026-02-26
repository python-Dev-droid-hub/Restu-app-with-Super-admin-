import mongoose, { Schema } from 'mongoose';

const productSizeSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  size: {
    type: Schema.Types.ObjectId,
    ref: 'Size',
    required: [true, 'Size is required']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound index for unique product-size combination
productSizeSchema.index({ product: 1, size: 1 }, { unique: true });

// Indexes for better performance
productSizeSchema.index({ product: 1 });
productSizeSchema.index({ size: 1 });
productSizeSchema.index({ isAvailable: 1, deletedAt: 1 });

// Pre-find middleware to exclude deleted records
productSizeSchema.pre(/^find/, function(this: any, next: any) {
  if (!this.getQuery().deletedAt) {
    this.where({ deletedAt: null });
  }
  next();
});

// Pre-save middleware to ensure only one default size per product
productSizeSchema.pre('save', async function(this: any, next: any) {
  if (this.isDefault && this.isNew) {
    try {
      const Model = this.constructor as any;
      await Model.updateMany(
        { 
          product: this.product, 
          _id: { $ne: this._id },
          deletedAt: null 
        },
        { isDefault: false }
      );
    } catch (error) {
      return next(error as Error);
    }
  }
  next();
});

// Pre-delete middleware to handle product size deletion
productSizeSchema.pre('deleteOne', { document: true, query: false }, async function(this: any, next: any) {
  try {
    // Check if this is the only size for the product
    const Model = this.constructor as any;
    const remainingSizes = await Model.countDocuments({
      product: this.product,
      _id: { $ne: this._id },
      deletedAt: null
    });
    
    if (remainingSizes === 0) {
      // If this is the last size, update the product to not have sizes
      const Product = mongoose.model('Product');
      await Product.findByIdAndUpdate(this.product, {
        hasSizes: false
      });
    }
    
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to soft delete
productSizeSchema.methods.softDelete = function(this: any) {
  this.deletedAt = new Date();
  this.isAvailable = false;
  return this.save();
};

// Method to restore
productSizeSchema.methods.restore = function(this: any) {
  this.deletedAt = null;
  this.isAvailable = true;
  return this.save();
};

// Method to set as default
productSizeSchema.methods.setAsDefault = async function(this: any) {
  try {
    // Remove default from other sizes
    const Model = this.constructor as any;
    await Model.updateMany(
      { 
        product: this.product, 
        _id: { $ne: this._id },
        deletedAt: null 
      },
      { isDefault: false }
    );
    
    // Set this as default
    this.isDefault = true;
    return await this.save();
  } catch (error) {
    throw error;
  }
};

// Static method to find sizes for a product
productSizeSchema.statics.findByProduct = function(productId: string) {
  return this.find({ 
    product: productId,
    deletedAt: null 
  })
    .populate('size')
    .populate('product')
    .sort({ 'size.displayOrder': 1 });
};

// Static method to find default size for a product
productSizeSchema.statics.findDefaultByProduct = function(productId: string) {
  return this.findOne({ 
    product: productId,
    isDefault: true,
    deletedAt: null 
  })
    .populate('size');
};

// Static method to create product size with validation
productSizeSchema.statics.createProductSize = async function(productSizeData: any) {
  // Check if product has sizes flag is set
  const Product = mongoose.model('Product');
  const product = await Product.findById(productSizeData.product);
  
  if (!product) {
    throw new Error('Product not found');
  }
  
  if (!product.hasSizes) {
    throw new Error('Product does not support sizes');
  }
  
  // Create the product size
  const productSize = new this(productSizeData);
  
  // If this is the first size, make it default
  const existingSizesCount = await this.countDocuments({
    product: productSizeData.product,
    deletedAt: null
  });
  
  if (existingSizesCount === 0) {
    productSize.isDefault = true;
  }
  
  return await productSize.save();
};

export const ProductSize = mongoose.model('ProductSize', productSizeSchema);
