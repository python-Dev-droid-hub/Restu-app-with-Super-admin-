import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '@/superadmin/controllers/auth.controller';
import { authenticateSuperAdmin } from '@/superadmin/middleware/superAdminAuth.middleware';

const router = Router();

const superAdminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'development',
});

router.post('/login', superAdminAuthLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticateSuperAdmin, authController.logout);
router.get('/me', authenticateSuperAdmin, authController.me);

export default router;
