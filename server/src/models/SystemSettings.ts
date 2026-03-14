import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemSettings extends Document {
  restaurantName: string;
  restaurantDescription?: string;
  appName?: string;
  appVersion?: string;
  contactEmail: string;
  contactPhone: string;
  defaultCurrency?: string;
  currency?: string;
  defaultLanguage?: string;
  language?: string;
  taxRate?: number;
  serviceCharge?: number;
  maintenanceMode?: boolean;
  allowRegistration?: boolean;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  operatingHours: {
    monday: { open: string; close: string; closed: boolean };
    tuesday: { open: string; close: string; closed: boolean };
    wednesday: { open: string; close: string; closed: boolean };
    thursday: { open: string; close: string; closed: boolean };
    friday: { open: string; close: string; closed: boolean };
    saturday: { open: string; close: string; closed: boolean };
    sunday: { open: string; close: string; closed: boolean };
  };
  deliverySettings: {
    deliveryRadius: number;
    deliveryFee: number;
    minimumOrder: number;
    estimatedDeliveryTime: number;
  };
  paymentSettings: {
    stripePublicKey?: string;
    stripeSecretKey?: string;
    paypalClientId?: string;
    paypalClientSecret?: string;
    cashOnDelivery: boolean;
    cardPayment: boolean;
  };
  notifications: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
  };
  socialMedia: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingsSchema: Schema = new Schema({
  restaurantName: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100
  },
  restaurantDescription: {
    type: String,
    trim: true,
    maxLength: 500
  },
  appName: {
    type: String,
    trim: true,
    default: 'Restaurant App'
  },
  appVersion: {
    type: String,
    trim: true,
    default: '1.0.0'
  },
  contactEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  contactPhone: {
    type: String,
    required: true,
    trim: true
  },
  defaultCurrency: {
    type: String,
    default: 'USD',
    trim: true
  },
  currency: {
    type: String,
    trim: true
  },
  defaultLanguage: {
    type: String,
    default: 'en',
    trim: true
  },
  language: {
    type: String,
    trim: true
  },
  taxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  serviceCharge: {
    type: Number,
    default: 0,
    min: 0
  },
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  allowRegistration: {
    type: Boolean,
    default: true
  },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true, default: 'USA' }
  },
  operatingHours: {
    monday: {
      open: { type: String, default: '09:00' },
      close: { type: String, default: '22:00' },
      closed: { type: Boolean, default: false }
    },
    tuesday: {
      open: { type: String, default: '09:00' },
      close: { type: String, default: '22:00' },
      closed: { type: Boolean, default: false }
    },
    wednesday: {
      open: { type: String, default: '09:00' },
      close: { type: String, default: '22:00' },
      closed: { type: Boolean, default: false }
    },
    thursday: {
      open: { type: String, default: '09:00' },
      close: { type: String, default: '22:00' },
      closed: { type: Boolean, default: false }
    },
    friday: {
      open: { type: String, default: '09:00' },
      close: { type: String, default: '22:00' },
      closed: { type: Boolean, default: false }
    },
    saturday: {
      open: { type: String, default: '09:00' },
      close: { type: String, default: '22:00' },
      closed: { type: Boolean, default: false }
    },
    sunday: {
      open: { type: String, default: '09:00' },
      close: { type: String, default: '22:00' },
      closed: { type: Boolean, default: false }
    }
  },
  deliverySettings: {
    deliveryRadius: { type: Number, default: 10, min: 1, max: 50 },
    deliveryFee: { type: Number, default: 2.99, min: 0 },
    minimumOrder: { type: Number, default: 15.00, min: 0 },
    estimatedDeliveryTime: { type: Number, default: 30, min: 5, max: 120 }
  },
  paymentSettings: {
    stripePublicKey: { type: String, trim: true },
    stripeSecretKey: { type: String, trim: true },
    paypalClientId: { type: String, trim: true },
    paypalClientSecret: { type: String, trim: true },
    cashOnDelivery: { type: Boolean, default: true },
    cardPayment: { type: Boolean, default: true }
  },
  notifications: {
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    pushNotifications: { type: Boolean, default: true }
  },
  socialMedia: {
    facebook: { type: String, trim: true },
    instagram: { type: String, trim: true },
    twitter: { type: String, trim: true }
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
SystemSettingsSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await mongoose.model('SystemSettings').countDocuments();
    if (count > 0) {
      const error = new Error('Only one system settings document is allowed');
      return next(error);
    }
  }
  next();
});

export const SystemSettings = mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema);
