import mongoose, { Schema } from 'mongoose';

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

const customerAddressSchema = new Schema({
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer is required']
  },
  label: {
    type: String,
    trim: true,
    maxlength: [50, 'Label cannot exceed 50 characters'],
    enum: ['Home', 'Work', 'Other'],
    default: 'Home'
  },
  addressLine: {
    type: String,
    required: [true, 'Address line is required'],
    trim: true,
    maxlength: [500, 'Address line cannot exceed 500 characters']
  },
  city: {
    type: String,
    trim: true,
    maxlength: [100, 'City cannot exceed 100 characters']
  },
  postalCode: {
    type: String,
    trim: true,
    maxlength: [20, 'Postal code cannot exceed 20 characters']
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
  isDefault: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better performance
customerAddressSchema.index({ customer: 1 });
customerAddressSchema.index({ location: '2dsphere' });
customerAddressSchema.index({ customer: 1, isDefault: 1 });

// Pre-find middleware to exclude deleted records
customerAddressSchema.pre(/^find/, function(this: any, next: any) {
  if (!this.getQuery().deletedAt) {
    this.where({ deletedAt: null });
  }
  next();
});

// Pre-save middleware to set location from lat/lng
customerAddressSchema.pre('save', async function(next: any) {
  if (this.isModified('lat') || this.isModified('lng')) {
    if (this.lat !== undefined && this.lng !== undefined) {
      this.location = {
        type: 'Point',
        coordinates: [this.lng!, this.lat!]
      };
    }
  }
  
  // Ensure only one default address per customer
  if (this.isDefault && this.isNew) {
    try {
      const Model = this.constructor as any;
      await Model.updateMany(
        { 
          customer: this.customer, 
          _id: { $ne: this._id },
          deletedAt: null 
        },
        { isDefault: false }
      );
    } catch (error) {
      return next(error as Error);
    }
  }
  
  next();
});

// Method to set as default
customerAddressSchema.methods.setAsDefault = async function() {
  try {
    // Remove default from other addresses
    const Model = this.constructor as any;
    await Model.updateMany(
      { 
        customer: this.customer, 
        _id: { $ne: this._id },
        deletedAt: null 
      },
      { isDefault: false }
    );
    
    // Set this as default
    this.isDefault = true;
    return await this.save();
  } catch (error) {
    throw error;
  }
};

// Method to soft delete
customerAddressSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  if (this.isDefault) {
    this.isDefault = false;
  }
  return this.save();
};

// Method to restore
customerAddressSchema.methods.restore = function() {
  this.deletedAt = null;
  return this.save();
};

// Static method to find addresses by customer
customerAddressSchema.statics.findByCustomer = function(customerId: string) {
  return this.find({ 
    customer: customerId,
    deletedAt: null 
  }).sort({ isDefault: -1, createdAt: -1 });
};

// Static method to find default address
customerAddressSchema.statics.findDefaultByCustomer = function(customerId: string) {
  return this.findOne({ 
    customer: customerId,
    isDefault: true,
    deletedAt: null 
  });
};

// Static method to create address with validation
customerAddressSchema.statics.createAddress = async function(addressData: any) {
  const address = new this(addressData);
  
  // If this is the first address, make it default
  const existingAddressesCount = await this.countDocuments({
    customer: addressData.customer,
    deletedAt: null
  });
  
  if (existingAddressesCount === 0) {
    address.isDefault = true;
  }
  
  return await address.save();
};

// Static method to find addresses within radius
customerAddressSchema.statics.findWithinRadius = function(lat: number, lng: number, radiusInMeters: number) {
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
    deletedAt: null
  }).populate('customer', 'name email');
};

export const CustomerAddress = mongoose.model('CustomerAddress', customerAddressSchema);
