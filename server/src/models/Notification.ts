import mongoose, { Schema } from 'mongoose';

const notificationSchema = new Schema({
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient is required']
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [255, 'Title cannot exceed 255 characters']
  },
  body: {
    type: String,
    required: [true, 'Body is required'],
    trim: true,
    maxlength: [2000, 'Body cannot exceed 2000 characters']
  },
  type: {
    type: String,
    trim: true,
    maxlength: [50, 'Type cannot exceed 50 characters'],
    enum: [
      'ORDER_UPDATE', 'PAYMENT', 'PROMOTION', 'SYSTEM', 
      'DELIVERY', 'RESTAURANT', 'COUPON', 'DEAL', 'GENERAL'
    ],
    default: 'GENERAL'
  },
  relatedOrder: {
    type: Schema.Types.ObjectId,
    ref: 'Order'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  data: {
    type: Schema.Types.Mixed,
    default: null
  },
  priority: {
    type: String,
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    default: 'NORMAL'
  },
  scheduledFor: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date
  },
  sentVia: {
    type: [String],
    enum: ['PUSH', 'EMAIL', 'SMS', 'IN_APP'],
    default: ['IN_APP']
  },
  sentAt: {
    type: Date
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better performance
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ relatedOrder: 1 });
notificationSchema.index({ scheduledFor: 1 });
notificationSchema.index({ expiresAt: 1 });
notificationSchema.index({ priority: 1 });

// TTL index for automatic cleanup of expired notifications
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-find middleware to filter by scheduled time
notificationSchema.pre(/^find/, function(this: any, next: any) {
  if (!this.getQuery().includeScheduled) {
    this.where({ scheduledFor: { $lte: new Date() } });
  }
  next();
});

// Pre-save middleware to validate scheduled time
notificationSchema.pre('save', function(next: any) {
  if (this.scheduledFor && this.scheduledFor < new Date()) {
    this.scheduledFor = new Date();
  }
  
  // Set expiry date if not provided (default 30 days)
  if (!this.expiresAt) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    this.expiresAt = expiryDate;
  }
  
  next();
});

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to mark as sent
notificationSchema.methods.markAsSent = function(channels: string[] = ['IN_APP']) {
  this.sentVia = channels;
  this.sentAt = new Date();
  return this.save();
};

// Method to check if notification is expired
notificationSchema.methods.isExpired = function(): boolean {
  return this.expiresAt ? new Date() > this.expiresAt : false;
};

// Method to check if notification should be sent now
notificationSchema.methods.shouldSendNow = function(): boolean {
  return !this.isExpired() && 
         this.scheduledFor <= new Date() && 
         !this.sentAt;
};

// Method to get notification data for push notification
notificationSchema.methods.getPushNotificationData = function() {
  return {
    title: this.title,
    body: this.body,
    data: {
      type: this.type,
      notificationId: this._id.toString(),
      relatedOrder: this.relatedOrder?.toString(),
      ...this.data
    },
    priority: this.priority.toLowerCase(),
    sound: 'default'
  };
};

// Static method to find unread notifications
notificationSchema.statics.findUnread = function(recipientId: string, limit: number = 50) {
  return this.find({
    recipient: recipientId,
    isRead: false,
    scheduledFor: { $lte: new Date() }
  })
    .populate('relatedOrder', 'orderNumber status')
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit);
};

// Static method to find recent notifications
notificationSchema.statics.findRecent = function(recipientId: string, limit: number = 20) {
  return this.find({
    recipient: recipientId,
    scheduledFor: { $lte: new Date() }
  })
    .populate('relatedOrder', 'orderNumber status')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to create notification
notificationSchema.statics.createNotification = async function(notificationData: any) {
  const notification = new this(notificationData);
  return await notification.save();
};

// Static method to create order notification
notificationSchema.statics.createOrderNotification = async function(
  recipientId: string, 
  orderStatus: string, 
  orderId: string,
  orderNumber?: string
) {
  const statusMessages: Record<string, { title: string; body: string }> = {
    'PENDING': { title: 'Order Received', body: 'Your order has been received and is being processed.' },
    'KITCHEN_ACCEPTED': { title: 'Order Confirmed', body: 'Your order has been confirmed by the kitchen.' },
    'PREPARING': { title: 'Order Preparing', body: 'Your order is being prepared with fresh ingredients.' },
    'READY': { title: 'Order Ready', body: 'Your order is ready for pickup/delivery.' },
    'RIDER_ASSIGNED': { title: 'Rider Assigned', body: 'A rider has been assigned to deliver your order.' },
    'OUT_FOR_DELIVERY': { title: 'Out for Delivery', body: 'Your order is on the way to your location.' },
    'DELIVERED': { title: 'Order Delivered', body: 'Your order has been delivered successfully.' },
    'COMPLETED': { title: 'Order Completed', body: 'Thank you for your order! Enjoy your meal.' },
    'CANCELLED': { title: 'Order Cancelled', body: 'Your order has been cancelled.' }
  };
  
  const message = statusMessages[orderStatus] || { 
    title: 'Order Update', 
    body: `Your order status has been updated to ${orderStatus}.` 
  };
  
  return await (this as any).createNotification({
    recipient: recipientId,
    title: message.title,
    body: message.body,
    type: 'ORDER_UPDATE',
    relatedOrder: orderId,
    data: { orderStatus, orderNumber }
  });
};

// Static method to mark multiple as read
notificationSchema.statics.markMultipleAsRead = function(notificationIds: string[], recipientId: string) {
  return this.updateMany(
    { 
      _id: { $in: notificationIds },
      recipient: recipientId,
      isRead: false
    },
    { 
      isRead: true,
      readAt: new Date()
    }
  );
};

// Static method to get notification statistics
notificationSchema.statics.getNotificationStats = function(recipientId?: string) {
  const matchStage: any = {};
  if (recipientId) {
    matchStage.recipient = new mongoose.Types.ObjectId(recipientId);
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          type: '$type',
          isRead: '$isRead'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.type',
        total: { $sum: '$count' },
        read: {
          $sum: {
            $cond: [{ $eq: ['$_id.isRead', true] }, '$count', 0]
          }
        },
        unread: {
          $sum: {
            $cond: [{ $eq: ['$_id.isRead', false] }, '$count', 0]
          }
        }
      }
    }
  ]);
};

export const Notification = mongoose.model('Notification', notificationSchema);
