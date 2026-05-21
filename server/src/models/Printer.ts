import mongoose, { Schema } from 'mongoose';

const printerSchema = new Schema(
  {
    branch: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    host: { type: String, required: true, trim: true },
    port: { type: Number, default: 9100 },
    printerType: {
      type: String,
      enum: ['NETWORK', 'USB'],
      default: 'NETWORK',
    },
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

printerSchema.index({ branch: 1, isActive: 1 });

export const Printer = mongoose.model('Printer', printerSchema);
