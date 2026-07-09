import { Router } from 'express';
import * as settingsController from '@/superadmin/controllers/settings.controller';
import * as emailTemplatesController from '@/superadmin/controllers/emailTemplates.controller';
import * as teamController from '@/superadmin/controllers/team.controller';
import { authenticateSuperAdmin } from '@/superadmin/middleware/superAdminAuth.middleware';
import { requireFullAccess } from '@/superadmin/middleware/roleCheck.middleware';

const router = Router();
router.use(authenticateSuperAdmin);

router.get('/all', settingsController.getAllSettings);
router.get('/system-info', settingsController.systemInfo);

router.post('/test-email', requireFullAccess, settingsController.testEmail);
router.post('/test-gateway', requireFullAccess, settingsController.testGateway);
router.post('/test-push', requireFullAccess, settingsController.testPush);
router.post('/test-sms', requireFullAccess, settingsController.testSms);
router.post('/test-maps', requireFullAccess, settingsController.testMaps);
router.post('/cache/clear', requireFullAccess, settingsController.clearCache);

router.get('/email-templates', emailTemplatesController.list);
router.get('/email-templates/:key', emailTemplatesController.getByKey);
router.patch('/email-templates/:key', requireFullAccess, emailTemplatesController.update);
router.post('/email-templates/:key/preview', emailTemplatesController.preview);

router.get('/team/login-logs', teamController.loginLogs);
router.get('/team', teamController.list);
router.post('/team', requireFullAccess, teamController.create);
router.patch('/team/:id', requireFullAccess, teamController.update);

router.get('/', settingsController.getSettings);
router.patch('/', requireFullAccess, settingsController.updateSettings);
router.patch('/:section', requireFullAccess, settingsController.patchSection);

export default router;
