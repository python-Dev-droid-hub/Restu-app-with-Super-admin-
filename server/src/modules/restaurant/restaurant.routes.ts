import { Router } from 'express';
import { RestaurantController } from './restaurant.controller';
import { authenticate, authorize } from '@/middleware/auth';
import { validate, validateQuery } from '@/middleware/validation';
import Joi from 'joi';

const router = Router() as any;
const restaurantController = new RestaurantController();

// Validation schemas
const createRestaurantSchema = Joi.object({
  branchCode: Joi.string().pattern(/^[A-Z]{2}\d{3}$/).required(),
  branchName: Joi.string().min(2).max(255).required(),
  addressLine: Joi.string().min(1).max(500).required(),
  city: Joi.string().min(1).max(100).required(),
  state: Joi.string().max(100).optional(),
  postalCode: Joi.string().max(20).optional(),
  country: Joi.string().max(100).optional(),
  lat: Joi.number().min(-90).max(90).optional(),
  lng: Joi.number().min(-180).max(180).optional(),
  phoneNumber: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
  email: Joi.string().email().optional(),
  operatingHours: Joi.object().optional(),
  deliveryRadius: Joi.number().min(100).max(50000).optional(),
  acceptsDelivery: Joi.boolean().optional(),
  acceptsDineIn: Joi.boolean().optional(),
  acceptsTakeaway: Joi.boolean().optional(),
});

const updateRestaurantSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().min(10).max(500).optional(),
  address: Joi.object({
    street: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    zipCode: Joi.string().optional(),
    coordinates: Joi.object({
      lat: Joi.number().min(-90).max(90),
      lng: Joi.number().min(-180).max(180),
    }).optional(),
  }).optional(),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
  email: Joi.string().email().optional(),
  website: Joi.string().uri().optional(),
  cuisine: Joi.array().items(Joi.string().valid('Italian', 'Chinese', 'Indian', 'Mexican', 'American', 'Japanese', 'Thai', 'French', 'Mediterranean', 'Other')).optional(),
  priceRange: Joi.string().valid('$', '$$', '$$$', '$$$$').optional(),
  deliveryTime: Joi.number().min(10).max(120).optional(),
  taxRate: Joi.number().min(0).max(100).optional(),
  deliveryFee: Joi.number().min(0).optional(),
  minOrderAmount: Joi.number().min(0).optional(),
  operatingHours: Joi.object().optional(),
  images: Joi.array().items(Joi.string().uri()).optional(),
  currency: Joi.string().valid('USD', 'PKR', 'EUR', 'GBP', 'AED', 'SAR', 'INR').optional(),
  language: Joi.string().valid('en', 'ur', 'ar').optional(),
});

const nearbyQuerySchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  maxDistance: Joi.number().min(100).max(50000).optional(),
});

const querySchema = Joi.object({
  page: Joi.number().min(1).optional(),
  limit: Joi.number().min(1).max(100).optional(),
  city: Joi.string().optional(),
  cuisine: Joi.string().optional(),
  priceRange: Joi.string().valid('$', '$$', '$$$', '$$$$').optional(),
  search: Joi.string().optional(),
  sort: Joi.string().optional(),
});

// Public routes
router.get('/', validateQuery(querySchema), restaurantController.getAllRestaurants);
router.get('/top-rated', validateQuery(querySchema), restaurantController.getTopRatedRestaurants);
router.get('/open', validateQuery(querySchema), restaurantController.getOpenRestaurants);
router.get('/nearby', validateQuery(nearbyQuerySchema), restaurantController.getNearbyRestaurants);
router.get('/:id', restaurantController.getRestaurantById);

// Protected routes - SUPER_ADMIN can manage all branches, BRANCH_MANAGER can only manage their assigned branch
router.post('/', authenticate, authorize('SUPER_ADMIN'), validate(createRestaurantSchema), restaurantController.createRestaurant);
router.get('/my/restaurants', authenticate, authorize('BRANCH_MANAGER', 'SUPER_ADMIN'), restaurantController.getMyRestaurants);
router.put('/:id', authenticate, authorize('BRANCH_MANAGER', 'SUPER_ADMIN'), validate(updateRestaurantSchema), restaurantController.updateRestaurant);
router.delete('/:id', authenticate, authorize('SUPER_ADMIN'), restaurantController.deleteRestaurant);

// Branch audit endpoint - SUPER_ADMIN only
router.get('/:id/audit', authenticate, authorize('SUPER_ADMIN'), restaurantController.getBranchAudit);

// Assign manager endpoint - SUPER_ADMIN only
router.post('/:id/assign-manager', authenticate, authorize('SUPER_ADMIN'), restaurantController.assignManager);

// Activate/Deactivate branch - SUPER_ADMIN only
router.patch('/:id/activate', authenticate, authorize('SUPER_ADMIN'), restaurantController.activateBranch);
router.patch('/:id/deactivate', authenticate, authorize('SUPER_ADMIN'), restaurantController.deactivateBranch);

export default router;
