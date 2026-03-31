import { Router } from 'express';
import { MenuController } from './menu.controller';
import { authenticate, authorize } from '@/middleware/auth';
import { validate, validateParams } from '@/middleware/validation';
import Joi from 'joi';

const router = Router() as any;
const menuController = new MenuController();

// Validation schemas
const createCategorySchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  description: Joi.string().max(200).optional().allow(''),
  displayOrder: Joi.number().min(0).optional(),
  isActive: Joi.boolean().optional(),
  imageUrl: Joi.string().optional().allow(''),
  branchId: Joi.string().optional(),
}).unknown(true);

const updateCategorySchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  description: Joi.string().max(200).optional().allow(''),
  displayOrder: Joi.number().min(0).optional(),
  isActive: Joi.boolean().optional(),
  imageUrl: Joi.string().optional().allow(''),
  branchId: Joi.string().optional(),
}).unknown(true);

const reorderCategoriesSchema = Joi.object({
  categories: Joi.array().items(
    Joi.object({
      categoryId: Joi.string().required(),
      displayOrder: Joi.number().min(0).required(),
    })
  ).required(),
});

const createMenuItemSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().min(10).max(500).required(),
  price: Joi.number().min(0).required(),
  category: Joi.string().required(),
  imageUrl: Joi.string().max(500).optional().allow('', null),
  image: Joi.string().max(500).optional().allow('', null),
  images: Joi.array().items(Joi.string().uri()).optional(),
  ingredients: Joi.array().items(Joi.string()).optional(),
  allergens: Joi.array().items(Joi.string().valid('Gluten', 'Dairy', 'Nuts', 'Soy', 'Eggs', 'Shellfish', 'Fish', 'Peanuts', 'Sesame', 'Other')).optional(),
  isVegetarian: Joi.boolean().optional(),
  isVegan: Joi.boolean().optional(),
  isGlutenFree: Joi.boolean().optional(),
  isSpicy: Joi.boolean().optional(),
  isAvailable: Joi.boolean().optional(),
  preparationTime: Joi.number().min(1).required(),
  nutritionInfo: Joi.object({
    calories: Joi.number().min(0).optional(),
    protein: Joi.number().min(0).optional(),
    carbs: Joi.number().min(0).optional(),
    fat: Joi.number().min(0).optional(),
  }).optional(),
  // Product sizes - optional array of size references
  sizes: Joi.array().items(
    Joi.object({
      sizeId: Joi.string().optional(),
      sizeName: Joi.string().optional(),
      price: Joi.number().min(0).optional(),
      isDefault: Joi.boolean().optional(),
    })
  ).optional(),
  // Branch assignment
  branchId: Joi.string().optional(),
});

const updateMenuItemSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().min(10).max(500).optional(),
  price: Joi.number().min(0).optional(),
  category: Joi.string().optional(),
  imageUrl: Joi.string().max(500).optional().allow('', null),
  image: Joi.string().max(500).optional().allow('', null),
  images: Joi.array().items(Joi.string().uri()).optional(),
  ingredients: Joi.array().items(Joi.string()).optional(),
  allergens: Joi.array().items(Joi.string().valid('Gluten', 'Dairy', 'Nuts', 'Soy', 'Eggs', 'Shellfish', 'Fish', 'Peanuts', 'Sesame', 'Other')).optional(),
  isVegetarian: Joi.boolean().optional(),
  isVegan: Joi.boolean().optional(),
  isGlutenFree: Joi.boolean().optional(),
  isSpicy: Joi.boolean().optional(),
  isAvailable: Joi.boolean().optional(),
  preparationTime: Joi.number().min(1).optional(),
  nutritionInfo: Joi.object({
    calories: Joi.number().min(0).optional(),
    protein: Joi.number().min(0).optional(),
    carbs: Joi.number().min(0).optional(),
    fat: Joi.number().min(0).optional(),
  }).optional(),
  // Product sizes - optional array of size references
  sizes: Joi.array().items(
    Joi.object({
      sizeId: Joi.string().optional(),
      sizeName: Joi.string().optional(),
      price: Joi.number().min(0).optional(),
      isDefault: Joi.boolean().optional(),
    })
  ).optional(),
  // Branch assignment
  branchId: Joi.string().optional(),
});

const menuItemParamsSchema = Joi.object({
  restaurantId: Joi.string().required(),
  itemId: Joi.string().required(),
});

const categoryParamsSchema = Joi.object({
  restaurantId: Joi.string().required(),
  categoryId: Joi.string().required(),
});

// Admin routes - System wide menu management (MUST be before public routes)
router.get('/admin/products', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'SUPER_ADMIN'), menuController.getAllProducts);
router.post('/admin/products', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'SUPER_ADMIN'), menuController.createAdminProduct);
router.put('/admin/products/:id', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'SUPER_ADMIN'), validate(updateMenuItemSchema), menuController.updateAdminProduct);
router.delete('/admin/products/:id', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'SUPER_ADMIN'), menuController.deleteAdminProduct);

// Branch product activation routes
router.post('/admin/products/:productId/activate', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'SUPER_ADMIN'), menuController.activateProductForBranch);
router.post('/admin/products/:productId/deactivate', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'SUPER_ADMIN'), menuController.deactivateProductForBranch);
router.post('/admin/products/:productId/toggle-activation', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'SUPER_ADMIN'), menuController.toggleProductActivation);

router.get('/admin/categories', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'SUPER_ADMIN'), menuController.getAllCategories);
router.post('/admin/categories', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'SUPER_ADMIN'), validate(createCategorySchema), menuController.createAdminCategory);
router.put('/admin/categories/:id', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'SUPER_ADMIN'), validate(updateCategorySchema), menuController.updateAdminCategory);

// Public routes
router.get('/', menuController.getFullMenu);
router.get('/:restaurantId/categories', menuController.getCategories);
router.get('/:restaurantId/items', menuController.getMenuItems);
router.get('/:restaurantId/items/:itemId', validateParams(menuItemParamsSchema), menuController.getMenuItemById);
router.get('/:restaurantId/full-menu', menuController.getFullMenu);
router.get('/:restaurantId/popular-items', menuController.getPopularItems);

export default router;
