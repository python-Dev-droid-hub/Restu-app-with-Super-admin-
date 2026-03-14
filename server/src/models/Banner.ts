import mongoose, { Schema } from 'mongoose';

const bannerSchema = new Schema({
  title: {
    type: String,
    required: [true, 'Banner title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  subtitle: {
    type: String,
    trim: true,
    maxlength: [200, 'Subtitle cannot exceed 200 characters']
  },
  imageUrl: {
    type: String,
    required: [true, 'Banner image URL is required'],
    trim: true
  },
  actionUrl: {
    type: String,
    trim: true,
    default: null
  },
  actionText: {
    type: String,
    trim: true,
    default: 'Order Now'
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
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null
  },
  branchId: {
    type: Schema.Types.ObjectId,
    ref: 'Branch',
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better performance
bannerSchema.index({ isActive: 1, displayOrder: 1 });
bannerSchema.index({ startDate: 1, endDate: 1 });
bannerSchema.index({ branchId: 1 });

// Pre-find middleware to filter active banners
bannerSchema.pre(/^find/, function(this: any, next: any) {
  if (!this.getQuery().includeInactive) {
    this.where({ isActive: true });
  }
  next();
});

// Static method to get active banners for display
bannerSchema.statics.getActiveBanners = function(branchId?: string, limit: number = 10) {
  const now = new Date();
  const filter: any = {
    isActive: true,
    $or: [
      { startDate: null, endDate: null },
      { startDate: { $lte: now }, endDate: null },
      { startDate: null, endDate: { $gte: now } },
      { startDate: { $lte: now }, endDate: { $gte: now } }
    ]
  };
  
  if (branchId) {
    filter.$and = [
      { $or: [{ branchId: branchId }, { branchId: null }] }
    ];
  }
  
  return this.find(filter)
    .sort({ displayOrder: 1, createdAt: -1 })
    .limit(limit)
    .lean();
};

export const Banner = mongoose.model('Banner', bannerSchema);
