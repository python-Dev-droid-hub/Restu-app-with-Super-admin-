import mongoose, { Schema } from 'mongoose';

const dealProductSchema = new Schema({
  deal: {
    type: Schema.Types.ObjectId,
    ref: 'Deal',
    required: [true, 'Deal is required']
  },
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index to ensure unique product per deal
dealProductSchema.index({ deal: 1, product: 1 }, { unique: true });

// Index for querying products by deal or deals by product
dealProductSchema.index({ deal: 1 });
dealProductSchema.index({ product: 1 });

export const DealProduct = mongoose.model('DealProduct', dealProductSchema);
