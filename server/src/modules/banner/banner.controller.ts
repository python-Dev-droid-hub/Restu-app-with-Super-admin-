import { Request, Response } from 'express';
import { Banner } from '@/models/Banner';
import { sendSuccess, asyncHandler, IAuthRequest } from '@/utils';
import { createError } from '@/middleware/errorHandler';
import { getTenantIdFromRequest, tenantDataFilter, withTenantId } from '@/utils/tenantScope';

export class BannerController {
  // Get all banners (admin)
  getAllBanners = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { branchId, isActive } = req.query;
    
    const filter: any = { ...tenantDataFilter(getTenantIdFromRequest(req)) };
    if (branchId) filter.branchId = branchId;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    const banners = await Banner.find(filter)
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();
    
    sendSuccess(res, { banners }, 'Banners retrieved successfully');
  });

  // Get active banners (public/customer)
  getActiveBanners = asyncHandler(async (req: Request, res: Response) => {
    const { branchId, limit = '10' } = req.query;
    
    const banners = await (Banner as any).getActiveBanners(
      branchId as string, 
      parseInt(limit as string)
    );
    
    sendSuccess(res, { banners }, 'Active banners retrieved successfully');
  });

  // Create banner (admin/manager)
  createBanner = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const bannerData = withTenantId({ ...req.body }, getTenantIdFromRequest(req));
    
    const banner = await Banner.create(bannerData);
    
    sendSuccess(res, { banner }, 'Banner created successfully', 201);
  });

  // Update banner (admin/manager)
  updateBanner = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;
    
    const banner = await Banner.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!banner) {
      throw createError('Banner not found', 404);
    }
    
    sendSuccess(res, { banner }, 'Banner updated successfully');
  });

  // Delete banner (admin/manager)
  deleteBanner = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { id } = req.params;
    
    const banner = await Banner.findByIdAndDelete(id);
    
    if (!banner) {
      throw createError('Banner not found', 404);
    }
    
    sendSuccess(res, null, 'Banner deleted successfully');
  });

  // Toggle banner active status
  toggleBannerStatus = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { id } = req.params;
    
    const banner = await Banner.findById(id);
    
    if (!banner) {
      throw createError('Banner not found', 404);
    }
    
    banner.isActive = !banner.isActive;
    await banner.save();
    
    sendSuccess(res, { banner }, `Banner ${banner.isActive ? 'activated' : 'deactivated'} successfully`);
  });

  // Reorder banners
  reorderBanners = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { banners } = req.body;
    
    if (!Array.isArray(banners)) {
      throw createError('Invalid banners array', 400);
    }
    
    const updatePromises = banners.map(({ id, displayOrder }) =>
      Banner.findByIdAndUpdate(id, { displayOrder })
    );
    
    await Promise.all(updatePromises);
    
    sendSuccess(res, null, 'Banners reordered successfully');
  });
}
