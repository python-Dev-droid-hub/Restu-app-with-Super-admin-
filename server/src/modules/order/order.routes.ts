import { Router } from 'express';
import { OrderController } from './order.controller';
import { authenticate, authorize } from '@/middleware/auth';
import { validate, validateParams } from '@/middleware/validation';
import { resolveTenantFromUser, ensureTenantActive } from '@/superadmin/middleware/tenantIsolation.middleware';
import Joi from 'joi';

const router = Router() as any;
const orderController = new OrderController();

router.use(resolveTenantFromUser, ensureTenantActive);

// Validation schemas
const customizationSchema = Joi.alternatives().try(
  Joi.string(),
  Joi.object({
    optionName: Joi.string().required(),
    optionValue: Joi.string().required(),
    extraPrice: Joi.number().optional(),
  })
);

const deliveryAddressSchema = Joi.object({
  street: Joi.string().trim().allow('').default(''),
  city: Joi.string().trim().allow('').default(''),
  state: Joi.string().trim().allow('').default(''),
  zipCode: Joi.string().trim().allow('').default(''),
  address: Joi.string().trim().optional().allow(''),
  coordinates: Joi.object({
    lat: Joi.number().min(-90).max(90),
    lng: Joi.number().min(-180).max(180),
  }).optional(),
}).unknown(true);

const dineInOrderTypes = ['DINE_IN', 'dine_in', 'pickup'];

const createOrderSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      menuItemId: Joi.string().required(),
      quantity: Joi.number().min(1).required(),
      customizations: Joi.array().items(customizationSchema).optional(),
      specialInstructions: Joi.string().max(500).optional().allow(''),
    })
  ).min(1).required(),
  restaurantId: Joi.string().required(),
  customerName: Joi.string().trim().max(100).optional().allow(''),
  phoneNumber: Joi.string().max(30).optional().allow(''),
  alternatePhoneNumber: Joi.string().max(30).optional().allow(''),
  deliveryAddress: Joi.when('orderType', {
    is: Joi.valid(...dineInOrderTypes),
    then: deliveryAddressSchema.optional(),
    otherwise: deliveryAddressSchema
      .required()
      .custom((value, helpers) => {
        const v = value || {};
        const missing = ['street', 'city', 'state', 'zipCode'].filter(
          (k) => !String((v as any)[k] ?? '').trim()
        );
        if (missing.length) {
          return helpers.error('any.custom', {
            message: `deliveryAddress.${missing.join(', deliveryAddress.')} required for delivery orders`,
          });
        }
        return value;
      }),
  }),
  orderType: Joi.string().valid('DELIVERY', 'DINE_IN', 'TAKEAWAY', 'dine_in', 'pickup').required(),
  paymentMethod: Joi.string().valid('cash', 'card', 'digital_wallet').required(),
  deliveryInstructions: Joi.string().max(500).optional().allow(''),
  tableId: Joi.string().optional(),
  tableNumber: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(''),
  table_number: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(''),
  specialInstructions: Joi.string().max(1000).optional().allow(''),
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
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
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

// Public guest order creation - no auth
const createGuestOrderSchema = createOrderSchema;

router.post('/guest', validate(createGuestOrderSchema), orderController.createOrder);
router.get('/guest/status/:id', validateParams(orderParamsSchema), orderController.getGuestOrderStatus);

// Protected routes - Customers
router.post('/', authenticate, authorize('CUSTOMER', 'WAITER'), validate(createOrderSchema), orderController.createOrder);
router.get('/my-orders', authenticate, authorize('CUSTOMER'), orderController.getMyOrders);
router.get('/:id', authenticate, validateParams(orderParamsSchema), orderController.getOrderById);
router.put('/:id/cancel', authenticate, authorize('CUSTOMER'), validate(cancelOrderSchema), orderController.cancelOrder);
router.put('/:id/review', authenticate, authorize('CUSTOMER'), validate(addReviewSchema), orderController.addReview);

