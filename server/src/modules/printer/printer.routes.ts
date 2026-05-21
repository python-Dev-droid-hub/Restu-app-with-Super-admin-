import { Router } from 'express';
import { authenticate, authorize } from '@/middleware/auth';
import { PrinterController } from './printer.controller';

const router = Router() as any;
const controller = new PrinterController();

router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'MANAGER'),
  controller.list
);
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'MANAGER'),
  controller.create
);
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'MANAGER'),
  controller.update
);
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'MANAGER'),
  controller.remove
);
router.post(
  '/:id/test',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'MANAGER'),
  controller.test
);
router.get(
  '/:id/status',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'MANAGER'),
  controller.status
);
router.get(
  '/jobs/list',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'MANAGER'),
  controller.jobs
);

export default router;
