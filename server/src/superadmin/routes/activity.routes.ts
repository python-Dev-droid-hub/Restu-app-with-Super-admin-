import { Router } from 'express';
import * as activityController from '@/superadmin/controllers/activity.controller';
import { authenticateSuperAdmin } from '@/superadmin/middleware/superAdminAuth.middleware';

const router = Router();
router.use(authenticateSuperAdmin);

router.get('/', activityController.list);
router.get('/tenant/:tenantId', activityController.tenantLog);

export default router;
