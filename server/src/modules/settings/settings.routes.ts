import { Router } from 'express';
import { SettingsController } from './settings.controller';
import { authenticate, authorize } from '@/middleware/auth';
import Joi from 'joi';
import { validate } from '@/middleware/validation';

const router = Router() as any;
const settingsController = new SettingsController();

// Validation schemas
const updateSettingsSchema = Joi.object({
  // General Settings
  appName: Joi.string().min(1).max(100).optional(),
  appVersion: Joi.string().optional(),
  defaultCurrency: Joi.string().optional(),
  currency: Joi.string().optional(),
  defaultLanguage: Joi.string().optional(),
  language: Joi.string().optional(),
  taxRate: Joi.number().min(0).max(100).optional(),
  serviceCharge: Joi.number().min(0).optional(),
  deliveryFee: Joi.number().min(0).optional(),
  minOrderAmount: Joi.number().min(0).optional(),
  
  // System Settings
  maintenanceMode: Joi.boolean().optional(),
  allowRegistration: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
  
  // Restaurant Settings
  restaurantName: Joi.string().min(1).max(100).optional(),
  restaurantDescription: Joi.string().max(500).optional(),
  contactEmail: Joi.string().email().optional(),
  email: Joi.string().email().optional(),
  contactPhone: Joi.string().optional(),
  phoneNumber: Joi.string().optional(),
  phone: Joi.string().optional(),
  address: Joi.object({
    street: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    zipCode: Joi.string().optional(),
    country: Joi.string().optional(),
  }).optional(),
  operatingHours: Joi.object().optional(),
  businessHours: Joi.object().optional(),
  workingHours: Joi.object().optional(),
  deliverySettings: Joi.object({
    deliveryRadius: Joi.number().min(1).max(50).optional(),
    deliveryFee: Joi.number().min(0).optional(),
    minimumOrder: Joi.number().min(0).optional(),
    estimatedDeliveryTime: Joi.number().min(5).max(120).optional(),
  }).optional(),
  paymentSettings: Joi.object().optional(),
  notifications: Joi.object({
    emailNotifications: Joi.boolean().optional(),
    smsNotifications: Joi.boolean().optional(),
    pushNotifications: Joi.boolean().optional(),
  }).optional(),
  socialMedia: Joi.object({
    facebook: Joi.string().allow('').optional(),
    instagram: Joi.string().allow('').optional(),
    twitter: Joi.string().allow('').optional(),
  }).optional(),
});

// Allow unknown fields from the client; strip read-only keys
const flexibleUpdateSettingsSchema = updateSettingsSchema.keys({}).unknown(true);

// Public settings for customers (no auth required)
router.get('/public', settingsController.getPublicSettings);

// Allow all authenticated users to read settings
router.get('/', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'WAITER', 'CHEF', 'SUPER_ADMIN', 'RIDER', 'CUSTOMER'), settingsController.getSettings);
router.put('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validate(flexibleUpdateSettingsSchema), settingsController.updateSettings);
router.post('/reset', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), settingsController.resetSettings);

export default router;
