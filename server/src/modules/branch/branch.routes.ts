import { Router } from 'express';
import { RestaurantController } from '@/modules/restaurant/restaurant.controller';
import { authenticate, authorize, optionalAuth } from '@/middleware/auth';
import { validate, validateQuery } from '@/middleware/validation';
import Joi from 'joi';
import { logger } from '@/utils/logger';

const router = Router() as any;
const restaurantController = new RestaurantController();

// Validation schemas
const createBranchSchema = Joi.object({
  branchCode: Joi.string().pattern(/^[A-Z]{2}\d{3}$/).required(),
  branchName: Joi.string().min(2).max(255).required(),
  addressLine: Joi.string().min(1).max(500).required(),
  city: Joi.string().min(1).max(100).required(),
  state: Joi.string().max(100).optional(),
  postalCode: Joi.string().max(20).optional(),
  country: Joi.string().max(100).optional(),
  lat: Joi.number().min(-90).max(90).optional(),
  lng: Joi.number().min(-180).max(180).optional(),
  phoneNumber: Joi.string().pattern(/^[\+]?[\d\s\-\(\)]{10,20}$/).optional(),
  email: Joi.string().email().optional(),
  operatingHours: Joi.object().optional(),
  deliveryRadius: Joi.number().min(100).max(50000).optional(),
  acceptsDelivery: Joi.boolean().optional(),
  acceptsDineIn: Joi.boolean().optional(),
  acceptsTakeaway: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
  currency: Joi.string().valid('USD', 'PKR', 'EUR', 'GBP', 'AED', 'SAR', 'INR').optional(),
  language: Joi.string().valid('en', 'ur', 'ar').optional(),
});

const updateBranchSchema = Joi.object({
  branchCode: Joi.string().pattern(/^[A-Z]{2}\d{3}$/).optional(),
  branchName: Joi.string().min(2).max(255).optional(),
  addressLine: Joi.string().min(1).max(500).optional(),
  city: Joi.string().min(1).max(100).optional(),
  state: Joi.string().max(100).optional(),
  postalCode: Joi.string().max(20).optional(),
  country: Joi.string().max(100).optional(),
  lat: Joi.number().min(-90).max(90).optional(),
  lng: Joi.number().min(-180).max(180).optional(),
  phoneNumber: Joi.string().pattern(/^[\+]?[\d\s\-\(\)]{10,20}$/).optional(),
  email: Joi.string().email().optional(),
  operatingHours: Joi.object().optional(),
  deliveryRadius: Joi.number().min(100).max(50000).optional(),
  acceptsDelivery: Joi.boolean().optional(),
  acceptsDineIn: Joi.boolean().optional(),
  acceptsTakeaway: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
  currency: Joi.string().valid('USD', 'PKR', 'EUR', 'GBP', 'AED', 'SAR', 'INR').optional(),
  language: Joi.string().valid('en', 'ur', 'ar').optional(),
});

const querySchema = Joi.object({
  page: Joi.number().min(1).optional(),
  limit: Joi.number().min(1).max(100).optional(),
  city: Joi.string().optional(),
  search: Joi.string().optional(),
  sort: Joi.string().optional(),
});

// Logging middleware for branch routes
const logBranchRequest = (req: any, res: any, next: any) => {
  logger.info(`🏢 [BRANCHES] ${req.method} ${req.path}`, {
    user: req.user?.email,
    role: req.user?.role,
    body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined
  });
  next();
};

// Public route — optionalAuth scopes results for logged-in tenant admins
router.get('/', optionalAuth, validateQuery(querySchema), logBranchRequest, restaurantController.getAllRestaurants);

// Protected routes - SUPER_ADMIN and ADMIN can manage branches
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), logBranchRequest, validate(createBranchSchema), restaurantController.createRestaurant);
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'), logBranchRequest, validate(updateBranchSchema), restaurantController.updateRestaurant);
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), logBranchRequest, restaurantController.deleteRestaurant);

// Get single branch
router.get('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'), logBranchRequest, restaurantController.getRestaurantById);

// Branch status management
router.patch('/:id/activate', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), logBranchRequest, restaurantController.activateBranch);
router.patch('/:id/deactivate', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), logBranchRequest, restaurantController.deactivateBranch);

// Assign manager to branch
router.post('/:id/assign-manager', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), logBranchRequest, restaurantController.assignManager);

export default router;
