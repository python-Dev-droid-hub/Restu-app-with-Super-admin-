import { Router } from 'express';
import * as subscriptionsController from '@/superadmin/controllers/subscriptions.controller';
import { authenticateSuperAdmin } from '@/superadmin/middleware/superAdminAuth.middleware';
import { canManageBilling, requireFullAccess } from '@/superadmin/middleware/roleCheck.middleware';

const router = Router();

router.use(authenticateSuperAdmin);

router.get('/', subscriptionsController.list);
router.get('/tenant/:tenantId', subscriptionsController.tenantHistory);
router.post('/extend', canManageBilling, subscriptionsController.extend);
router.post('/cancel', requireFullAccess, subscriptionsController.cancel);
router.post('/mark-past-due', canManageBilling, subscriptionsController.markPastDue);
router.post('/apply-credit', canManageBilling, subscriptionsController.applyCredit);
router.get('/:id/invoice', subscriptionsController.getInvoice);
router.get('/:id', subscriptionsController.getById);
router.post('/:id/mark-paid', canManageBilling, subscriptionsController.markPaid);

export default router;
