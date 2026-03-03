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
  defaultLanguage: Joi.string().optional(),
  taxRate: Joi.number().min(0).max(100).optional(),
  
  // System Settings
  maintenanceMode: Joi.boolean().optional(),
  allowRegistration: Joi.boolean().optional(),
  
  // Legacy/Alternative field names
  restaurantName: Joi.string().min(1).max(100).optional(),
  restaurantDescription: Joi.string().max(500).optional(),
  contactEmail: Joi.string().email().optional(),
  contactPhone: Joi.string().optional(),
  address: Joi.object({
    street: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    zipCode: Joi.string().optional(),
    country: Joi.string().optional(),
  }).optional(),
  operatingHours: Joi.object().optional(),
  businessHours: Joi.object().optional(),
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
    facebook: Joi.string().uri().optional(),
    instagram: Joi.string().uri().optional(),
    twitter: Joi.string().uri().optional(),
  }).optional(),
});

// Allow all authenticated staff to read settings
router.get('/', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'WAITER', 'CHEF', 'SUPER_ADMIN'), settingsController.getSettings);
router.put('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validate(updateSettingsSchema), settingsController.updateSettings);
router.post('/reset', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), settingsController.resetSettings);

export default router;
