import mongoose, { Schema } from 'mongoose';

const operatingHoursSchema = new Schema({
  monday: { type: Schema.Types.Mixed, default: null },
  tuesday: { type: Schema.Types.Mixed, default: null },
  wednesday: { type: Schema.Types.Mixed, default: null },
  thursday: { type: Schema.Types.Mixed, default: null },
  friday: { type: Schema.Types.Mixed, default: null },
  saturday: { type: Schema.Types.Mixed, default: null },
  sunday: { type: Schema.Types.Mixed, default: null },
}, { _id: false });

const locationSchema = new Schema({
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

const branchSchema = new Schema({
  branchCode: {
    type: String,
    required: [true, 'Branch code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: [20, 'Branch code cannot exceed 20 characters'],
    match: [/^[A-Z]{2}\d{3}$/, 'Branch code must be in format like BR001']
  },
  branchName: {
    type: String,
    required: [true, 'Branch name is required'],
    trim: true,
    maxlength: [255, 'Branch name cannot exceed 255 characters']
  },
  addressLine: {
    type: String,
    required: [true, 'Address line is required'],
    trim: true,
    maxlength: [500, 'Address line cannot exceed 500 characters']
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
    maxlength: [100, 'City cannot exceed 100 characters']
  },
  state: {
    type: String,
    trim: true,
    maxlength: [100, 'State cannot exceed 100 characters']
  },
  postalCode: {
    type: String,
    trim: true,
    maxlength: [20, 'Postal code cannot exceed 20 characters']
  },
  country: {
    type: String,
    default: 'Pakistan',
    trim: true,
    maxlength: [100, 'Country cannot exceed 100 characters']
  },
  lat: {
    type: Number,
    min: -90,
    max: 90,
    validate: {
      validator: function(this: any, value: number): boolean {
        return this.lng !== undefined;
      },
      message: 'Latitude must be provided with longitude'
    }
  },
  lng: {
    type: Number,
    min: -180,
    max: 180,
    validate: {
      validator: function(this: any, value: number): boolean {
        return this.lat !== undefined;
      },
      message: 'Longitude must be provided with latitude'
    }
  },
  location: {
    type: locationSchema,
    index: '2dsphere'
  },
  deliveryRadius: {
    type: Number,
    default: 5000,
    min: [100, 'Delivery radius must be at least 100 meters'],
    max: [50000, 'Delivery radius cannot exceed 50km']
  },
  taxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  deliveryFee: {
    type: Number,
    default: 0,
    min: 0,
  },
  branchManager: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  phoneNumber: {
    type: String,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  operatingHours: {
    type: operatingHoursSchema,
    default: () => ({})
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  acceptsDelivery: {
    type: Boolean,
    default: true
  },
  acceptsDineIn: {
    type: Boolean,
    default: true
  },
  acceptsTakeaway: {
    type: Boolean,
    default: true
  },
  currency: {
    type: String,
    default: 'PKR',
    enum: ['USD', 'PKR', 'EUR', 'GBP', 'AED', 'SAR', 'INR'],
  },
  language: {
    type: String,
    default: 'en',
    enum: ['en', 'ur', 'ar'],
  },
  deletedAt: {
    type: Date,
    default: null,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
branchSchema.index({ branchCode: 1 });
branchSchema.index({ city: 1 });
branchSchema.index({ isActive: 1, deletedAt: 1 });
branchSchema.index({ branchManager: 1 });
branchSchema.index({ location: '2dsphere' });

// Pre-save middleware to set location from lat/lng
branchSchema.pre('save', function(next: any) {
  if (this.isModified('lat') || this.isModified('lng')) {
    if (this.lat !== undefined && this.lng !== undefined) {
      this.location = {
        type: 'Point',
        coordinates: [this.lng!, this.lat!]
      };
    }
  }
  next();
});

// Pre-find middleware to exclude deleted records
branchSchema.pre(/^find/, function(this: any, next: any) {
  if (!this.getQuery().deletedAt) {
    this.where({ deletedAt: null });
  }
  next();
});

// Virtual for checking if branch is currently open
branchSchema.virtual('isOpen').get(function(this: any) {
  if (!this.operatingHours) return false;
  
  const now = new Date();
  const day = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const currentTime = now.toTimeString().slice(0, 5);
  
  const hours = this.operatingHours[day as keyof typeof this.operatingHours];
  if (!hours || !hours.open || !hours.close) {
    return false;
  }
  
  return currentTime >= hours.open && currentTime <= hours.close;
});

// Method to soft delete
branchSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

// Method to restore
branchSchema.methods.restore = function() {
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

// Static method to find active branches
branchSchema.statics.findActive = function() {
  return this.find({ isActive: true, deletedAt: null });
};

// Static method to find branches within radius
branchSchema.statics.findWithinRadius = function(lat: number, lng: number, radiusInMeters: number) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        $maxDistance: radiusInMeters
      }
    },
    isActive: true,
    deletedAt: null
  });
};

export const Branch = mongoose.model('Branch', branchSchema);
