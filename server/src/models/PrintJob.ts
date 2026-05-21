import mongoose, { Schema } from 'mongoose';

const printJobSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    printer: { type: Schema.Types.ObjectId, ref: 'Printer', required: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['PENDING', 'RETRYING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
    },
    attempts: { type: Number, default: 0 },
    lastError: { type: String },
    contentPreview: { type: String },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

export const PrintJob = mongoose.model('PrintJob', printJobSchema);
