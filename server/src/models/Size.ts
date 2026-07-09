import mongoose, { Schema } from 'mongoose';

const sizeSchema = new Schema({
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'SaasTenant',
    default: null,
    index: true,
  },
  size_name: {
    type: String,
    required: [true, 'Size name is required'],
    trim: true,
    maxlength: [50, 'Size name cannot exceed 50 characters']
  },
  display_order: {
    type: Number,
    default: 0,
    min: [0, 'Display order cannot be negative']
  },
  is_active: {
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
sizeSchema.index({ tenantId: 1, size_name: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
sizeSchema.index({ display_order: 1 });
sizeSchema.index({ is_active: 1, deletedAt: 1 });

// Pre-find middleware to exclude deleted records
sizeSchema.pre(/^find/, function(this: any, next: any) {
  if (!this.getQuery().deletedAt) {
    this.where({ deletedAt: null });
  }
  next();
});

// Pre-save middleware to set display order
sizeSchema.pre('save', async function(next: any) {
  if (this.isNew && this.display_order === 0) {
    try {
      const Model = this.constructor as any;
      const lastSize = await Model
        .findOne({ deletedAt: null })
        .sort('-display_order');
      
      this.display_order = lastSize ? lastSize.display_order + 1 : 1;
    } catch (error) {
      return next(error as Error);
    }
  }
  next();
});

// Method to soft delete
sizeSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  this.is_active = false;
  return this.save();
};

// Method to restore
sizeSchema.methods.restore = function() {
  this.deletedAt = null;
  this.is_active = true;
  return this.save();
};

// Static method to find active sizes
sizeSchema.statics.findActive = function() {
  return this.find({ is_active: true, deletedAt: null }).sort('display_order');
};

// Static method to initialize default sizes
sizeSchema.statics.initializeDefaults = async function() {
  const existingSizes = await this.countDocuments();
  if (existingSizes === 0) {
    const defaultSizes = [
      { size_name: 'Small', display_order: 1 },
      { size_name: 'Medium', display_order: 2 },
      { size_name: 'Large', display_order: 3 },
      { size_name: 'Extra Large', display_order: 4 },
      { size_name: 'Family Size', display_order: 5 }
    ];
    
    await this.insertMany(defaultSizes);
  }
};

export const Size = mongoose.model('Size', sizeSchema);
