import { Request, Response, NextFunction } from 'express';
import { RestaurantRepository } from './restaurant.repository';
import { IAuthRequest, sendSuccess, sendError, asyncHandler } from '@/utils';
import { createError } from '@/middleware/errorHandler';

export class RestaurantController {
  private restaurantRepository: RestaurantRepository;

  constructor() {
    this.restaurantRepository = new RestaurantRepository();
  }

  createRestaurant = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const userId = req.user!._id;
    
    // Transform frontend field names to match Restaurant model
    const transformedData: any = {
      name: req.body.branchName,
      description: req.body.description || `${req.body.branchName} branch`,
      owner: userId,
      branchManager: userId,
      branchCode: req.body.branchCode,
      address: {
        street: req.body.addressLine || '',
        city: req.body.city || '',
        state: req.body.state || '',
        zipCode: req.body.postalCode || '',
        country: req.body.country || 'Pakistan',
        coordinates: {
          lat: req.body.lat || 0,
          lng: req.body.lng || 0,
        },
      },
      phone: req.body.phoneNumber || '',
      email: req.body.email || '',
      cuisine: req.body.cuisine || ['Other'],
      priceRange: req.body.priceRange || '$$',
      deliveryTime: req.body.deliveryTime || 30,
      deliveryFee: req.body.deliveryFee || 0,
      minOrderAmount: req.body.minOrderAmount || 0,
      isActive: req.body.isActive !== false,
      acceptsDelivery: req.body.acceptsDelivery !== false,
      acceptsDineIn: req.body.acceptsDineIn !== false,
      acceptsTakeaway: req.body.acceptsTakeaway !== false,
      currency: req.body.currency || 'PKR',
      deliveryRadius: req.body.deliveryRadius || 5000,
      operatingHours: req.body.operatingHours || {
        monday: { open: '09:00', close: '22:00', isOpen: true },
        tuesday: { open: '09:00', close: '22:00', isOpen: true },
        wednesday: { open: '09:00', close: '22:00', isOpen: true },
        thursday: { open: '09:00', close: '22:00', isOpen: true },
        friday: { open: '09:00', close: '22:00', isOpen: true },
        saturday: { open: '09:00', close: '22:00', isOpen: true },
        sunday: { open: '09:00', close: '22:00', isOpen: true },
      },
    };

    // Check if user already has a restaurant
    const existingRestaurants = await this.restaurantRepository.findByOwnerId(userId);
    if (existingRestaurants.length > 0 && req.user!.role !== 'ADMIN' && req.user!.role !== 'SUPER_ADMIN') {
      throw createError('You can only own one restaurant', 400);
    }

    const restaurant = await this.restaurantRepository.create(transformedData);

    sendSuccess(res, restaurant, 'Restaurant created successfully', 201);
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
    const isBranchManagerAssigned = req.user?.assignedBranch?.toString() === id.toString();
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

  getAllRestaurants = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const city = req.query.city as string;
    const cuisine = req.query.cuisine as string;
    const priceRange = req.query.priceRange as string;
    const search = req.query.search as string;
    const sort = req.query.sort as string || '-createdAt';

    let filter: any = {};
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
