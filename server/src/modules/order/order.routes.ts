import { Router } from 'express';
import { OrderController } from './order.controller';
import { authenticate, authorize } from '@/middleware/auth';
import { validate, validateParams } from '@/middleware/validation';
import Joi from 'joi';

const router = Router() as any;
const orderController = new OrderController();

// Validation schemas
const createOrderSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      menuItemId: Joi.string().required(),
      quantity: Joi.number().min(1).required(),
      customizations: Joi.array().items(Joi.string()).optional(),
    })
  ).min(1).required(),
  restaurantId: Joi.string().required(),
  deliveryAddress: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    zipCode: Joi.string().required(),
    coordinates: Joi.object({
      lat: Joi.number().min(-90).max(90),
      lng: Joi.number().min(-180).max(180),
    }).optional(),
  }).required(),
  orderType: Joi.string().valid('delivery', 'pickup').required(),
  paymentMethod: Joi.string().valid('cash', 'card', 'digital_wallet').required(),
  deliveryInstructions: Joi.string().max(500).optional(),
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled').required(),
});

const cancelOrderSchema = Joi.object({
  reason: Joi.string().max(500).optional(),
});

const addReviewSchema = Joi.object({
  rating: Joi.number().min(1).max(5).required(),
  review: Joi.string().max(1000).optional(),
});

const orderParamsSchema = Joi.object({
  id: Joi.string().required(),
});

const restaurantParamsSchema = Joi.object({
  restaurantId: Joi.string().required(),
});

// Protected routes - Customers
router.post('/', authenticate, authorize('CUSTOMER', 'WAITER'), validate(createOrderSchema), orderController.createOrder);
router.get('/my-orders', authenticate, authorize('CUSTOMER'), orderController.getMyOrders);
router.get('/:id', authenticate, validateParams(orderParamsSchema), orderController.getOrderById);
router.put('/:id/cancel', authenticate, authorize('CUSTOMER'), validate(cancelOrderSchema), orderController.cancelOrder);
router.put('/:id/review', authenticate, authorize('CUSTOMER'), validate(addReviewSchema), orderController.addReview);

// Protected routes - Restaurant owners
router.get('/restaurant/:restaurantId', authenticate, authorize('BRANCH_MANAGER', 'ADMIN', 'SUPER_ADMIN'), validateParams(restaurantParamsSchema), orderController.getRestaurantOrders);
router.put('/:id/status', authenticate, authorize('BRANCH_MANAGER', 'ADMIN', 'CHEF', 'RIDER', 'SUPER_ADMIN'), validate(updateStatusSchema), orderController.updateOrderStatus);
router.put('/:id/cancel-restaurant', authenticate, authorize('BRANCH_MANAGER', 'ADMIN', 'SUPER_ADMIN'), validate(cancelOrderSchema), orderController.cancelOrder);
router.get('/stats/:restaurantId', authenticate, authorize('BRANCH_MANAGER', 'ADMIN', 'SUPER_ADMIN'), validateParams(restaurantParamsSchema), orderController.getOrderStats);

// Protected routes - Drivers
router.get('/driver/my-orders', authenticate, authorize('RIDER', 'SUPER_ADMIN'), orderController.getDriverOrders);
router.get('/driver/available', authenticate, authorize('RIDER', 'SUPER_ADMIN'), orderController.getAvailableOrders);
router.put('/:id/accept', authenticate, authorize('RIDER', 'SUPER_ADMIN'), orderController.acceptOrder);
router.put('/:id/deliver', authenticate, authorize('RIDER', 'SUPER_ADMIN'), validate(updateStatusSchema), orderController.updateOrderStatus);

// Protected routes - Admins
router.get('/admin/all', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), orderController.getMyOrders); // Reuse getMyOrders for admin with different logic
router.get('/admin/stats', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), orderController.getOrderStats);

// Generic admin endpoint for listing all orders with filtering
router.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), orderController.getAllOrders);

// Submit order to kitchen - Waiter, Branch Manager, Admin
router.post('/:orderId/submit-to-kitchen', authenticate, authorize('WAITER', 'BRANCH_MANAGER', 'ADMIN', 'SUPER_ADMIN'), orderController.submitToKitchen);

// Get orders for waiter - filtered by status
router.get('/waiter/my-orders', authenticate, authorize('WAITER', 'SUPER_ADMIN'), orderController.getWaiterOrders);

// PATCH order status - Waiter can mark as PICKED_UP
router.patch('/:orderId', authenticate, authorize('WAITER', 'BRANCH_MANAGER', 'ADMIN', 'CHEF', 'SUPER_ADMIN'), orderController.patchOrderStatus);

export default router;
