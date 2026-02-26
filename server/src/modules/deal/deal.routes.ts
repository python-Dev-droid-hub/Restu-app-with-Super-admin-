import { Router } from 'express';
import { DealController } from './deal.controller';
import { authenticate, authorize } from '@/middleware/auth';
import { validate } from '@/middleware/validation';
import Joi from 'joi';

const router = Router() as any;
const dealController = new DealController();

// Validation schemas
const createDealSchema = Joi.object({
  branch: Joi.string().optional().allow(null),
  title: Joi.string().min(2).max(255).required(),
  description: Joi.string().max(2000).optional(),
  discountType: Joi.string().valid('PERCENTAGE', 'FIXED_AMOUNT').required(),
  discountValue: Joi.number().min(0).required(),
  maxDiscountAmount: Joi.number().min(0).optional(),
  minOrderAmount: Joi.number().min(0).default(0),
  startDate: Joi.date().required(),
  expiryDate: Joi.date().required(),
  imageUrl: Joi.string().max(500).optional(),
  isActive: Joi.boolean().default(true),
  excludeCoupons: Joi.boolean().default(true),
  products: Joi.array().items(Joi.string()).default([]),
});

const updateDealSchema = Joi.object({
  branch: Joi.string().optional().allow(null),
  title: Joi.string().min(2).max(255).optional(),
  description: Joi.string().max(2000).optional(),
  discountType: Joi.string().valid('PERCENTAGE', 'FIXED_AMOUNT').optional(),
  discountValue: Joi.number().min(0).optional(),
  maxDiscountAmount: Joi.number().min(0).optional().allow(null),
  minOrderAmount: Joi.number().min(0).optional(),
  startDate: Joi.date().optional(),
  expiryDate: Joi.date().optional(),
  imageUrl: Joi.string().max(500).optional().allow(null),
  isActive: Joi.boolean().optional(),
  excludeCoupons: Joi.boolean().optional(),
  products: Joi.array().items(Joi.string()).optional(),
});

// Public routes
router.get('/', dealController.getAllDeals);
router.get('/active', dealController.getActiveDeals);
router.get('/:id', dealController.getDealById);

// Admin routes
router.post('/', authenticate, authorize('ADMIN'), validate(createDealSchema), dealController.createDeal);
router.put('/:id', authenticate, authorize('ADMIN'), validate(updateDealSchema), dealController.updateDeal);
router.delete('/:id', authenticate, authorize('ADMIN'), dealController.deleteDeal);
router.patch('/:id/restore', authenticate, authorize('ADMIN'), dealController.restoreDeal);

export default router;
