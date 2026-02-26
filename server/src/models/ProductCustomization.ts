import mongoose, { Schema } from 'mongoose';

const productCustomizationSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required'],
    index: true
  },
  optionName: {
    type: String,
    required: [true, 'Option name is required'],
    trim: true,
    maxlength: [100, 'Option name cannot exceed 100 characters']
  },
  optionValues: [{
    type: String,
    trim: true,
    maxlength: [100, 'Option value cannot exceed 100 characters']
  }],
  extraPrice: {
    type: Number,
    default: 0,
    min: [0, 'Extra price cannot be negative']
  },
  isActive: {
    type: Boolean,
    default: true
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

// Compound index to ensure unique option name per product
productCustomizationSchema.index({ product: 1, optionName: 1 }, { unique: true });

// Index for active customizations
productCustomizationSchema.index({ product: 1, isActive: 1, deletedAt: 1 });

// Pre-find middleware to exclude deleted records
productCustomizationSchema.pre(/^find/, function(this: mongoose.Query<any, any>, next) {
  if (!this.getQuery().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// Soft delete method
productCustomizationSchema.methods.softDelete = async function() {
  this.deletedAt = new Date();
  return this.save();
};

// Restore method
productCustomizationSchema.methods.restore = async function() {
  this.deletedAt = null;
  return this.save();
};

export const ProductCustomization = mongoose.model('ProductCustomization', productCustomizationSchema);
