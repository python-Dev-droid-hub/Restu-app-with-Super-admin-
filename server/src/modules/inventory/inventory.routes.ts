import { Router } from 'express';
import { InventoryController } from './inventory.controller';
import { authenticate, authorize } from '@/middleware/auth';
import { validate } from '@/middleware/validation';
import Joi from 'joi';

const router = Router() as any;
const inventoryController = new InventoryController();

// Validation schemas
const createInventorySchema = Joi.object({
  branch: Joi.string().required(),
  product: Joi.string().required(),
  quantityAvailable: Joi.number().min(0).default(0),
  reorderLevel: Joi.number().min(0).default(10),
  category: Joi.string().optional(),
});

const updateInventorySchema = Joi.object({
  quantityAvailable: Joi.number().min(0).optional(),
  reorderLevel: Joi.number().min(0).optional(),
  category: Joi.string().optional(),
});

const bulkAddSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      branch: Joi.string().required(),
      product: Joi.string().required(),
      quantityAvailable: Joi.number().min(0).required(),
      reorderLevel: Joi.number().min(0).optional(),
      category: Joi.string().optional(),
    })
  ).min(1).required(),
});

const stockOperationSchema = Joi.object({
  quantity: Joi.number().positive().required(),
});

// Routes - all require authentication
router.get('/', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'CHEF'), inventoryController.getAll);
router.get('/low-stock', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'CHEF'), inventoryController.getLowStock);
router.get('/stats', authenticate, authorize('ADMIN', 'BRANCH_MANAGER'), inventoryController.getStats);
router.get('/categories', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'CHEF'), inventoryController.getCategories);
router.get('/branch/:branchId', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'CHEF'), inventoryController.getByBranch);
router.get('/:id', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'CHEF'), inventoryController.getById);

router.post('/', authenticate, authorize('ADMIN', 'BRANCH_MANAGER'), validate(createInventorySchema), inventoryController.create);
router.post('/bulk-add', authenticate, authorize('ADMIN', 'BRANCH_MANAGER'), validate(bulkAddSchema), inventoryController.bulkAdd);

router.put('/:id', authenticate, authorize('ADMIN', 'BRANCH_MANAGER'), validate(updateInventorySchema), inventoryController.update);
router.put('/:id/add-stock', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'CHEF'), validate(stockOperationSchema), inventoryController.addStock);
router.put('/:id/remove-stock', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'CHEF'), validate(stockOperationSchema), inventoryController.removeStock);

router.delete('/:id', authenticate, authorize('ADMIN'), inventoryController.delete);

export default router;
