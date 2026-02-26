import mongoose, { Schema } from 'mongoose';

const orderRejectionSchema = new Schema({
  order: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order is required'],
    index: true
  },
  rejectedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Rejected by is required']
  },
  rejectionType: {
    type: String,
    enum: ['KITCHEN', 'RIDER'],
    required: [true, 'Rejection type is required']
  },
  rejectionReason: {
    type: String,
    required: [true, 'Rejection reason is required'],
    trim: true,
    maxlength: [1000, 'Rejection reason cannot exceed 1000 characters']
  },
  isResolved: {
    type: Boolean,
    default: false
  },
  resolvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for querying rejections by order
orderRejectionSchema.index({ order: 1 });

// Index for querying unresolved rejections
orderRejectionSchema.index({ isResolved: 1, createdAt: -1 });

export const OrderRejection = mongoose.model('OrderRejection', orderRejectionSchema);
