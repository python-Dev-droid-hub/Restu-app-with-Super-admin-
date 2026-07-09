import { Router } from 'express';
import * as analyticsController from '@/superadmin/controllers/analytics.controller';
import { authenticateSuperAdmin } from '@/superadmin/middleware/superAdminAuth.middleware';

const router = Router();

router.use(authenticateSuperAdmin);
router.get('/dashboard', analyticsController.getDashboard);
router.get('/billing', analyticsController.getBilling);

export default router;
