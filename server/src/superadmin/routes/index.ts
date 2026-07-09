import { Router } from 'express';
import authRoutes from '@/superadmin/routes/auth.routes';
import tenantsRoutes from '@/superadmin/routes/tenants.routes';
import plansRoutes from '@/superadmin/routes/plans.routes';
import analyticsRoutes from '@/superadmin/routes/analytics.routes';
import subscriptionsRoutes from '@/superadmin/routes/subscriptions.routes';
import uploadRoutes from '@/superadmin/routes/upload.routes';
import supportRoutes from '@/superadmin/routes/support.routes';
import announcementsRoutes from '@/superadmin/routes/announcements.routes';
import activityRoutes from '@/superadmin/routes/activity.routes';
import settingsRoutes from '@/superadmin/routes/settings.routes';
import searchRoutes from '@/superadmin/routes/search.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/tenants', tenantsRoutes);
router.use('/plans', plansRoutes);
router.use('/subscriptions', subscriptionsRoutes);
router.use('/upload', uploadRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/support', supportRoutes);
router.use('/announcements', announcementsRoutes);
router.use('/activity', activityRoutes);
router.use('/settings', settingsRoutes);
router.use('/search', searchRoutes);

export default router;
