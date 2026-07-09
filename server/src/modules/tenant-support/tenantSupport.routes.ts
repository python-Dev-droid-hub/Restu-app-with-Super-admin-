import { Router } from 'express';
import { authenticate, authorize } from '@/middleware/auth';
import {
  resolveTenantFromUser,
  ensureTenantActive,
  type ISaasTenantRequest,
} from '@/superadmin/middleware/tenantIsolation.middleware';
import * as tenantSupportController from './tenantSupport.controller';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'BRANCH_MANAGER', 'SUPER_ADMIN'));
router.use(resolveTenantFromUser);
router.use((req: ISaasTenantRequest, _res, next) => {
  const authReq = req as ISaasTenantRequest & { impersonating?: boolean; authTenantId?: string };
  if (authReq.impersonating && authReq.authTenantId && !req.tenant) {
    return next();
  }
  return ensureTenantActive(req, _res, next);
});

router.get('/', tenantSupportController.listTickets);
router.get('/:id', tenantSupportController.getTicket);
router.post('/', tenantSupportController.createTicket);
router.post('/:id/reply', tenantSupportController.replyToTicket);

export default router;
