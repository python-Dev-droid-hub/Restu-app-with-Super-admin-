import { Router } from 'express';
import * as announcementsController from '@/superadmin/controllers/announcements.controller';
import { authenticateSuperAdmin } from '@/superadmin/middleware/superAdminAuth.middleware';
import { requireFullAccess } from '@/superadmin/middleware/roleCheck.middleware';

const router = Router();
router.use(authenticateSuperAdmin);

router.get('/', announcementsController.list);
router.get('/:id', announcementsController.getById);
router.post('/', requireFullAccess, announcementsController.create);
router.patch('/:id', requireFullAccess, announcementsController.update);
router.post('/:id/send', requireFullAccess, announcementsController.send);
router.delete('/:id', requireFullAccess, announcementsController.remove);

export default router;
