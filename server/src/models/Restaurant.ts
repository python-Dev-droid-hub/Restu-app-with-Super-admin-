import mongoose, { Schema } from 'mongoose';

// This file is deprecated. Use Branch.ts instead.
// Keeping this file for backward compatibility during migration.

// Re-export new Branch model for backward compatibility
export { Branch as Restaurant } from './Branch';

// Legacy schemas - will be removed after migration
const addressSchema = new Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number },
  },
}, { _id: false });

const operatingHoursSchema = new Schema({
  monday: { type: Schema.Types.Mixed, default: null },
  tuesday: { type: Schema.Types.Mixed, default: null },
  wednesday: { type: Schema.Types.Mixed, default: null },
  thursday: { type: Schema.Types.Mixed, default: null },
  friday: { type: Schema.Types.Mixed, default: null },
  saturday: { type: Schema.Types.Mixed, default: null },
  sunday: { type: Schema.Types.Mixed, default: null },
}, { _id: false });

const restaurantSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Restaurant name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Restaurant owner is required'],
  },
  address: {
    type: addressSchema,
    required: [true, 'Address is required'],
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
  },
  website: {
    type: String,
    match: [/^https?:\/\/.+/, 'Please enter a valid website URL'],
  },
  cuisine: {
    type: [String],
    required: [true, 'Cuisine type is required'],
    enum: ['Italian', 'Chinese', 'Indian', 'Mexican', 'American', 'Japanese', 'Thai', 'French', 'Mediterranean', 'Other'],
  },
  priceRange: {
    type: String,
    required: [true, 'Price range is required'],
    enum: ['$', '$$', '$$$', '$$$$'],
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  reviewCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  deliveryTime: {
    type: Number,
    required: [true, 'Delivery time is required'],
    min: 10,
    max: 120,
  },
  deliveryFee: {
    type: Number,
    required: [true, 'Delivery fee is required'],
    min: 0,
  },
  minOrderAmount: {
    type: Number,
    required: [true, 'Minimum order amount is required'],
    min: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  operatingHours: {
    type: operatingHoursSchema,
    default: () => ({}),
  },
  images: {
    type: [String],
    default: [],
  },
}, {
  timestamps: true,
});

// Indexes for better performance
restaurantSchema.index({ owner: 1 });
restaurantSchema.index({ 'address.city': 1 });
restaurantSchema.index({ cuisine: 1 });
restaurantSchema.index({ priceRange: 1 });
restaurantSchema.index({ rating: -1 });
restaurantSchema.index({ isActive: 1 });
restaurantSchema.index({ name: 'text', description: 'text' });

// Geospatial index for location-based queries
restaurantSchema.index({ 'address.coordinates': '2dsphere' });

// Update rating when new review is added
restaurantSchema.methods.updateRating = function(newRating: number): void {
  const totalRating = this.rating * this.reviewCount + newRating;
  this.reviewCount += 1;
  this.rating = totalRating / this.reviewCount;
};

// Check if restaurant is open at a specific time
restaurantSchema.methods.isOpen = function(date: Date = new Date()): boolean {
  const day = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase().slice(0, 3);
  const currentTime = date.toTimeString().slice(0, 5);
  
  const hours = (this as any).operatingHours[day];
  if (!hours || !hours.open || !hours.close) {
    return false;
  }
  
  return currentTime >= hours.open && currentTime <= hours.close;
};

// Legacy export - use new Branch model instead
export const LegacyRestaurant = mongoose.model('LegacyRestaurant', restaurantSchema);
