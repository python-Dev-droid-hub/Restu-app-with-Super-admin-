import mongoose, { Document, Schema } from 'mongoose';

export interface IFavorite extends Document {
  customer: mongoose.Types.ObjectId;
  type: 'BRANCH' | 'PRODUCT';
  branch?: mongoose.Types.ObjectId;
  product?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FavoriteSchema: Schema = new Schema({
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['BRANCH', 'PRODUCT'],
    default: 'BRANCH',
    index: true,
  },
  branch: {
    type: Schema.Types.ObjectId,
    ref: 'Branch',
    required: function (this: any) {
      return this.type === 'BRANCH';
    },
  },
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: function (this: any) {
      return this.type === 'PRODUCT';
    },
  },
}, {
  timestamps: true
});

// Compound indexes to ensure a customer can only favorite an entity once
// Use partialFilterExpression to only apply unique constraint when the field exists
FavoriteSchema.index(
  { customer: 1, type: 1, branch: 1 },
  { 
    unique: true, 
    partialFilterExpression: { type: 'BRANCH', branch: { $exists: true, $ne: null } }
  }
);
FavoriteSchema.index(
  { customer: 1, type: 1, product: 1 },
  { 
    unique: true, 
    partialFilterExpression: { type: 'PRODUCT', product: { $exists: true, $ne: null } }
  }
);

export const Favorite = mongoose.model<IFavorite>('Favorite', FavoriteSchema);