// Protected routes - Restaurant owners
router.get('/restaurant/:restaurantId', authenticate, authorize('BRANCH_MANAGER', 'ADMIN', 'SUPER_ADMIN'), validateParams(restaurantParamsSchema), orderController.getRestaurantOrders);
router.put('/:id/status', authenticate, authorize('BRANCH_MANAGER', 'MANAGER', 'ADMIN', 'CHEF', 'KITCHEN', 'COOK', 'HEAD_CHEF', 'SOUS_CHEF', 'KITCHEN_MANAGER', 'RIDER', 'WAITER', 'SUPER_ADMIN'), validate(updateStatusSchema), orderController.updateOrderStatus);
router.put('/:id/cancel-restaurant', authenticate, authorize('BRANCH_MANAGER', 'ADMIN', 'WAITER', 'SUPER_ADMIN'), validate(cancelOrderSchema), orderController.cancelOrder);
router.get('/stats/:restaurantId', authenticate, authorize('BRANCH_MANAGER', 'ADMIN', 'SUPER_ADMIN'), validateParams(restaurantParamsSchema), orderController.getOrderStats);

// Protected routes - Drivers
router.get('/driver/my-orders', authenticate, authorize('RIDER', 'SUPER_ADMIN'), orderController.getDriverOrders);
router.get('/driver/available', authenticate, authorize('RIDER', 'SUPER_ADMIN'), orderController.getAvailableOrders);
router.put('/:id/accept', authenticate, authorize('RIDER', 'SUPER_ADMIN'), orderController.acceptOrder);
router.put('/:id/reject', authenticate, authorize('RIDER', 'SUPER_ADMIN'), orderController.rejectOrder);
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
router.patch('/:orderId/items/:itemId/status', authenticate, authorize('CHEF', 'KITCHEN', 'COOK', 'HEAD_CHEF', 'SOUS_CHEF', 'KITCHEN_MANAGER', 'ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'WAITER'), orderController.updateItemStatus);

const returnItemSchema = Joi.object({
  reason: Joi.string().max(500).optional().allow(''),
});

router.post('/:orderId/items/:itemId/return', authenticate, authorize('WAITER', 'BRANCH_MANAGER', 'ADMIN', 'SUPER_ADMIN'), validate(returnItemSchema), orderController.returnOrderItem);

// Get orders for waiter - filtered by status
router.get('/waiter/my-orders', authenticate, authorize('WAITER', 'SUPER_ADMIN'), orderController.getWaiterOrders);

// Get ALL branch orders (for waiters/chefs to see all dine-in orders)
router.get('/branch/all', authenticate, authorize('WAITER', 'BRANCH_MANAGER', 'ADMIN', 'SUPER_ADMIN', 'CHEF'), orderController.getBranchOrders);

// PATCH order status - Waiter can mark as PICKED_UP, CHEF can update kitchen status
router.patch('/:orderId', authenticate, authorize('WAITER', 'BRANCH_MANAGER', 'MANAGER', 'ADMIN', 'CHEF', 'KITCHEN', 'COOK', 'HEAD_CHEF', 'SOUS_CHEF', 'KITCHEN_MANAGER', 'SUPER_ADMIN'), orderController.patchOrderStatus);

// PATCH order status with /status suffix - for CHEF role status updates
router.patch('/:orderId/status', authenticate, authorize('BRANCH_MANAGER', 'MANAGER', 'ADMIN', 'CHEF', 'KITCHEN', 'COOK', 'HEAD_CHEF', 'SOUS_CHEF', 'KITCHEN_MANAGER', 'RIDER', 'WAITER', 'SUPER_ADMIN'), validate(updateStatusSchema), orderController.patchOrderStatus);

router.post(
  '/:id/generate-bill',
  authenticate,
  authorize('WAITER', 'BRANCH_MANAGER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'),
  orderController.generateBill
);
router.post(
  '/:orderId/generate-bill',
  authenticate,
  authorize('WAITER', 'BRANCH_MANAGER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'),
  orderController.generateBill
);
router.post(
  '/:id/print-bill',
  authenticate,
  authorize('WAITER', 'BRANCH_MANAGER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'),
  orderController.generateBill
);
router.post(
  '/:orderId/print-bill',
  authenticate,
  authorize('WAITER', 'BRANCH_MANAGER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'),
  orderController.generateBill
);
router.get(
  '/:id/proximity',
  authenticate,
  authorize('RIDER', 'ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'),
  orderController.getOrderProximity
);

export default router;
