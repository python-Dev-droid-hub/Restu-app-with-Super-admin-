import mongoose, { Schema } from 'mongoose';

const orderItemCustomizationSchema = new Schema({
  optionName: {
    type: String,
    trim: true,
    maxlength: [100, 'Option name cannot exceed 100 characters']
  },
  optionValue: {
    type: String,
    trim: true,
    maxlength: [100, 'Option value cannot exceed 100 characters']
  },
  extraPrice: {
    type: Number,
    default: 0,
    min: [0, 'Extra price cannot be negative']
  }
}, { _id: false });

const orderItemSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required'],
  },
  productSize: {
    type: Schema.Types.ObjectId,
    ref: 'ProductSize',
  },
  size: {
    type: Schema.Types.ObjectId,
    ref: 'Size',
  },
  productName: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [255, 'Product name cannot exceed 255 characters']
  },
  sizeName: {
    type: String,
    trim: true,
    maxlength: [50, 'Size name cannot exceed 50 characters']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative'],
  },
  totalPrice: {
    type: Number,
    required: [true, 'Total price is required'],
    min: [0, 'Total price cannot be negative'],
  },
  hasDeal: {
    type: Boolean,
    default: false
  },
  customizations: {
    type: [orderItemCustomizationSchema],
    default: []
  },
  specialInstructions: {
    type: String,
    trim: true,
    maxlength: [500, 'Special instructions cannot exceed 500 characters'],
  },
  // Item-level status for tracking individual item preparation
  status: {
    type: String,
    enum: ['PENDING', 'PREPARING', 'READY', 'SERVED'],
    default: 'PENDING',
  },
  // Timestamps for item preparation tracking
  preparingAt: {
    type: Date,
  },
  readyAt: {
    type: Date,
  },
  servedAt: {
    type: Date,
  },
});

const deliveryLocationSchema = new Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point'
  },
  coordinates: {
    type: [Number],
    required: true,
    validate: {
      validator: function(coordinates: number[]) {
        return coordinates.length === 2 &&
               coordinates[0] >= -180 && coordinates[0] <= 180 &&
               coordinates[1] >= -90 && coordinates[1] <= 90;
      },
      message: 'Coordinates must be [longitude, latitude] in valid ranges'
    }
  }
}, { _id: false });

