import mongoose, { Schema } from 'mongoose';

const categorySchema = new Schema({
  branchId: [{
    type: Schema.Types.ObjectId,
    ref: 'Branch',
    index: true,
  }],
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'SaasTenant',
    index: true,
    default: null,
  },
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: [100, 'Category name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  imageUrl: {
    type: String,
    trim: true,
    maxlength: [500, 'Image URL cannot exceed 500 characters']
  },
  displayOrder: {
    type: Number,
    default: 0,
    min: [0, 'Display order cannot be negative']
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
  timestamps: true
});

// Indexes for better performance
categorySchema.index({ tenantId: 1, name: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
categorySchema.index({ name: 1 });
categorySchema.index({ displayOrder: 1 });
categorySchema.index({ isActive: 1, deletedAt: 1 });

// Pre-find middleware to exclude deleted records
categorySchema.pre(/^find/, function(this: any, next: any) {
  if (!this.getQuery().deletedAt) {
    this.where({ deletedAt: null });
  }
  next();
});

// Pre-save middleware to set display order
categorySchema.pre('save', async function(next: any) {
  if (this.isNew && this.displayOrder === 0) {
    try {
      const Model = this.constructor as any;
      const lastCategory = await Model
        .findOne({ deletedAt: null })
        .sort('-displayOrder');
      
      this.displayOrder = lastCategory ? lastCategory.displayOrder + 1 : 1;
    } catch (error) {
      return next(error as Error);
    }
  }
  next();
});

// Method to soft delete
categorySchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

// Method to restore
categorySchema.methods.restore = function() {
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

// Static method to find active categories
categorySchema.statics.findActive = function() {
  return this.find({ isActive: true, deletedAt: null }).sort('displayOrder');
};

export const Category = mongoose.model('Category', categorySchema);
