import mongoose, { Document, Schema } from 'mongoose';

export interface IFavorite extends Document {
  customer: mongoose.Types.ObjectId;
  branch: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FavoriteSchema: Schema = new Schema({
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  branch: {
    type: Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  }
}, {
  timestamps: true
});

// Compound index to ensure a customer can only favorite a branch once
FavoriteSchema.index({ customer: 1, branch: 1 }, { unique: true });

export const Favorite = mongoose.model<IFavorite>('Favorite', FavoriteSchema);
