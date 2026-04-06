import { Request, Response, NextFunction } from 'express';
import { MenuRepository } from './menu.repository';
import BranchProduct from '@/models/BranchProduct';
import { RestaurantRepository } from '../restaurant/restaurant.repository';
import { IAuthRequest, sendSuccess, sendError, asyncHandler } from '@/utils';
import { createError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { ProductSize } from '@/models/ProductSize';
import { Product } from '@/models/Product';

const branchProductModel = BranchProduct as any;

console.log('✅ MenuController file LOADED');

export class MenuController {
  private menuRepository: MenuRepository;
  private restaurantRepository: RestaurantRepository;

  constructor() {
    this.menuRepository = new MenuRepository();
    this.restaurantRepository = new RestaurantRepository();
  }

  private syncProductBasePriceFromSizes = async (productId: any): Promise<void> => {
    const sizes = await ProductSize.find({
      product: productId,
      deletedAt: null,
      isAvailable: true,
    })
      .select('price isDefault')
      .lean();

    if (!sizes || sizes.length === 0) return;

    let computed: number | undefined;
    for (const s of sizes as any[]) {
      const price = typeof s.price === 'number' && !Number.isNaN(s.price) ? s.price : 0;
      if (s.isDefault) {
        computed = price;
        break;
      }
      if (computed === undefined) computed = price;
      else computed = Math.min(computed, price);
    }

    if (computed === undefined) return;

    await Product.updateOne(
      { _id: productId },
      { $set: { price: computed, hasSizes: true } }
    );
  };

  private syncProductSizes = async (
    productId: any,
    sizes: Array<{ sizeId?: string; sizeName?: string; price?: number; isDefault?: boolean }> | undefined
  ): Promise<void> => {
    if (!sizes || !Array.isArray(sizes) || sizes.length === 0) return;

    console.log('🔍 [SERVER PRODUCT SIZES] Sync start:', {
      productId: String(productId),
      sizesCount: sizes.length,
      sizes
    });

    const normalized = sizes
      .filter((s) => !!s?.sizeId)
      .map((s) => ({
        sizeId: String(s.sizeId),
        price: typeof s.price === 'number' && !Number.isNaN(s.price) ? s.price : 0,
        isDefault: !!s.isDefault,
      }));

    if (normalized.length === 0) return;

    const defaultSizeId = normalized.find((s) => s.isDefault)?.sizeId || normalized[0].sizeId;
    const activeSizeIds = normalized.map((s) => s.sizeId);

    // Soft-delete any previously assigned sizes that are not present anymore
    await ProductSize.updateMany(
      { product: productId, size: { $nin: activeSizeIds }, deletedAt: null },
      { deletedAt: new Date(), isAvailable: false }
    );

    // Upsert sizes and enforce exactly one default
    for (const s of normalized) {
      await ProductSize.findOneAndUpdate(
        { product: productId, size: s.sizeId },
        {
          product: productId,
          size: s.sizeId,
          price: s.price,
          isDefault: s.sizeId === defaultSizeId,
          isAvailable: true,
          deletedAt: null,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    console.log('✅ [SERVER PRODUCT SIZES] Sync complete:', {
      productId: String(productId),
      activeSizeIds
    });

    await this.syncProductBasePriceFromSizes(productId);
  };

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
    const { branchId, branch } = req.query as any;

    // If restaurantId is provided, get restaurant-specific menu
    if (restaurantId) {
      const fullMenu = await this.menuRepository.getFullMenu(restaurantId);
      sendSuccess(res, fullMenu, 'Full menu retrieved successfully');
      return;
    }

    console.log('🔍 [SERVER MENU DEBUG] Getting system-wide menu...');

    const branchFilter = (branchId || branch) as string | undefined;

    // If no restaurantId (system-wide menu), get all categories with products
    const allCategories = await this.menuRepository.findAllCategories();
    const categories = allCategories.filter((category: any) => {
      if (category?.isActive === false) {
        return false;
      }

      if (!branchFilter || branchFilter === 'all') {
        return true;
      }

      const categoryBranchIds = Array.isArray((category as any)?.branchId)
        ? (category as any).branchId.map((branchId: any) => String(branchId))
        : [];

      return categoryBranchIds.length === 0 || categoryBranchIds.includes(String(branchFilter));
    });
    console.log('🔍 [SERVER MENU DEBUG] Found categories:', categories.length);
    console.log('🔍 [SERVER MENU DEBUG] Categories details:', categories.map(c => ({ id: c._id, name: c.name })));

    if (categories.length === 0) {
      console.log('🔍 [SERVER MENU DEBUG] No categories found at all');
      sendSuccess(res, { categories: [] }, 'Full menu retrieved successfully');
      return;
    }

    console.log('🔍 [SERVER MENU DEBUG] branchId param:', branchId, 'branch param:', branch, 'resolved branchFilter:', branchFilter);

    // If a branch is selected, get activated product IDs for that branch
    let activatedProductIds: string[] | null = null;
    if (branchFilter && branchFilter !== 'all') {
      const activations = await BranchProduct.find({
        branchId: branchFilter,
        isActive: true
      }).lean();
      activatedProductIds = activations.map(a => String(a.productId));
      console.log('🔍 [SERVER MENU DEBUG] Activated products for branch:', activatedProductIds.length, 'IDs:', activatedProductIds.slice(0, 5));
      
      // DEBUG: Show all BranchProduct records for this branch (including inactive)
      const allActivations = await BranchProduct.find({ branchId: branchFilter }).lean();
      console.log('🔍 [SERVER MENU DEBUG] All BranchProduct records for branch:', allActivations.length);
      allActivations.forEach(a => {
        console.log('🔍 [SERVER MENU DEBUG] BranchProduct:', {
          productId: String(a.productId),
          isActive: a.isActive,
          _id: String(a._id)
        });
      });
    } else {
      console.log('🔍 [SERVER MENU DEBUG] No branch filter - showing ALL products');
    }

    const categoriesWithProducts = await Promise.all(
      categories.map(async (category) => {
        console.log('🔍 [SERVER MENU DEBUG] Processing category:', category.name, category._id);

        // Get products for this category
        // Treat missing flags as enabled (older records may not have persisted isAvailable/isActive)
        const productFilter: any = {
          category: category._id,
          $and: [
            { $or: [{ isAvailable: true }, { isAvailable: { $exists: false } }] },
            { $or: [{ isActive: true }, { isActive: { $exists: false } }] },
          ],
        };

        // If branch is selected, filter by activated products
        if (activatedProductIds !== null) {
          productFilter._id = { $in: activatedProductIds };
        }
        
        // ALSO: If branch is selected, exclude products assigned to OTHER branches
        // Products can have branchId field indicating they belong to a specific branch
        if (branchFilter && branchFilter !== 'all') {
          productFilter.$and.push({
            $or: [
              { branchId: { $exists: false } }, // No branch assigned (global product)
              { branchId: null },               // Explicitly null (global product)
              { branchId: branchFilter }        // Assigned to this specific branch
            ]
          });
        }

        console.log('🔍 [SERVER MENU DEBUG] Product filter for category', category.name + ':', JSON.stringify(productFilter));
        console.log('🔍 [SERVER MENU DEBUG] Activated IDs filter:', activatedProductIds ? `active, count: ${activatedProductIds.length}` : 'null (showing all)');

        const products = await this.menuRepository.findAllProducts(
          productFilter,
          1,
          100 // Get up to 100 products per category
        );

        console.log('🔍 [SERVER MENU DEBUG] Found products for category', category.name + ':', products.length);

        // Debug: If no products found but we have activated IDs, check if products exist at all
        if (products.length === 0 && activatedProductIds && activatedProductIds.length > 0) {
          // Check if any of the activated products exist in this category without the status filters
          const debugFilter: any = { category: category._id, _id: { $in: activatedProductIds } };
          const debugProducts = await this.menuRepository.findAllProducts(debugFilter, 1, 10);
          console.log('🔍 [SERVER MENU DEBUG] Debug - products in category without status filter:', debugProducts.length);
          if (debugProducts.length > 0) {
            console.log('🔍 [SERVER MENU DEBUG] Sample product status:', {
              id: debugProducts[0]._id,
              name: debugProducts[0].name,
              isAvailable: debugProducts[0].isAvailable,
              isActive: debugProducts[0].isActive,
              category: debugProducts[0].category
            });
          }
        }

        if (products.length > 0) {
          console.log('🔍 [SERVER MENU DEBUG] Sample product:', {
            id: products[0]._id,
            name: products[0].name,
            price: products[0].price,
            isAvailable: products[0].isAvailable,
            deletedAt: products[0].deletedAt
          });
        }

        return {
          _id: category._id,
          name: category.name,
          description: category.description,
          imageUrl: (category as any).imageUrl,
          displayOrder: (category as any).displayOrder,
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
    const { search, category, page = '1', limit = '10', branchId, branch } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const filter: any = {};
    const userRole = req.user?.role;
    const userBranch = req.user?.assignedBranch as any;
    const assignedBranchId = userBranch?._id?.toString() || userBranch?.toString?.() || '';

    // Global products: no branchId filter by default
    // Branch managers see ALL products globally, but with activation status for their branch
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (category && category !== 'all') {
      filter.category = category;
    }

    // Only apply branchId filter for non-manager roles if explicitly requested
    const branchFilter = (branchId || branch) as string | undefined;
    if (branchFilter && branchFilter !== 'all' && userRole !== 'BRANCH_MANAGER') {
      filter.branchId = branchFilter;
    }

    const products = await this.menuRepository.findAllProducts(filter, pageNum, limitNum);
    const total = await this.menuRepository.countProducts(filter);

    // For branch managers, attach activation status for their branch
    let productsWithActivation = products;
    if (userRole === 'BRANCH_MANAGER' && assignedBranchId) {
      const activations = await BranchProduct.find({
        branchId: assignedBranchId,
        productId: { $in: products.map(p => p._id) }
      }).lean();

      const activationMap = new Map(activations.map(a => [String(a.productId), a]));

      productsWithActivation = products.map(product => {
        const activation = activationMap.get(String(product._id));
        return {
          ...product.toObject ? product.toObject() : product,
          isActivatedForBranch: activation?.isActive ?? false,
          branchActivationId: activation?._id || null,
        };
      });
    }

    const response = {
      products: productsWithActivation,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      branchId: assignedBranchId || null,
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
        // Count products by category ObjectId
        const productCount = await this.menuRepository.countProducts({
          category: category._id,
          deletedAt: null
        });
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
    console.log('🔍 [DEBUG] updateAdminCategory - ID:', id);
    console.log('🔍 [DEBUG] updateAdminCategory - Body:', JSON.stringify(categoryData, null, 2));
    const category = await this.menuRepository.updateCategory(id, categoryData);
    sendSuccess(res, category, 'Category updated successfully');
  });

  createAdminProduct = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { sizes, ...productData } = req.body as any;

    // Branch managers create global products (no branchId restriction)
    // The product will be auto-activated for their branch
    const userBranch = req.user?.assignedBranch as any;
    const assignedBranchId = userBranch?._id?.toString() || userBranch?.toString?.() || '';

    // If sizes are provided, this product supports sizes.
    if (Array.isArray(sizes) && sizes.length > 0) {
      productData.hasSizes = true;
    }

    const product = await this.menuRepository.createProduct(productData);

    await this.syncProductSizes(product?._id, sizes);

    // Auto-activate product for the branch manager's branch
    if (req.user?.role === 'BRANCH_MANAGER' && assignedBranchId && product?._id) {
      await branchProductModel.activateProductForBranch(
        assignedBranchId,
        String(product._id),
        String(req.user._id)
      );
    }

    sendSuccess(res, product, 'Product created successfully', 201);
  });

  updateAdminProduct = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { sizes, ...productData } = req.body as any;

    // Enforce branch assignment for branch managers (cannot move products across branches)
    if (req.user?.role === 'BRANCH_MANAGER') {
      const userBranch = req.user?.assignedBranch as any;
      const assignedBranchId = userBranch?._id?.toString() || userBranch?.toString?.() || '';
      if (!assignedBranchId) {
        throw createError('Access denied. No branch assigned to this user.', 403);
      }
      productData.branchId = assignedBranchId;
    }

    // If sizes are provided, this product supports sizes.
    if (Array.isArray(sizes) && sizes.length > 0) {
      productData.hasSizes = true;
    }
    
    console.log('🔍 [SERVER UPDATE PRODUCT] ID:', id);
    console.log('🔍 [SERVER UPDATE PRODUCT] Incoming data:', JSON.stringify(productData, null, 2));
    console.log('🔍 [SERVER UPDATE PRODUCT] Price received:', productData.price, typeof productData.price);
    
    const product = await this.menuRepository.updateProduct(id, productData);

    await this.syncProductSizes(product?._id || id, sizes);
    
    console.log('🔍 [SERVER UPDATE PRODUCT] Updated product:', {
      id: product?._id,
      name: product?.name,
      price: product?.price,
      hasSizes: product?.hasSizes
    });
    
    sendSuccess(res, product, 'Product updated successfully');
  });

  deleteAdminProduct = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    console.log('🔍 [SERVER DELETE PRODUCT] ID:', id);
    
    const deleted = await this.menuRepository.deleteProduct(id);
    
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }
    
    sendSuccess(res, null, 'Product deleted successfully');
  });

  // Branch Product Activation - Activate a product for a branch
  activateProductForBranch = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { productId } = req.params;
    const userId = req.user?._id;
    let branchId = req.body.branchId;

    // Branch managers can only activate for their own branch
    if (req.user?.role === 'BRANCH_MANAGER') {
      const userBranch = req.user?.assignedBranch as any;
      branchId = userBranch?._id?.toString() || userBranch?.toString?.() || '';
      if (!branchId) {
        throw createError('Access denied. No branch assigned to this user.', 403);
      }
    }

    if (!branchId) {
      throw createError('Branch ID is required', 400);
    }

    const activation = await branchProductModel.activateProductForBranch(branchId, productId, String(userId));

    sendSuccess(res, activation, 'Product activated for branch successfully', 200);
  });

  // Branch Product Activation - Deactivate a product for a branch
  deactivateProductForBranch = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { productId } = req.params;
    const userId = req.user?._id;
    let branchId = req.body.branchId;

    // Branch managers can only deactivate for their own branch
    if (req.user?.role === 'BRANCH_MANAGER') {
      const userBranch = req.user?.assignedBranch as any;
      branchId = userBranch?._id?.toString() || userBranch?.toString?.() || '';
      if (!branchId) {
        throw createError('Access denied. No branch assigned to this user.', 403);
      }
    }

    if (!branchId) {
      throw createError('Branch ID is required', 400);
    }

    const deactivation = await branchProductModel.deactivateProductForBranch(branchId, productId, String(userId));

    sendSuccess(res, deactivation, 'Product deactivated for branch successfully', 200);
  });

  // Toggle product activation for a branch
  toggleProductActivation = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { productId } = req.params;
    const userId = req.user?._id;
    let branchId = req.body.branchId;

    // Branch managers can only toggle for their own branch
    if (req.user?.role === 'BRANCH_MANAGER') {
      const userBranch = req.user?.assignedBranch as any;
      branchId = userBranch?._id?.toString() || userBranch?.toString?.() || '';
      if (!branchId) {
        throw createError('Access denied. No branch assigned to this user.', 403);
      }
    }

    if (!branchId) {
      throw createError('Branch ID is required', 400);
    }

    // Check current activation status
    const currentActivation = await BranchProduct.findOne({ branchId, productId });

    let result;
    if (currentActivation?.isActive) {
      result = await branchProductModel.deactivateProductForBranch(branchId, productId, String(userId));
    } else {
      result = await branchProductModel.activateProductForBranch(branchId, productId, String(userId));
    }

    sendSuccess(res, result, `Product ${currentActivation?.isActive ? 'deactivated' : 'activated'} for branch successfully`, 200);
  });
}
