import { Router } from 'express';
import { FavoriteController } from './favorite.controller';
import { authenticate, authorize } from '@/middleware/auth';
import { validate, validateParams } from '@/middleware/validation';
import Joi from 'joi';

const router = Router() as any;
const favoriteController = new FavoriteController();

// Validation schemas
const addFavoriteSchema = Joi.object({
  branchId: Joi.string().required()
});

const branchIdParamSchema = Joi.object({
  branchId: Joi.string().required()
});

// Protected routes - Customers only
router.post('/', authenticate, authorize('CUSTOMER'), validate(addFavoriteSchema), favoriteController.addFavorite);
router.delete('/:branchId', authenticate, authorize('CUSTOMER'), validateParams(branchIdParamSchema), favoriteController.removeFavorite);
router.get('/', authenticate, authorize('CUSTOMER'), favoriteController.getFavorites);
router.get('/:branchId/check', authenticate, authorize('CUSTOMER'), validateParams(branchIdParamSchema), favoriteController.checkFavorite);

export default router;
