import { Router } from 'express';
import { optionalAuth } from '@/middleware/auth';
import { resolveTenantFromUser } from '@/superadmin/middleware/tenantIsolation.middleware';
import * as tenantBrandingController from './tenantBranding.controller';

const router = Router();

router.get('/branding', optionalAuth, resolveTenantFromUser, tenantBrandingController.getBranding);
router.get('/plan', optionalAuth, resolveTenantFromUser, tenantBrandingController.getPlan);

export default router;
