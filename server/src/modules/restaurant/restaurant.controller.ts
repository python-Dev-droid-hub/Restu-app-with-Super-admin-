import { Request, Response, NextFunction } from 'express';
import { RestaurantRepository } from './restaurant.repository';
import { IAuthRequest, sendSuccess, sendError, asyncHandler } from '@/utils';
import { createError } from '@/middleware/errorHandler';
import { getTenantIdFromRequest, tenantBranchFilter } from '@/utils/tenantScope';
import { assertPlanBranchLimit } from '@/superadmin/services/planEnforcement.service';

export class RestaurantController {
  private restaurantRepository: RestaurantRepository;

  constructor() {
    this.restaurantRepository = new RestaurantRepository();
  }

  createRestaurant = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const userId = req.user!._id;

    // NOTE: The Restaurant model is an alias of the new Branch model.
    // Persist Branch fields directly (branchName/addressLine/city/etc).
    const data: any = { ...req.body };

    // Backward-compat mappings (in case some clients still send legacy fields)
    if (!data.branchName && data.name) data.branchName = data.name;
    if (!data.addressLine && data.address?.street) data.addressLine = data.address.street;
    if (!data.city && data.address?.city) data.city = data.address.city;
    if (!data.state && data.address?.state) data.state = data.address.state;
    if (!data.postalCode && data.address?.zipCode) data.postalCode = data.address.zipCode;
    if (!data.country && data.address?.country) data.country = data.address.country;
    if (!data.phoneNumber && data.phone) data.phoneNumber = data.phone;

