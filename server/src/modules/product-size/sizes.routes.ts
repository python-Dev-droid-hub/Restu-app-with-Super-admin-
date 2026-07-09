import { Router } from 'express';
import { ProductSizeController } from './product-size.controller';
import { authenticate, authorize, optionalAuth } from '@/middleware/auth';
import { validate } from '@/middleware/validation';
import Joi from 'joi';

const router = Router() as any;
const productSizeController = new ProductSizeController();

// Request logging middleware
router.use((req: any, res: any, next: any) => {
  console.log('🟣 [SIZES ROUTES] Incoming request:', req.method, req.path);
  console.log('🟣 [SIZES ROUTES] Body:', JSON.stringify(req.body, null, 2));
  console.log('🟣 [SIZES ROUTES] Params:', JSON.stringify(req.params, null, 2));
  next();
});

// Validation schemas for Size CRUD
const createSizeSchema = Joi.object({
  size_name: Joi.string().min(1).max(50).required(),
  description: Joi.string().max(200).optional(),
  display_order: Joi.number().min(0).default(0),
  is_active: Joi.boolean().default(true),
});

const updateSizeSchema = Joi.object({
  size_name: Joi.string().min(1).max(50).optional(),
  description: Joi.string().max(200).optional(),
  display_order: Joi.number().min(0).optional(),
  is_active: Joi.boolean().optional(),
});

// Scoped by tenant when authenticated; legacy sizes when not
router.get('/', optionalAuth, productSizeController.getAllSizes);

// Admin routes - Size management (BRANCH_MANAGER can also manage sizes)
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), validate(createSizeSchema), productSizeController.createSize);
router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), validate(updateSizeSchema), productSizeController.updateSize);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), productSizeController.deleteSize);

export default router;
