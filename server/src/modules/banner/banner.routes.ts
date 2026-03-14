import { Router } from 'express';
import { BannerController } from './banner.controller';
import { authenticate, authorize } from '@/middleware/auth';

const router = Router();
const bannerController = new BannerController();

// Public routes - Get active banners for customer display
router.get('/active', bannerController.getActiveBanners);

// Admin/Manager routes - Manage banners
router.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), bannerController.getAllBanners);
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), bannerController.createBanner);
router.put('/reorder', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), bannerController.reorderBanners);
router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), bannerController.updateBanner);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), bannerController.deleteBanner);
router.patch('/:id/toggle', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), bannerController.toggleBannerStatus);

export default router;
