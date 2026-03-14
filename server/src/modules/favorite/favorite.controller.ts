import { Request, Response } from 'express';
import { Favorite } from '@/models/Favorite';
import { Branch } from '@/models/Branch';
import { sendSuccess, sendError } from '@/utils/response';
import { asyncHandler, IAuthRequest } from '@/utils';

export class FavoriteController {
  // Add a restaurant to favorites
  addFavorite = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { branchId } = req.body;
    const customerId = req.user?._id;

    if (!branchId) {
      return sendError(res, 'Branch ID is required', 400);
    }

    // Check if favorite already exists
    const existingFavorite = await Favorite.findOne({
      customer: customerId,
      branch: branchId
    });

    if (existingFavorite) {
      return sendError(res, 'Restaurant already in favorites', 400);
    }

    const favorite = new Favorite({
      customer: customerId,
      branch: branchId
    });

    await favorite.save();

    sendSuccess(res, { favorite }, 'Restaurant added to favorites successfully', 201);
  });

  // Remove a restaurant from favorites
  removeFavorite = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { branchId } = req.params;
    const customerId = req.user?._id;

    const favorite = await Favorite.findOneAndDelete({
      customer: customerId,
      branch: branchId
    });

    if (!favorite) {
      return sendError(res, 'Favorite not found', 404);
    }

    sendSuccess(res, null, 'Restaurant removed from favorites successfully');
  });

  // Get customer's favorite restaurants
  getFavorites = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const customerId = req.user?._id;

    const favorites = await Favorite.find({ customer: customerId })
      .populate('branch', 'branchName addressLine city state phoneNumber operatingHours')
      .sort({ createdAt: -1 });

    // Filter out favorites whose branch was deleted (branch populate becomes null)
    const validFavorites = favorites.filter((fav: any) => !!fav.branch);

    // Best-effort cleanup of invalid favorites to prevent repeated crashes
    const invalidFavorites = favorites.filter((fav: any) => !fav.branch);
    if (invalidFavorites.length > 0) {
      try {
        await Favorite.deleteMany({ _id: { $in: invalidFavorites.map((f: any) => f._id) } });
      } catch (e) {
        // ignore cleanup errors
      }
    }

    const formattedFavorites = validFavorites.map((fav: any) => ({
      id: fav._id,
      branchId: fav.branch._id,
      branchName: (fav.branch as any).branchName,
      address: (fav.branch as any).addressLine,
      city: (fav.branch as any).city,
      phone: (fav.branch as any).phoneNumber,
      operatingHours: (fav.branch as any).operatingHours,
      addedAt: fav.createdAt
    }));

    sendSuccess(res, { favorites: formattedFavorites }, 'Favorites retrieved successfully');
  });

  // Check if a restaurant is favorited by customer
  checkFavorite = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { branchId } = req.params;
    const customerId = req.user?._id;

    const favorite = await Favorite.findOne({
      customer: customerId,
      branch: branchId
    });

    sendSuccess(res, { isFavorited: !!favorite }, 'Favorite status checked successfully');
  });
}
