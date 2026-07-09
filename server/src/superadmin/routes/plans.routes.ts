import { Router } from 'express';
import * as plansController from '@/superadmin/controllers/plans.controller';
import { authenticateSuperAdmin } from '@/superadmin/middleware/superAdminAuth.middleware';
import { requireFullAccess } from '@/superadmin/middleware/roleCheck.middleware';

const router = Router();

router.use(authenticateSuperAdmin);

router.get('/', plansController.listPlans);
router.get('/compare/all', plansController.comparePlans);
router.get('/:id/warnings', plansController.getPlanWarnings);
router.get('/:id', plansController.getPlan);
router.post('/', requireFullAccess, plansController.createPlan);
router.patch('/:id', requireFullAccess, plansController.updatePlan);
router.post('/:id/toggle', requireFullAccess, plansController.togglePlanActive);

export default router;