    // If lat/lng provided, create GeoJSON location used by $near queries
    if (data.lat !== undefined && data.lat !== null && data.lng !== undefined && data.lng !== null) {
      const lat = Number(data.lat);
      const lng = Number(data.lng);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        data.location = {
          type: 'Point',
          coordinates: [lng, lat],
        };
      }
    }

    // Default branch manager to creator when creator is a branch manager
    if (!data.branchManager && req.user?.role === 'BRANCH_MANAGER') {
      data.branchManager = userId;
    }

    const tenantId = getTenantIdFromRequest(req);
    if (tenantId) {
      await assertPlanBranchLimit(tenantId);
      data.tenantId = tenantId;
    }

    const branch = await this.restaurantRepository.create(data);

    sendSuccess(res, branch, 'Branch created successfully', 201);
  });

  getMyRestaurants = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const userId = req.user!._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const restaurants = await this.restaurantRepository.findByOwnerId(userId);
    const total = restaurants.length;
    
    const paginatedRestaurants = restaurants.slice((page - 1) * limit, page * limit);

    console.log('[RESTAURANT] GetMyRestaurants - Count:', restaurants.length, 'First branch currency:', restaurants[0]?.currency);

    sendSuccess(res, {
      branches: paginatedRestaurants,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }, 'Branches retrieved successfully');
  });

  updateRestaurant = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user!._id;
    const userRole = req.user!.role;

    const restaurant = await this.restaurantRepository.findById(id);
    if (!restaurant) {
      throw createError('Restaurant not found', 404);
    }

    // Check ownership or admin privileges
    // BRANCH_MANAGER can only update their assigned branch, SUPER_ADMIN can update any
    const isBranchManagerOwner = restaurant.branchManager?.toString() === userId.toString();
    const userBranch = req.user?.assignedBranch as any;
    const userBranchId = userBranch?._id?.toString() || userBranch?.toString() || '';
    const isBranchManagerAssigned = userBranchId === id.toString();
    const isBranchManager = userRole === 'BRANCH_MANAGER' && (isBranchManagerOwner || isBranchManagerAssigned);
    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    const isAdmin = userRole === 'ADMIN';

    if (!isBranchManager && !isSuperAdmin && !isAdmin) {
      throw createError('Not authorized to update this restaurant', 403);
    }

    console.log('[RESTAURANT] Update - ID:', id, 'Body:', req.body, 'Currency:', req.body.currency);

    const updatedRestaurant = await this.restaurantRepository.updateById(id, req.body);

    console.log('[RESTAURANT] Updated - ID:', id, 'Saved Currency:', updatedRestaurant?.currency);

    sendSuccess(res, updatedRestaurant, 'Restaurant updated successfully');
  });

  deleteRestaurant = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user!._id;
    const userRole = req.user!.role;

    const restaurant = await this.restaurantRepository.findById(id);
    if (!restaurant) {
      throw createError('Restaurant not found', 404);
    }

    // Check ownership or admin privileges
    if (restaurant.branchManager?.toString() !== userId.toString() && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      throw createError('Not authorized to delete this restaurant', 403);
    }

    await this.restaurantRepository.softDeleteById(id);

    sendSuccess(res, null, 'Restaurant deleted successfully');
  });

  getAllRestaurants = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const city = req.query.city as string;
    const cuisine = req.query.cuisine as string;
    const priceRange = req.query.priceRange as string;
    const search = req.query.search as string;
    const sort = req.query.sort as string || '-createdAt';

    const tenantId = getTenantIdFromRequest(req);
    let filter: any = { ...tenantBranchFilter(tenantId) };
    if (city) filter['address.city'] = new RegExp(city, 'i');
    if (cuisine) filter.cuisine = { $in: [cuisine] };
    if (priceRange) filter.priceRange = priceRange;

    let result;
    if (search) {
      result = await this.restaurantRepository.searchRestaurants(search, page, limit, filter);
    } else {
      result = await this.restaurantRepository.findAll(page, limit, filter, sort);
    }

    const totalPages = Math.ceil(result.total / limit);

    sendSuccess(res, {
      branches: result.restaurants,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: totalPages,
      },
    }, 'Branches retrieved successfully');
  });

  getRestaurantById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const restaurant = await this.restaurantRepository.findById(id);
    
    if (!restaurant || !restaurant.isActive) {
      throw createError('Restaurant not found', 404);
    }

    console.log('[RESTAURANT] Get by ID:', id, 'Currency:', restaurant.currency);

    sendSuccess(res, restaurant, 'Restaurant retrieved successfully');
  });

  getNearbyRestaurants = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { lat, lng } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const maxDistance = parseInt(req.query.maxDistance as string) || 5000;

    if (!lat || !lng) {
      throw createError('Latitude and longitude are required', 400);
    }

    const coordinates = {
      lat: parseFloat(lat as string),
      lng: parseFloat(lng as string),
    };

    const { restaurants, total } = await this.restaurantRepository.findNearby(
      coordinates,
      maxDistance,
      page,
      limit
    );

    const totalPages = Math.ceil(total / limit);

    sendSuccess(res, {
      branches: restaurants,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages,
      },
    }, 'Nearby branches retrieved successfully');
  });

  getTopRatedRestaurants = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const { restaurants, total } = await this.restaurantRepository.getTopRated(page, limit);

    const totalPages = Math.ceil(total / limit);

    sendSuccess(res, {
      branches: restaurants,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages,
      },
    }, 'Top rated branches retrieved successfully');
  });

  getOpenRestaurants = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const { restaurants, total } = await this.restaurantRepository.getOpenRestaurants(new Date(), page, limit);

    const totalPages = Math.ceil(total / limit);

    sendSuccess(res, {
      branches: restaurants,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages,
      },
    }, 'Open branches retrieved successfully');
  });

  getBranchAudit = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    const restaurant = await this.restaurantRepository.findById(id);
    if (!restaurant) {
      throw createError('Restaurant not found', 404);
    }

    // TODO: Implement actual audit data aggregation from orders, inventory, staff
    const auditData = {
      branch: restaurant,
      overview: {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        customerSatisfaction: 0,
      },
      financial: {
        dailyRevenue: [],
        weeklyRevenue: [],
        monthlyRevenue: [],
        expenses: 0,
        profit: 0,
      },
      operations: {
        avgPreparationTime: 0,
        avgDeliveryTime: 0,
        orderCompletionRate: 0,
        inventoryAlerts: 0,
      },
      staff: {
        totalStaff: 0,
        activeStaff: 0,
        performance: [],
      },
    };

    sendSuccess(res, auditData, 'Branch audit retrieved successfully');
  });

  assignManager = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { managerId } = req.body;

    const restaurant = await this.restaurantRepository.findById(id);
    if (!restaurant) {
      throw createError('Restaurant not found', 404);
    }

    const updatedRestaurant = await this.restaurantRepository.updateById(id, {
      branchManager: managerId,
    });

    sendSuccess(res, updatedRestaurant, 'Branch manager assigned successfully');
  });

  activateBranch = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    const restaurant = await this.restaurantRepository.findById(id);
    if (!restaurant) {
      throw createError('Restaurant not found', 404);
    }

    const updatedRestaurant = await this.restaurantRepository.updateById(id, {
      isActive: true,
    });

    sendSuccess(res, updatedRestaurant, 'Branch activated successfully');
  });

  deactivateBranch = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    const restaurant = await this.restaurantRepository.findById(id);
    if (!restaurant) {
      throw createError('Restaurant not found', 404);
    }

    const updatedRestaurant = await this.restaurantRepository.updateById(id, {
      isActive: false,
    });

    sendSuccess(res, updatedRestaurant, 'Branch deactivated successfully');
  });
}
