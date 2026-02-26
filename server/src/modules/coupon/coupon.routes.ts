import { Router } from 'express';
import { CouponController } from './coupon.controller';
import { authenticate, authorize } from '@/middleware/auth';
import { validate } from '@/middleware/validation';
import Joi from 'joi';

const router = Router() as any;
const couponController = new CouponController();

// Validation schemas
const createCouponSchema = Joi.object({
  branch: Joi.string().optional().allow(null),
  code: Joi.string().alphanum().uppercase().max(50).required(),
  description: Joi.string().max(1000).optional(),
  discountType: Joi.string().valid('PERCENTAGE', 'FIXED_AMOUNT').required(),
  discountValue: Joi.number().min(0).required(),
  maxUsage: Joi.number().min(1).default(1),
  maxUsagePerCustomer: Joi.number().min(1).default(1),
  minOrderAmount: Joi.number().min(0).default(0),
  maxDiscountAmount: Joi.number().min(0).optional(),
  startDate: Joi.date().required(),
  expiryDate: Joi.date().required(),
  isActive: Joi.boolean().default(true),
  excludeDealProducts: Joi.boolean().default(true),
});

const updateCouponSchema = Joi.object({
  branch: Joi.string().optional().allow(null),
  description: Joi.string().max(1000).optional(),
  discountType: Joi.string().valid('PERCENTAGE', 'FIXED_AMOUNT').optional(),
  discountValue: Joi.number().min(0).optional(),
  maxUsage: Joi.number().min(1).optional(),
  maxUsagePerCustomer: Joi.number().min(1).optional(),
  minOrderAmount: Joi.number().min(0).optional(),
  maxDiscountAmount: Joi.number().min(0).optional().allow(null),
  startDate: Joi.date().optional(),
  expiryDate: Joi.date().optional(),
  isActive: Joi.boolean().optional(),
  excludeDealProducts: Joi.boolean().optional(),
});

const validateCouponSchema = Joi.object({
  code: Joi.string().required(),
  orderAmount: Joi.number().min(0).required(),
  branch: Joi.string().optional(),
});

// Public routes
router.get('/', couponController.getAllCoupons);
router.get('/active', couponController.getActiveCoupons);
router.get('/:id', couponController.getCouponById);

// Admin routes
router.post('/', authenticate, authorize('ADMIN'), validate(createCouponSchema), couponController.createCoupon);
router.put('/:id', authenticate, authorize('ADMIN'), validate(updateCouponSchema), couponController.updateCoupon);
router.delete('/:id', authenticate, authorize('ADMIN'), couponController.deleteCoupon);
router.patch('/:id/restore', authenticate, authorize('ADMIN'), couponController.restoreCoupon);

// Validation route
router.post('/validate', authenticate, validate(validateCouponSchema), couponController.validateCoupon);

export default router;
