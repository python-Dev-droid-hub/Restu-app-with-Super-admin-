import { Router } from 'express';
import { ProductSizeController } from './product-size.controller';
import { authenticate, authorize, optionalAuth } from '@/middleware/auth';
import { validate } from '@/middleware/validation';
import Joi from 'joi';

const router = Router() as any;
const productSizeController = new ProductSizeController();

// Request logging middleware
router.use((req: any, res: any, next: any) => {
  console.log('🟣 [SIZE ROUTES] Incoming request:', req.method, req.path);
  console.log('🟣 [SIZE ROUTES] Headers:', JSON.stringify(req.headers, null, 2));
  console.log('🟣 [SIZE ROUTES] Body:', JSON.stringify(req.body, null, 2));
  next();
});

// Validation schemas
const createSizeSchema = Joi.object({
  size_name: Joi.string().min(1).max(50).required(),
  description: Joi.string().max(200).optional(),
  display_order: Joi.number().min(0).default(0),
  is_active: Joi.boolean().default(true),
});

const createProductSizeSchema = Joi.object({
  product: Joi.string().required(),
  size: Joi.string().required(),
  price: Joi.number().min(0).required(),
  isDefault: Joi.boolean().default(false),
  isAvailable: Joi.boolean().default(true),
});

const updateProductSizeSchema = Joi.object({
  price: Joi.number().min(0).optional(),
  isDefault: Joi.boolean().optional(),
  isAvailable: Joi.boolean().optional(),
});

const updateSizeSchema = Joi.object({
  size_name: Joi.string().min(1).max(50).optional(),
  description: Joi.string().max(200).optional(),
  display_order: Joi.number().min(0).optional(),
  is_active: Joi.boolean().optional(),
});

// Public routes
router.get('/sizes', optionalAuth, productSizeController.getAllSizes);
router.get('/product/:productId', productSizeController.getProductSizes);
router.get('/product/:productId/default', productSizeController.getDefaultProductSize);

// Admin routes - Size management
router.post('/sizes', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validate(createSizeSchema), productSizeController.createSize);
router.put('/sizes/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validate(updateSizeSchema), productSizeController.updateSize);

// Admin routes - Product Size management
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validate(createProductSizeSchema), productSizeController.createProductSize);
router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validate(updateProductSizeSchema), productSizeController.updateProductSize);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), productSizeController.deleteProductSize);
router.patch('/:id/restore', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), productSizeController.restoreProductSize);
router.patch('/:id/set-default', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), productSizeController.setDefaultSize);

export default router;
