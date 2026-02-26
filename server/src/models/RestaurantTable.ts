import mongoose, { Schema } from 'mongoose';

const restaurantTableSchema = new Schema({
  branch: {
    type: Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Branch is required']
  },
  tableNumber: {
    type: String,
    required: [true, 'Table number is required'],
    trim: true,
    maxlength: [20, 'Table number cannot exceed 20 characters']
  },
  seatingCapacity: {
    type: Number,
    required: [true, 'Seating capacity is required'],
    min: [1, 'Seating capacity must be at least 1'],
    max: [20, 'Seating capacity cannot exceed 20']
  },
  section: {
    type: String,
    trim: true,
    maxlength: [50, 'Section cannot exceed 50 characters']
  },
  floorNumber: {
    type: Number,
    default: 1,
    min: [1, 'Floor number must be at least 1'],
    max: [10, 'Floor number cannot exceed 10']
  },
  qrCodeUrl: {
    type: String,
    trim: true,
    maxlength: [500, 'QR code URL cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'OUT_OF_SERVICE'],
    default: 'AVAILABLE'
  },
  currentWaiter: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound index for unique table number per branch
restaurantTableSchema.index({ branch: 1, tableNumber: 1 }, { unique: true });

// Indexes for better performance
restaurantTableSchema.index({ branch: 1 });
restaurantTableSchema.index({ status: 1 });
restaurantTableSchema.index({ currentWaiter: 1 });
restaurantTableSchema.index({ section: 1, floorNumber: 1 });

// Pre-find middleware to exclude deleted records
restaurantTableSchema.pre(/^find/, function(this: any, next: any) {
  if (!this.getQuery().deletedAt) {
    this.where({ deletedAt: null });
  }
  next();
});

// Method to change table status
restaurantTableSchema.methods.changeStatus = function(newStatus: string, waiterId?: string) {
  const validTransitions: Record<string, string[]> = {
    'AVAILABLE': ['OCCUPIED', 'RESERVED', 'CLEANING', 'OUT_OF_SERVICE'],
    'OCCUPIED': ['AVAILABLE', 'CLEANING'],
    'RESERVED': ['AVAILABLE', 'OCCUPIED'],
    'CLEANING': ['AVAILABLE'],
    'OUT_OF_SERVICE': ['AVAILABLE', 'CLEANING']
  };
  
  if (!validTransitions[this.status]?.includes(newStatus)) {
    throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
  }
  
  this.status = newStatus;
  
  if (newStatus === 'OCCUPIED' && waiterId) {
    this.currentWaiter = waiterId;
  } else if (newStatus === 'AVAILABLE') {
    this.currentWaiter = null;
  }
  
  return this.save();
};

// Method to check if table is available
restaurantTableSchema.methods.isAvailable = function() {
  return this.status === 'AVAILABLE';
};

// Method to assign waiter
restaurantTableSchema.methods.assignWaiter = function(waiterId: string) {
  this.currentWaiter = waiterId;
  return this.save();
};

// Method to release table
restaurantTableSchema.methods.releaseTable = function() {
  this.status = 'AVAILABLE';
  this.currentWaiter = null;
  return this.save();
};

// Method to soft delete
restaurantTableSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  this.status = 'OUT_OF_SERVICE';
  return this.save();
};

// Method to restore
restaurantTableSchema.methods.restore = function() {
  this.deletedAt = null;
  this.status = 'AVAILABLE';
  return this.save();
};

// Static method to find tables by branch
restaurantTableSchema.statics.findByBranch = function(branchId: string, status?: string) {
  const filter: any = { branch: branchId };
  
  if (status) {
    filter.status = status;
  }
  
  return this.find(filter)
    .populate('currentWaiter', 'name email')
    .sort({ floorNumber: 1, section: 1, tableNumber: 1 });
};

// Static method to find available tables
restaurantTableSchema.statics.findAvailable = function(branchId: string, capacity?: number) {
  const filter: any = { 
    branch: branchId, 
    status: 'AVAILABLE' 
  };
  
  if (capacity) {
    filter.seatingCapacity = { $gte: capacity };
  }
  
  return this.find(filter)
    .sort({ floorNumber: 1, section: 1, tableNumber: 1 });
};

// Static method to find tables by waiter
restaurantTableSchema.statics.findByWaiter = function(waiterId: string) {
  return this.find({ 
    currentWaiter: waiterId,
    status: { $in: ['OCCUPIED', 'RESERVED'] }
  })
    .populate('branch', 'branchName branchCode')
    .sort({ floorNumber: 1, section: 1, tableNumber: 1 });
};

// Static method to get table statistics
restaurantTableSchema.statics.getTableStats = function(branchId: string) {
  return this.aggregate([
    { $match: { branch: new mongoose.Types.ObjectId(branchId), deletedAt: null } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalCapacity: { $sum: '$seatingCapacity' }
      }
    }
  ]);
};

export const RestaurantTable = mongoose.model('RestaurantTable', restaurantTableSchema);
