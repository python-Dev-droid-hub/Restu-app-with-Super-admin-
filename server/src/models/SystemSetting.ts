import mongoose, { Schema } from 'mongoose';

const systemSettingSchema = new Schema({
  key: {
    type: String,
    required: [true, 'Setting key is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'Key cannot exceed 100 characters'],
    match: [/^[A-Z_]+$/, 'Key must be uppercase with underscores only']
  },
  value: {
    type: Schema.Types.Mixed,
    required: [true, 'Setting value is required']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  isEditable: {
    type: Boolean,
    default: true
  },
  category: {
    type: String,
    enum: ['GENERAL', 'PAYMENT', 'ORDER', 'NOTIFICATION', 'DELIVERY', 'BUSINESS'],
    default: 'GENERAL'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for querying by category
systemSettingSchema.index({ category: 1 });

// Static method to get setting value by key
systemSettingSchema.statics.getSetting = async function(key: string, defaultValue?: any) {
  const setting = await this.findOne({ key });
  return setting ? setting.value : defaultValue;
};

// Static method to update setting
systemSettingSchema.statics.setSetting = async function(key: string, value: any, updatedBy?: string) {
  return this.findOneAndUpdate(
    { key },
    { value, updatedBy },
    { upsert: true, new: true }
  );
};

export const SystemSetting = mongoose.model('SystemSetting', systemSettingSchema);
