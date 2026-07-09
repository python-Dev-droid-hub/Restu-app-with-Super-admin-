import { Router } from 'express';
import * as uploadController from '@/superadmin/controllers/upload.controller';
import { authenticateSuperAdmin } from '@/superadmin/middleware/superAdminAuth.middleware';

const router = Router();
router.use(authenticateSuperAdmin);
router.post('/image', uploadController.uploadImage);

export default router;
