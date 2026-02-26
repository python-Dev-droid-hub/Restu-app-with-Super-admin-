import mongoose, { Schema } from 'mongoose';

// This file is deprecated. Use Product.ts, Category.ts, and related models instead.
// Keeping this file for backward compatibility during migration.

// Re-export new models for backward compatibility
export { Product as MenuItem } from './Product';
export { Category as MenuCategory } from './Category';

// Legacy schemas - will be removed after migration
const nutritionInfoSchema = new Schema({
  calories: { type: Number, min: 0 },
  protein: { type: Number, min: 0 },
  carbs: { type: Number, min: 0 },
  fat: { type: Number, min: 0 },
}, { _id: false });

const menuItemSchema = new Schema({
  restaurant: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: [true, 'Restaurant is required'],
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: 'MenuCategory',
    required: [true, 'Category is required'],
  },
  name: {
    type: String,
    required: [true, 'Menu item name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
  },
  images: {
    type: [String],
    default: [],
  },
  ingredients: {
    type: [String],
    default: [],
  },
  allergens: {
    type: [String],
    default: [],
    enum: ['Gluten', 'Dairy', 'Nuts', 'Soy', 'Eggs', 'Shellfish', 'Fish', 'Peanuts', 'Sesame', 'Other'],
  },
  isVegetarian: {
    type: Boolean,
    default: false,
  },
  isVegan: {
    type: Boolean,
    default: false,
  },
  isGlutenFree: {
    type: Boolean,
    default: false,
  },
  isSpicy: {
    type: Boolean,
    default: false,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  preparationTime: {
    type: Number,
    required: [true, 'Preparation time is required'],
    min: [1, 'Preparation time must be at least 1 minute'],
  },
  nutritionInfo: {
    type: nutritionInfoSchema,
    default: {},
  },
}, {
  timestamps: true,
});

const menuCategorySchema = new Schema({
  restaurant: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: [true, 'Restaurant is required'],
  },
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters'],
  },
  description: {
    type: String,
    maxlength: [200, 'Description cannot exceed 200 characters'],
  },
  displayOrder: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes for menu items
menuItemSchema.index({ restaurant: 1, category: 1 });
menuItemSchema.index({ restaurant: 1, isAvailable: 1 });
menuItemSchema.index({ restaurant: 1, name: 'text', description: 'text' });
menuItemSchema.index({ price: 1 });
menuItemSchema.index({ isVegetarian: 1 });
menuItemSchema.index({ isVegan: 1 });
menuItemSchema.index({ isGlutenFree: 1 });

// Indexes for menu categories
menuCategorySchema.index({ restaurant: 1, displayOrder: 1 });
menuCategorySchema.index({ restaurant: 1, isActive: 1 });

// Ensure unique category names per restaurant
menuCategorySchema.index({ restaurant: 1, name: 1 }, { unique: true });

// Pre-save middleware to set display order
menuCategorySchema.pre('save', async function(next: any) {
  if (this.isNew && this.displayOrder === 0) {
    const Model = this.constructor as any;
    const lastCategory = await Model
      .findOne({ restaurant: this.restaurant })
      .sort('-displayOrder');
    
    this.displayOrder = lastCategory ? lastCategory.displayOrder + 1 : 1;
  }
  next();
});

// Legacy exports - use new models instead
export const LegacyMenuItem = mongoose.model('LegacyMenuItem', menuItemSchema);
export const LegacyMenuCategory = mongoose.model('LegacyMenuCategory', menuCategorySchema);