const orderSchema = new Schema({
  orderNumber: {
    type: String,
    required: [true, 'Order number is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'Order number cannot exceed 50 characters']
  },
  branch: {
    type: Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Branch is required'],
  },
  orderType: {
    type: String,
    enum: ['DELIVERY', 'DINE_IN', 'TAKEAWAY'],
    required: [true, 'Order type is required'],
  },
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer is required'],
  },
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [100, 'Customer name cannot exceed 100 characters'],
  },
  rider: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  waiter: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  chef: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  table: {
    type: Schema.Types.ObjectId,
    ref: 'RestaurantTable',
  },
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal cannot be negative'],
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: [0, 'Discount amount cannot be negative'],
  },
  couponDiscount: {
    type: Number,
    default: 0,
    min: [0, 'Coupon discount cannot be negative'],
  },
  dealDiscount: {
    type: Number,
    default: 0,
    min: [0, 'Deal discount cannot be negative'],
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: [0, 'Tax amount cannot be negative'],
  },
  deliveryFee: {
    type: Number,
    default: 0,
    min: [0, 'Delivery fee cannot be negative'],
  },
  serviceCharge: {
    type: Number,
    default: 0,
    min: [0, 'Service charge cannot be negative'],
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative'],
  },
  coupon: {
    type: Schema.Types.ObjectId,
    ref: 'Coupon',
  },
  deal: {
    type: Schema.Types.ObjectId,
    ref: 'Deal',
  },
  status: {
    type: String,
    enum: [
      'PENDING', 'KITCHEN_ACCEPTED', 'PREPARING', 'READY', 
      'RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 
      'SERVED', 'COMPLETED', 'CANCELLED'
    ],
    default: 'PENDING',
  },
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUNDED'],
    default: 'PENDING',
  },
  paymentMethod: {
    type: String,
    trim: true,
    maxlength: [50, 'Payment method cannot exceed 50 characters'],
  },
  phoneNumber: {
    type: String,
    trim: true,
    maxlength: [30, 'Phone number cannot exceed 30 characters'],
  },
  alternatePhoneNumber: {
    type: String,
    trim: true,
    maxlength: [30, 'Alternate phone number cannot exceed 30 characters'],
  },
  addressLine: {
    type: String,
    trim: true,
    maxlength: [500, 'Address line cannot exceed 500 characters'],
  },
  deliveryLocation: {
    type: deliveryLocationSchema,
    index: '2dsphere'
  },
  specialInstructions: {
    type: String,
    trim: true,
    maxlength: [1000, 'Special instructions cannot exceed 1000 characters'],
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
  },
  cancellationReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Cancellation reason cannot exceed 500 characters'],
  },
  kitchenAcceptedAt: {
    type: Date,
  },
  readyAt: {
    type: Date,
  },
  pickedUpAt: {
    type: Date,
  },
  deliveredAt: {
    type: Date,
  },
  servedAt: {
    type: Date,
  },
  completedAt: {
    type: Date,
  },
  cancelledAt: {
    type: Date,
  },
  invoiceNumber: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
  },
  foodRating: {
    type: Number,
    min: 1,
    max: 5,
  },
  serviceRating: {
    type: Number,
    min: 1,
    max: 5,
  },
  deliveryRating: {
    type: Number,
    min: 1,
    max: 5,
  },
  items: {
    type: [orderItemSchema],
    required: [true, 'Order items are required'],
    validate: {
      validator: function(items: any[]) {
        return items.length > 0;
      },
      message: 'Order must contain at least one item',
    },
  },
  deletedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Indexes for better performance
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ branch: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ rider: 1, createdAt: -1 });
orderSchema.index({ waiter: 1 });
orderSchema.index({ chef: 1 });
orderSchema.index({ table: 1 });
orderSchema.index({ deliveryLocation: '2dsphere' });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ coupon: 1 });
orderSchema.index({ deal: 1 });
orderSchema.index({ invoiceNumber: 1 });

// Pre-find middleware to exclude deleted records
orderSchema.pre('find', function(next: any) {
  this.where({ deletedAt: null });
  next();
});

// Pre-save middleware to calculate totals
orderSchema.pre('save', function(next: any) {
  if (this.isModified('subtotal') || this.isModified('discountAmount') || 
      this.isModified('taxAmount') || this.isModified('deliveryFee') || 
      this.isModified('serviceCharge')) {
    this.totalAmount = this.subtotal - this.discountAmount + this.taxAmount + 
                      this.deliveryFee + this.serviceCharge;
  }
  
  // Calculate discount amount from coupon and deal discounts
  if (this.isModified('couponDiscount') || this.isModified('dealDiscount')) {
    this.discountAmount = this.couponDiscount + this.dealDiscount;
  }
  
  next();
});

