import { Router } from 'express';
import * as supportController from '@/superadmin/controllers/support.controller';
import { authenticateSuperAdmin } from '@/superadmin/middleware/superAdminAuth.middleware';

const router = Router();
router.use(authenticateSuperAdmin);

router.get('/stats', supportController.getStats);
router.get('/admins', supportController.listAssignableAdmins);
router.get('/', supportController.listTickets);
router.get('/:id', supportController.getTicket);
router.post('/', supportController.createTicket);
router.patch('/:id', supportController.updateTicket);
router.post('/:id/reply', supportController.replyToTicket);

export default router;
