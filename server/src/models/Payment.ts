import mongoose, { Schema } from 'mongoose';

const paymentSchema = new Schema({
  paymentNumber: {
    type: String,
    required: [true, 'Payment number is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'Payment number cannot exceed 50 characters']
  },
  order: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order is required'],
    unique: true
  },
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    default: 'PKR',
    uppercase: true,
    maxlength: [10, 'Currency cannot exceed 10 characters']
  },
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    trim: true,
    maxlength: [50, 'Payment method cannot exceed 50 characters']
  },
  provider: {
    type: String,
    trim: true,
    maxlength: [50, 'Provider cannot exceed 50 characters']
  },
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUNDED'],
    default: 'PENDING'
  },
  transactionId: {
    type: String,
    trim: true,
    maxlength: [255, 'Transaction ID cannot exceed 255 characters']
  },
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    maxlength: [255, 'Idempotency key cannot exceed 255 characters']
  },
  gatewayResponse: {
    type: Schema.Types.Mixed,
    default: null
  },
  failureReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Failure reason cannot exceed 500 characters']
  },
  refundAmount: {
    type: Number,
    min: [0, 'Refund amount cannot be negative']
  },
  refundReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Refund reason cannot exceed 500 characters']
  },
  refundedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better performance
paymentSchema.index({ order: 1 });
paymentSchema.index({ customer: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ idempotencyKey: 1 });
paymentSchema.index({ createdAt: -1 });

// Pre-save middleware to set payment number
paymentSchema.pre('save', async function(next: any) {
  if (this.isNew && !this.paymentNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const Model = this.constructor as any;
    const count = await Model.countDocuments({
      createdAt: {
        $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
      }
    });
    
    this.paymentNumber = `PAY${year}${month}${day}${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Pre-save middleware to set completedAt
paymentSchema.pre('save', function(next: any) {
  if (this.isModified('status') && this.status === 'SUCCESS' && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

// Method to mark as successful
paymentSchema.methods.markAsSuccessful = function(transactionId?: string, gatewayResponse?: any) {
  this.status = 'SUCCESS';
  this.completedAt = new Date();
  
  if (transactionId) {
    this.transactionId = transactionId;
  }
  
  if (gatewayResponse) {
    this.gatewayResponse = gatewayResponse;
  }
  
  return this.save();
};

// Method to mark as failed
paymentSchema.methods.markAsFailed = function(reason: string, gatewayResponse?: any) {
  this.status = 'FAILED';
  this.failureReason = reason;
  
  if (gatewayResponse) {
    this.gatewayResponse = gatewayResponse;
  }
  
  return this.save();
};

// Method to process refund
paymentSchema.methods.processRefund = function(refundAmount: number, reason: string) {
  if (this.status !== 'SUCCESS') {
    throw new Error('Can only refund successful payments');
  }
  
  if (refundAmount > this.amount) {
    throw new Error('Refund amount cannot exceed payment amount');
  }
  
  this.status = 'REFUNDED';
  this.refundAmount = refundAmount;
  this.refundReason = reason;
  this.refundedAt = new Date();
  
  return this.save();
};

// Method to check if payment can be refunded
paymentSchema.methods.canBeRefunded = function(): boolean {
  return this.status === 'SUCCESS' && !this.refundedAt;
};

// Static method to find by order
paymentSchema.statics.findByOrder = function(orderId: string) {
  return this.findOne({ order: orderId })
    .populate('customer', 'displayName email')
    .populate('order', 'orderNumber totalAmount');
};

// Static method to find by customer
paymentSchema.statics.findByCustomer = function(customerId: string, status?: string) {
  const filter: any = { customer: customerId };
  
  if (status) {
    filter.status = status;
  }
  
  return this.find(filter)
    .populate('order', 'orderNumber totalAmount createdAt')
    .sort('-createdAt');
};

// Static method to find by status
paymentSchema.statics.findByStatus = function(status: string) {
  return this.find({ status })
    .populate('customer', 'displayName email')
    .populate('order', 'orderNumber totalAmount')
    .sort('-createdAt');
};

// Static method to get payment statistics
paymentSchema.statics.getPaymentStats = function(startDate?: Date, endDate?: Date) {
  const matchStage: any = {};
  
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = startDate;
    if (endDate) matchStage.createdAt.$lte = endDate;
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        averageAmount: { $avg: '$amount' }
      }
    }
  ]);
};

// Static method to create payment with idempotency
paymentSchema.statics.createWithIdempotency = async function(paymentData: any, idempotencyKey: string) {
  // Check if payment with this idempotency key already exists
  const existingPayment = await this.findOne({ idempotencyKey });
  if (existingPayment) {
    return existingPayment;
  }
  
  // Create new payment with idempotency key
  paymentData.idempotencyKey = idempotencyKey;
  const payment = new this(paymentData);
  return await payment.save();
};

export const Payment = mongoose.model('Payment', paymentSchema);