// Pre-save middleware to set order number
orderSchema.pre('save', async function(next: any) {
  if (this.isNew && !this.orderNumber) {
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
    
    this.orderNumber = `ORD${year}${month}${day}${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Post-save middleware to auto-notify waiter when order is READY
orderSchema.post('save', async function(doc: any, next: any) {
  // Only trigger if status was modified to READY
  if (doc.status === 'READY' && doc.isModified?.('status')) {
    try {
      // Only for DINE_IN orders with a waiter assigned
      if (doc.orderType === 'DINE_IN' && doc.waiter) {
        const Notification = mongoose.model('Notification');
        
        // Get table number if table is populated
        let tableNumber = '-';
        if (doc.table) {
          const RestaurantTable = mongoose.model('RestaurantTable');
          const table = await RestaurantTable.findById(doc.table).select('tableNumber');
          tableNumber = table?.tableNumber || '-';
        }

        await Notification.create({
          recipient: doc.waiter,
          type: 'KITCHEN_READY',
          title: 'Order Ready!',
          body: `Order ${doc.orderNumber} for Table ${tableNumber} is ready to serve.`,
          relatedOrder: doc._id,
          priority: 'HIGH',
          data: {
            tableNumber,
            orderNumber: doc.orderNumber,
            action: 'PICKUP_ORDER'
          },
          isRead: false,
        });
        
        console.log(`[Order] Auto-notification sent to waiter for order ${doc.orderNumber}`);
      }
    } catch (error) {
      console.error('[Order] Failed to send auto-notification:', error);
      // Don't fail the save operation if notification fails
    }
  }
  next();
});

// Method to update order status with validation
orderSchema.methods.updateStatus = function(newStatus: string) {
  const validTransitions: Record<string, string[]> = {
    'PENDING': ['KITCHEN_ACCEPTED', 'CANCELLED'],
    'KITCHEN_ACCEPTED': ['PREPARING', 'CANCELLED'],
    'PREPARING': ['READY'],
    'READY': ['PICKED_UP', 'RIDER_ASSIGNED'], // Allow direct PICKED_UP for dine-in or RIDER_ASSIGNED for delivery
    'RIDER_ASSIGNED': ['PICKED_UP'],
    'PICKED_UP': ['OUT_FOR_DELIVERY', 'SERVED', 'COMPLETED'], // Allow COMPLETED for dine-in with payment
    'OUT_FOR_DELIVERY': ['DELIVERED'],
    'DELIVERED': ['COMPLETED'],
    'SERVED': ['COMPLETED'], // Dine-in orders go SERVED -> COMPLETED
    'COMPLETED': [],
    'CANCELLED': []
  };
  
  if (!validTransitions[this.status]?.includes(newStatus)) {
    throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
  }
  
  this.status = newStatus;
  
  // Set timestamps based on status
  const now = new Date();
  switch (newStatus) {
    case 'KITCHEN_ACCEPTED':
      this.kitchenAcceptedAt = now;
      break;
    case 'READY':
      this.readyAt = now;
      break;
    case 'PICKED_UP':
      this.pickedUpAt = now;
      break;
    case 'DELIVERED':
      this.deliveredAt = now;
      break;
    case 'SERVED':
      this.servedAt = now;
      break;
    case 'COMPLETED':
      this.completedAt = now;
      break;
    case 'CANCELLED':
      this.cancelledAt = now;
      break;
  }
  
  return this.save();
};

// Method to check if order can be cancelled
orderSchema.methods.canBeCancelled = function(): boolean {
  return ['PENDING', 'KITCHEN_ACCEPTED'].includes(this.status);
};

// Method to soft delete
orderSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  return this.save();
};

// Method to restore
orderSchema.methods.restore = function() {
  this.deletedAt = null;
  return this.save();
};

// Static method to find orders by branch
orderSchema.statics.findByBranch = function(branchId: string, status?: string) {
  const filter: any = { branch: branchId };
  
  if (status) {
    filter.status = status;
  }
  
  return this.find(filter)
    .populate('customer', 'displayName email phoneNumber')
    .populate('rider', 'displayName phoneNumber')
    .populate('waiter', 'displayName')
    .populate('chef', 'displayName')
    .populate('table', 'tableNumber')
    .sort('-createdAt');
};

// Static method to find orders by customer
orderSchema.statics.findByCustomer = function(customerId: string, status?: string) {
  const filter: any = { customer: customerId };
  
  if (status) {
    filter.status = status;
  }
  
  return this.find(filter)
    .populate('branch', 'branchName branchCode')
    .populate('items.product', 'name imageUrl')
    .sort('-createdAt');
};

export const Order = mongoose.model('Order', orderSchema);
