import { Router } from 'express';
import * as searchController from '@/superadmin/controllers/search.controller';
import { authenticateSuperAdmin } from '@/superadmin/middleware/superAdminAuth.middleware';

const router = Router();
router.use(authenticateSuperAdmin);
router.get('/', searchController.globalSearch);

export default router;
