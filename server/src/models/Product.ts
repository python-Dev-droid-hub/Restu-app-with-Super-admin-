import mongoose, { Schema } from 'mongoose';

const productCustomizationSchema = new Schema({
  optionName: {
    type: String,
    required: [true, 'Option name is required'],
    trim: true,
    maxlength: [100, 'Option name cannot exceed 100 characters']
  },
  optionValues: {
    type: [String],
    required: [true, 'Option values are required'],
    validate: {
      validator: function(values: string[]) {
        return values.length > 0;
      },
      message: 'Option values must contain at least one value'
    }
  },
  extraPrice: {
    type: Number,
    default: 0,
    min: [0, 'Extra price cannot be negative']
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, { _id: false });

const productSchema = new Schema({
  // Branch assignment for multi-branch setups
  branchId: [{
    type: Schema.Types.ObjectId,
    ref: 'Branch',
    index: true,
  }],
  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [255, 'Product name cannot exceed 255 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  price: {
    type: Number,
    min: [0, 'Price cannot be negative'],
    validate: {
      validator: function(this: any) {
        // Price validation: if product doesn't have sizes, price must be > 0
        // If product has sizes, price can be 0 or undefined (size prices are used instead)
        // Allow updates where price might be 0 for sized products
        if (this.hasSizes) {
          return true; // Price is optional for products with sizes
        }
        // For products without sizes, price must be defined and > 0
        return this.price !== undefined && this.price !== null && this.price > 0;
      },
      message: 'Price is required for products without sizes'
    }
  },
  hasSizes: {
    type: Boolean,
    default: false
  },
  imageUrl: {
    type: String,
    trim: true,
    maxlength: [500, 'Image URL cannot exceed 500 characters']
  },
  images: {
    type: [String],
    default: [],
  },
  // Product activation (used for branch-specific menu visibility)
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  preparationTime: {
    type: Number,
    min: [1, 'Preparation time must be at least 1 minute'],
    max: [180, 'Preparation time cannot exceed 3 hours']
  },
  isVegetarian: {
    type: Boolean,
    default: false
  },
  spiceLevel: {
    type: String,
    enum: ['Mild', 'Medium', 'Hot', 'Extra Hot'],
    trim: true
  },
  availableForDelivery: {
    type: Boolean,
    default: true
  },
  availableForDineIn: {
    type: Boolean,
    default: true
  },
  availableForTakeaway: {
    type: Boolean,
    default: true
  },
  orderCount: {
    type: Number,
    default: 0,
    min: [0, 'Order count cannot be negative']
  },
  customizations: {
    type: [productCustomizationSchema],
    default: []
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
productSchema.index({ branchId: 1, isActive: 1, isAvailable: 1, deletedAt: 1 });
productSchema.index({ category: 1 });
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ isAvailable: 1, deletedAt: 1 });
productSchema.index({ hasSizes: 1 });
productSchema.index({ isVegetarian: 1 });
productSchema.index({ orderCount: -1 });

// Pre-find middleware to exclude deleted records
productSchema.pre(/^find/, function(this: any, next: any) {
  if (!this.getQuery().deletedAt) {
    this.where({ deletedAt: null });
  }
  next();
});

// Virtual for product sizes
productSchema.virtual('productSizes', {
  ref: 'ProductSize',
  localField: '_id',
  foreignField: 'product'
});

// Virtual for effective price (considering sizes)
productSchema.virtual('effectivePrice').get(function(this: any) {
  const productSizes = this.productSizes as any[] | undefined;
  if (this.hasSizes && productSizes && productSizes.length > 0) {
    // Return the lowest size price as default
    const sizePrices = productSizes.map((ps: any) => ps.price);
    return Math.min(...sizePrices);
  }
  return this.price;
});

// Method to get available sizes
productSchema.methods.getAvailableSizes = async function() {
  if (!this.hasSizes) return [];
  
  const ProductSize = mongoose.model('ProductSize');
  const sizes = await ProductSize.find({
    product: this._id,
    deletedAt: null
  }).populate('size');
  
  return sizes.filter(ps => ps.size && ps.size.isActive);
};

// Method to get price for specific size
productSchema.methods.getPriceForSize = async function(sizeId: string) {
  if (!this.hasSizes) return this.price;
  
  const ProductSize = mongoose.model('ProductSize');
  const productSize = await ProductSize.findOne({
    product: this._id,
    size: sizeId,
    deletedAt: null
  });
  
  return productSize ? productSize.price : this.price;
};

// Method to increment order count
productSchema.methods.incrementOrderCount = function() {
  this.orderCount += 1;
  return this.save();
};

// Method to soft delete
productSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  this.isAvailable = false;
  return this.save();
};

// Method to restore
productSchema.methods.restore = function() {
  this.deletedAt = null;
  return this.save();
};

// Static method to find available products
productSchema.statics.findAvailable = function(categoryId?: string) {
  const filter: any = { 
    isAvailable: true, 
    deletedAt: null 
  };
  
  if (categoryId) {
    filter.category = categoryId;
  }
  
  return this.find(filter)
    .populate('category')
    .sort({ orderCount: -1, name: 1 });
};

// Static method to search products
productSchema.statics.searchProducts = function(searchTerm: string, categoryId?: string) {
  const filter: any = {
    $text: { $search: searchTerm },
    isAvailable: true,
    deletedAt: null
  };
  
  if (categoryId) {
    filter.category = categoryId;
  }
  
  return this.find(filter, { score: { $meta: 'textScore' } })
    .populate('category')
    .sort({ score: { $meta: 'textScore' } });
};

export const Product = mongoose.model('Product', productSchema);
