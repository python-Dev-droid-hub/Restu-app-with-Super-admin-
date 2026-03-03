import { Router } from 'express';
import { TableController } from './table.controller';
import { authenticate, authorize } from '@/middleware/auth';
import { validate } from '@/middleware/validation';
import Joi from 'joi';

const router = Router() as any;
const tableController = new TableController();

// Validation schemas
const createTableSchema = Joi.object({
  branch: Joi.string().required(),
  tableNumber: Joi.string().max(20).required(),
  seatingCapacity: Joi.number().integer().min(1).max(20).required(),
  section: Joi.string().max(50).optional(),
  floorNumber: Joi.number().integer().min(1).max(10).default(1),
  status: Joi.string().valid('AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'OUT_OF_SERVICE').default('AVAILABLE'),
});

const updateTableSchema = Joi.object({
  tableNumber: Joi.string().max(20).optional(),
  seatingCapacity: Joi.number().integer().min(1).max(20).optional(),
  section: Joi.string().max(50).optional(),
  floorNumber: Joi.number().integer().min(1).max(10).optional(),
  status: Joi.string().valid('AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'OUT_OF_SERVICE').optional(),
});

const assignWaiterSchema = Joi.object({
  waiterId: Joi.string().required(),
});

const changeStatusSchema = Joi.object({
  status: Joi.string().valid('AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'OUT_OF_SERVICE').required(),
  waiterId: Joi.string().optional(),
});

// Routes - all require ADMIN or BRANCH_MANAGER role
router.get('/', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'WAITER', 'SUPER_ADMIN'), tableController.getTables);
router.get('/branch/:branchId', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'WAITER', 'SUPER_ADMIN'), tableController.getTablesByBranch);
router.get('/stats/:branchId', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'SUPER_ADMIN'), tableController.getTableStats);
router.get('/:id', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'SUPER_ADMIN'), tableController.getTable);

router.post('/', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'SUPER_ADMIN'), validate(createTableSchema), tableController.createTable);
router.put('/:id', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'SUPER_ADMIN'), validate(updateTableSchema), tableController.updateTable);
router.delete('/:id', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'SUPER_ADMIN'), tableController.deleteTable);

// Assign/remove waiter
router.put('/:id/assign-waiter', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'SUPER_ADMIN'), validate(assignWaiterSchema), tableController.assignWaiter);
router.put('/:id/remove-waiter', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'SUPER_ADMIN'), tableController.removeWaiter);

// Change status
router.put('/:id/status', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'WAITER', 'SUPER_ADMIN'), validate(changeStatusSchema), tableController.changeStatus);

export default router;
