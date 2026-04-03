import mongoose, { Schema } from 'mongoose';

const dealCampaignItemSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Deal item title is required'],
      trim: true,
      maxlength: [255, 'Deal item title cannot exceed 255 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Deal item description cannot exceed 2000 characters'],
    },
    imageUrl: {
      type: String,
      trim: true,
      maxlength: [500, 'Deal item image URL cannot exceed 500 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Deal item price is required'],
      min: [0, 'Deal item price cannot be negative'],
    },
    originalPrice: {
      type: Number,
      min: [0, 'Deal item original price cannot be negative'],
    },
    items: {
      type: [
        {
          productId: { type: Schema.Types.ObjectId, ref: 'Product' },
          productName: { type: String, trim: true },
          quantity: { type: Number, default: 1, min: 1 },
          price: { type: Number, min: 0 },
        },
      ],
      default: [],
    },
    discount: {
      type: Number,
      min: [0, 'Deal item discount cannot be negative'],
      max: [100, 'Deal item discount cannot exceed 100'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
      min: [0, 'Deal item display order cannot be negative'],
    },
    categories: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
      default: [],
    },
  },
  { timestamps: true }
);

const dealCampaignSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Campaign name is required'],
      trim: true,
      maxlength: [255, 'Campaign name cannot exceed 255 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Campaign description cannot exceed 2000 characters'],
    },
    heroBanner: {
      imageUrl: { type: String, trim: true, maxlength: 500 },
      title: { type: String, trim: true, maxlength: 100 },
      subtitle: { type: String, trim: true, maxlength: 200 },
      bgColor: { type: String, trim: true, maxlength: 50 },
    },
    deals: {
      type: [dealCampaignItemSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'SCHEDULED'],
      default: 'ACTIVE',
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    displayOrder: {
      type: Number,
      default: 0,
      min: [0, 'Campaign display order cannot be negative'],
    },
    category: {
      type: String,
      trim: true,
      maxlength: [100, 'Campaign category cannot exceed 100 characters'],
    },
    categories: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
      default: [],
    },
    branch: [{
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      default: [],
    }],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

dealCampaignSchema.index({ branch: 1 });
dealCampaignSchema.index({ status: 1, deletedAt: 1 });
dealCampaignSchema.index({ displayOrder: 1, createdAt: -1 });
dealCampaignSchema.index({ startDate: 1, endDate: 1 });
dealCampaignSchema.index({ category: 1 });
dealCampaignSchema.index({ categories: 1 });

// Pre-find middleware to exclude deleted records
// eslint-disable-next-line @typescript-eslint/no-explicit-any
dealCampaignSchema.pre(/^find/, function (this: any, next: any) {
  if (!this.getQuery().deletedAt) {
    this.where({ deletedAt: { $eq: null } });
  }
  next();
});

export const DealCampaign = mongoose.model('DealCampaign', dealCampaignSchema);
