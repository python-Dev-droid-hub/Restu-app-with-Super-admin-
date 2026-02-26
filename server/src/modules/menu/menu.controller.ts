import { Request, Response, NextFunction } from 'express';
import { MenuRepository } from './menu.repository';
import { RestaurantRepository } from '../restaurant/restaurant.repository';
import { IAuthRequest, sendSuccess, asyncHandler } from '@/utils';
import { createError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';

console.log('✅ MenuController file LOADED');

export class MenuController {
  private menuRepository: MenuRepository;
  private restaurantRepository: RestaurantRepository;

  constructor() {
    this.menuRepository = new MenuRepository();
    this.restaurantRepository = new RestaurantRepository();
  }

  // Category methods
  createCategory = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { restaurantId } = req.params;
    const userId = req.user!._id;
    const userRole = req.user!.role;

    // Verify restaurant ownership
    const restaurant = await this.restaurantRepository.findById(restaurantId);
    if (!restaurant) {
      throw createError('Restaurant not found', 404);
    }

    if (restaurant.branchManager?.toString() !== userId.toString() && userRole !== 'ADMIN') {
      throw createError('Not authorized to manage this restaurant menu', 403);
    }

    const categoryData = { ...req.body, restaurant: restaurantId };
    const category = await this.menuRepository.createCategory(categoryData);

    sendSuccess(res, category, 'Category created successfully', 201);
  });

  getCategories = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { restaurantId } = req.params;

    const categories = await this.menuRepository.getCategoriesByRestaurant(restaurantId);

    sendSuccess(res, categories, 'Categories retrieved successfully');
  });

  updateCategory = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { restaurantId, categoryId } = req.params;
    const userId = req.user!._id;
    const userRole = req.user!.role;

    // Verify restaurant ownership
    const restaurant = await this.restaurantRepository.findById(restaurantId);
    if (!restaurant) {
      throw createError('Restaurant not found', 404);
    }

    if (restaurant.branchManager?.toString() !== userId.toString() && userRole !== 'ADMIN') {
      throw createError('Not authorized to manage this restaurant menu', 403);
    }

    const category = await this.menuRepository.updateCategory(categoryId, req.body);
    if (!category) {
      throw createError('Category not found', 404);
    }

    sendSuccess(res, category, 'Category updated successfully');
  });

  deleteCategory = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { restaurantId, categoryId } = req.params;
    const userId = req.user!._id;
    const userRole = req.user!.role;

    // Verify restaurant ownership
    const restaurant = await this.restaurantRepository.findById(restaurantId);
    if (!restaurant) {
      throw createError('Restaurant not found', 404);
    }

    if (restaurant.branchManager?.toString() !== userId.toString() && userRole !== 'ADMIN') {
      throw createError('Not authorized to manage this restaurant menu', 403);
    }

    const deleted = await this.menuRepository.deleteCategory(categoryId);
    if (!deleted) {
      throw createError('Category not found or cannot be deleted', 404);
    }

    sendSuccess(res, null, 'Category deleted successfully');
  });

  reorderCategories = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { restaurantId } = req.params;
    const { categories } = req.body;
    const userId = req.user!._id;
    const userRole = req.user!.role;

    // Verify restaurant ownership
    const restaurant = await this.restaurantRepository.findById(restaurantId);
    if (!restaurant) {
      throw createError('Restaurant not found', 404);
    }

    if (restaurant.branchManager?.toString() !== userId.toString() && userRole !== 'ADMIN') {
      throw createError('Not authorized to manage this restaurant menu', 403);
    }

    await this.menuRepository.reorderCategories(restaurantId, categories);

    sendSuccess(res, null, 'Categories reordered successfully');
  });

  // Menu Item methods
  createMenuItem = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { restaurantId } = req.params;
    const userId = req.user!._id;
    const userRole = req.user!.role;

    // Verify restaurant ownership
    const restaurant = await this.restaurantRepository.findById(restaurantId);
    if (!restaurant) {
      throw createError('Restaurant not found', 404);
    }

    if (restaurant.branchManager?.toString() !== userId.toString() && userRole !== 'ADMIN') {
      throw createError('Not authorized to manage this restaurant menu', 403);
    }

    const itemData = { ...req.body, restaurant: restaurantId };
    const menuItem = await this.menuRepository.createMenuItem(itemData);

    sendSuccess(res, menuItem, 'Menu item created successfully', 201);
  });

  getMenuItems = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { restaurantId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const category = req.query.category as string;
    const search = req.query.search as string;
    const isVegetarian = req.query.isVegetarian === 'true';
    const isVegan = req.query.isVegan === 'true';
    const isGlutenFree = req.query.isGlutenFree === 'true';
    const isSpicy = req.query.isSpicy === 'true';
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;

    let result;
    const filter: any = {};

    if (category) {
      filter.category = category;
    }

    if (search) {
      result = await this.menuRepository.searchMenuItems(restaurantId, search, page, limit);
    } else if (isVegetarian || isVegan || isGlutenFree || isSpicy || minPrice !== undefined || maxPrice !== undefined) {
      result = await this.menuRepository.getFilteredMenuItems(restaurantId, {
        isVegetarian,
        isVegan,
        isGlutenFree,
        isSpicy,
        minPrice,
        maxPrice,
      }, page, limit);
    } else {
      result = await this.menuRepository.getMenuItemsByRestaurant(restaurantId, page, limit, filter);
    }

    const totalPages = Math.ceil(result.total / limit);

    sendSuccess(res, {
      items: result.items,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: totalPages,
      },
    }, 'Menu items retrieved successfully');
  });

  getMenuItemById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { restaurantId, itemId } = req.params;

    const menuItem = await this.menuRepository.findMenuItemById(itemId);
    if (!menuItem || menuItem.restaurant._id.toString() !== restaurantId) {
      throw createError('Menu item not found', 404);
    }

    sendSuccess(res, menuItem, 'Menu item retrieved successfully');
  });

  updateMenuItem = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { restaurantId, itemId } = req.params;
    const userId = req.user!._id;
    const userRole = req.user!.role;

    // Verify restaurant ownership
    const restaurant = await this.restaurantRepository.findById(restaurantId);
    if (!restaurant) {
      throw createError('Restaurant not found', 404);
    }

    if (restaurant.branchManager?.toString() !== userId.toString() && userRole !== 'ADMIN') {
      throw createError('Not authorized to manage this restaurant menu', 403);
    }

    const menuItem = await this.menuRepository.updateMenuItem(itemId, req.body);
    if (!menuItem) {
      throw createError('Menu item not found', 404);
    }

    sendSuccess(res, menuItem, 'Menu item updated successfully');
  });

  deleteMenuItem = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { restaurantId, itemId } = req.params;
    const userId = req.user!._id;
    const userRole = req.user!.role;

    // Verify restaurant ownership
    const restaurant = await this.restaurantRepository.findById(restaurantId);
    if (!restaurant) {
      throw createError('Restaurant not found', 404);
    }

    if (restaurant.branchManager?.toString() !== userId.toString() && userRole !== 'ADMIN') {
      throw createError('Not authorized to manage this restaurant menu', 403);
    }

    const deleted = await this.menuRepository.deleteMenuItem(itemId);
    if (!deleted) {
      throw createError('Menu item not found', 404);
    }

    sendSuccess(res, null, 'Menu item deleted successfully');
  });

  getFullMenu = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { restaurantId } = req.params;

    // If restaurantId is provided, get restaurant-specific menu
    if (restaurantId) {
      const fullMenu = await this.menuRepository.getFullMenu(restaurantId);
      sendSuccess(res, fullMenu, 'Full menu retrieved successfully');
      return;
    }

    console.log('🔍 [SERVER MENU DEBUG] Getting system-wide menu...');

    // If no restaurantId (system-wide menu), get all categories with products
    const categories = await this.menuRepository.findAllCategories();
    console.log('🔍 [SERVER MENU DEBUG] Found categories:', categories.length);
    console.log('🔍 [SERVER MENU DEBUG] Categories details:', categories.map(c => ({ id: c._id, name: c.name })));

    if (categories.length === 0) {
      console.log('🔍 [SERVER MENU DEBUG] No categories found at all');
      sendSuccess(res, { categories: [] }, 'Full menu retrieved successfully');
      return;
    }

    const categoriesWithProducts = await Promise.all(
      categories.map(async (category) => {
        console.log('🔍 [SERVER MENU DEBUG] Processing category:', category.name, category._id);

        // Get products for this category
        const products = await this.menuRepository.findAllProducts(
          { category: category._id, isAvailable: true },
          1,
          100 // Get up to 100 products per category
        );

        console.log('🔍 [SERVER MENU DEBUG] Found products for category', category.name + ':', products.length);

        if (products.length > 0) {
          console.log('🔍 [SERVER MENU DEBUG] Sample product:', {
            id: products[0]._id,
            name: products[0].name,
            isAvailable: products[0].isAvailable,
            deletedAt: products[0].deletedAt
          });
        }

        return {
          _id: category._id,
          name: category.name,
          description: category.description,
          products: products.filter(p => !p.deletedAt) // Exclude soft-deleted products
        };
      })
    );

    const finalResult = { categories: categoriesWithProducts };
    console.log('🔍 [SERVER MENU DEBUG] Final result categories count:', finalResult.categories.length);
    console.log('🔍 [SERVER MENU DEBUG] Final result structure:', JSON.stringify(finalResult, null, 2));
    console.log('🔍 [SERVER MENU DEBUG] Total products across all categories:',
      finalResult.categories.reduce((sum, cat) => sum + cat.products.length, 0));
    
    sendSuccess(res, finalResult, 'Full menu retrieved successfully');
  });

  getPopularItems = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { restaurantId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const popularItems = await this.menuRepository.getPopularItems(restaurantId, limit);

    sendSuccess(res, popularItems, 'Popular items retrieved successfully');
  });

  // Admin methods for system-wide menu management
  getAllProducts = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { search, category, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const filter: any = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (category && category !== 'all') {
      filter.category = category;
    }

    const products = await this.menuRepository.findAllProducts(filter, pageNum, limitNum);
    const total = await this.menuRepository.countProducts(filter);

    const response = {
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };

    sendSuccess(res, response, 'Products retrieved successfully');
  });

  getAllCategories = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    console.log('🔍 [DEBUG] getAllCategories called!'); 
    console.log('🔍 [DEBUG] Auth token present:', !!req.headers.authorization);
    console.log('🔍 [DEBUG] User ID:', req.user?._id);
    console.log('🔍 [DEBUG] User role:', req.user?.role);

    console.log('🔍 [DEBUG] Starting category query...');
    const categories = await this.menuRepository.findAllCategories();
    console.log('🔍 [DEBUG] Found categories:', categories.length);

    // Add product count for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const productCount = await this.menuRepository.countProducts({ category: category._id, deletedAt: null });
        return {
          ...category.toObject(),
          productCount
        };
      })
    );

    console.log('🔍 [DEBUG] Categories with product counts:', categoriesWithCounts.map(c => ({ name: c.name, productCount: c.productCount })));

    sendSuccess(res, categoriesWithCounts, 'Categories retrieved successfully');
  });

  createAdminCategory = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const categoryData = req.body;
    const category = await this.menuRepository.createCategory(categoryData);
    sendSuccess(res, category, 'Category created successfully', 201);
  });

  updateAdminCategory = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const categoryData = req.body;
    const category = await this.menuRepository.updateCategory(id, categoryData);
    sendSuccess(res, category, 'Category updated successfully');
  });

  createAdminProduct = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const productData = req.body;
    const product = await this.menuRepository.createProduct(productData);
    sendSuccess(res, product, 'Product created successfully', 201);
  });

  updateAdminProduct = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const productData = req.body;
    const product = await this.menuRepository.updateProduct(id, productData);
    sendSuccess(res, product, 'Product updated successfully');
  });
}
