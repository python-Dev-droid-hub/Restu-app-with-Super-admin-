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
      specialInstructions: Joi.string().max(500).optional().allow(''),
    })
  ).min(1).required(),
  restaurantId: Joi.string().required(),
  customerName: Joi.string().trim().min(2).max(100).required(),
  phoneNumber: Joi.string().max(30).optional().allow(''),
  alternatePhoneNumber: Joi.string().max(30).optional().allow(''),
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
  orderType: Joi.string().valid('DELIVERY', 'DINE_IN', 'TAKEAWAY').required(),
  paymentMethod: Joi.string().valid('cash', 'card', 'digital_wallet').required(),
  deliveryInstructions: Joi.string().max(500).optional(),
  tableId: Joi.string().optional(),
  specialInstructions: Joi.string().max(1000).optional(),
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid(
    'PENDING',
    'KITCHEN_ACCEPTED',
    'PREPARING',
    'READY',
    'PICKED_UP',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'SERVED',
    'COMPLETED',
    'CANCELLED'
  ).required(),
  picked_up_at: Joi.string().isoDate().optional(),
  ready_at: Joi.string().isoDate().optional(),
  paymentMethod: Joi.string().valid('CASH', 'CARD', 'BANK_TRANSFER').optional(),
  paymentStatus: Joi.string().valid('PENDING', 'SUCCESS', 'FAILED').optional(),
});

const cancelOrderSchema = Joi.object({
  reason: Joi.string().max(500).optional(),
});

const addReviewSchema = Joi.object({
  foodRating: Joi.number().min(1).max(5).required(),
  deliveryRating: Joi.number().min(1).max(5).required(),
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
router.put('/:id/status', authenticate, authorize('BRANCH_MANAGER', 'ADMIN', 'CHEF', 'KITCHEN', 'COOK', 'HEAD_CHEF', 'SOUS_CHEF', 'KITCHEN_MANAGER', 'RIDER', 'WAITER', 'SUPER_ADMIN'), validate(updateStatusSchema), orderController.updateOrderStatus);
router.put('/:id/cancel-restaurant', authenticate, authorize('BRANCH_MANAGER', 'ADMIN', 'WAITER', 'SUPER_ADMIN'), validate(cancelOrderSchema), orderController.cancelOrder);
router.get('/stats/:restaurantId', authenticate, authorize('BRANCH_MANAGER', 'ADMIN', 'SUPER_ADMIN'), validateParams(restaurantParamsSchema), orderController.getOrderStats);

// Protected routes - Drivers
router.get('/driver/my-orders', authenticate, authorize('RIDER', 'SUPER_ADMIN'), orderController.getDriverOrders);
router.get('/driver/available', authenticate, authorize('RIDER', 'SUPER_ADMIN'), orderController.getAvailableOrders);
router.put('/:id/accept', authenticate, authorize('RIDER', 'SUPER_ADMIN'), orderController.acceptOrder);
router.put('/:id/deliver', authenticate, authorize('RIDER', 'SUPER_ADMIN'), validate(updateStatusSchema), orderController.updateOrderStatus);

// Protected routes - Admins
router.get('/admin/all', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), orderController.getMyOrders); // Reuse getMyOrders for admin with different logic
router.get('/admin/stats', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), orderController.getOrderStats);

// Generic admin endpoint for listing all orders with filtering - accessible to all staff roles
router.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'WAITER', 'CHEF'), orderController.getAllOrders);

// Submit order to kitchen - Waiter, Branch Manager, Admin
router.post('/:orderId/submit-to-kitchen', authenticate, authorize('WAITER', 'BRANCH_MANAGER', 'ADMIN', 'SUPER_ADMIN'), orderController.submitToKitchen);

// Update order - Waiter can edit their orders before kitchen accepts
router.put('/:orderId', authenticate, authorize('WAITER', 'BRANCH_MANAGER', 'ADMIN', 'SUPER_ADMIN'), orderController.updateOrder);

// Update item status - Chef can mark individual items as PREPARING, READY, SERVED
router.patch('/:orderId/items/:itemId/status', authenticate, authorize('CHEF', 'KITCHEN', 'COOK', 'HEAD_CHEF', 'SOUS_CHEF', 'KITCHEN_MANAGER', 'ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), orderController.updateItemStatus);

// Get orders for waiter - filtered by status
router.get('/waiter/my-orders', authenticate, authorize('WAITER', 'SUPER_ADMIN'), orderController.getWaiterOrders);

// Get ALL branch orders (for waiters/chefs to see all dine-in orders)
router.get('/branch/all', authenticate, authorize('WAITER', 'BRANCH_MANAGER', 'ADMIN', 'SUPER_ADMIN', 'CHEF'), orderController.getBranchOrders);

// PATCH order status - Waiter can mark as PICKED_UP, CHEF can update kitchen status
router.patch('/:orderId', authenticate, authorize('WAITER', 'BRANCH_MANAGER', 'ADMIN', 'CHEF', 'KITCHEN', 'COOK', 'HEAD_CHEF', 'SOUS_CHEF', 'KITCHEN_MANAGER', 'SUPER_ADMIN'), orderController.patchOrderStatus);

// PATCH order status with /status suffix - for CHEF role status updates
router.patch('/:orderId/status', authenticate, authorize('BRANCH_MANAGER', 'ADMIN', 'CHEF', 'KITCHEN', 'COOK', 'HEAD_CHEF', 'SOUS_CHEF', 'KITCHEN_MANAGER', 'RIDER', 'SUPER_ADMIN'), orderController.patchOrderStatus);

export default router;
