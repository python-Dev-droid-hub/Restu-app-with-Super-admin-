import { Router } from 'express';
import * as tenantsController from '@/superadmin/controllers/tenants.controller';
import { authenticateSuperAdmin } from '@/superadmin/middleware/superAdminAuth.middleware';
import { canManageTenants, requireFullAccess, canManageBilling } from '@/superadmin/middleware/roleCheck.middleware';

const router = Router();

router.use(authenticateSuperAdmin);

router.get('/export/csv', tenantsController.exportTenantsCsv);
router.post('/bulk-suspend', requireFullAccess, tenantsController.bulkSuspend);
router.post('/bulk-reactivate', requireFullAccess, tenantsController.bulkReactivate);
router.post('/bulk-email', requireFullAccess, tenantsController.bulkEmail);
router.get('/', tenantsController.listTenants);
router.get('/suggest-slug', tenantsController.suggestSlug);
router.get('/:id', tenantsController.getTenant);
router.post('/', canManageTenants, tenantsController.createTenant);
router.patch('/:id', canManageTenants, tenantsController.updateTenant);
router.post('/:id/status', canManageBilling, tenantsController.setTenantStatus);
router.post('/:id/suspend', requireFullAccess, tenantsController.suspendTenant);
router.post('/:id/reactivate', requireFullAccess, tenantsController.reactivateTenant);
router.delete('/:id', requireFullAccess, tenantsController.deleteTenant);

router.get('/:id/branches', tenantsController.listTenantBranches);
router.post('/:id/branches', canManageTenants, tenantsController.createTenantBranch);
router.patch('/:id/branches/:branchId', canManageTenants, tenantsController.updateTenantBranch);
router.post('/:id/branches/:branchId/deactivate', canManageTenants, tenantsController.deactivateTenantBranch);
router.delete('/:id/branches/:branchId', canManageTenants, tenantsController.deleteTenantBranch);
router.post('/:id/change-plan', canManageTenants, tenantsController.changePlan);
router.post('/:id/extend-subscription', canManageBilling, tenantsController.extendTenantSubscription);
router.post('/:id/impersonate', canManageTenants, tenantsController.impersonateTenant);

export default router;
