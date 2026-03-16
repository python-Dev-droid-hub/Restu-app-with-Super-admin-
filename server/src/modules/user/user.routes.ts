import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticate, authorize } from '@/middleware/auth';
import { validate } from '@/middleware/validation';
import Joi from 'joi';


const router = Router() as any;
const userController = new UserController();

// Validation schemas
const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
  avatar: Joi.string().optional(),
  image: Joi.string().optional(), // Also accept 'image' for compatibility
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
});

const updateLocationSchema = Joi.object({
  longitude: Joi.number().required(),
  latitude: Joi.number().required(),
});

const updateDutySchema = Joi.object({
  onDuty: Joi.boolean().required(),
});

// Public routes (none for user module)

// Protected routes
router.get('/profile', authenticate, userController.getProfile);
router.put('/profile', authenticate, validate(updateProfileSchema), userController.updateProfile);
router.patch('/profile', authenticate, validate(updateProfileSchema), userController.updateProfile);
router.patch('/profile/image', authenticate, userController.updateProfileImage);
router.put('/change-password', authenticate, validate(changePasswordSchema), userController.changePassword);

// Rider routes
router.put('/rider/location', authenticate, authorize('RIDER', 'SUPER_ADMIN'), validate(updateLocationSchema), userController.updateRiderLocation);
router.put('/rider/duty', authenticate, authorize('RIDER', 'SUPER_ADMIN'), validate(updateDutySchema), userController.updateRiderDutyStatus);
router.get('/rider/status', authenticate, authorize('RIDER', 'SUPER_ADMIN'), userController.getRiderStatus);

// Admin only routes
router.get('/', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'SUPER_ADMIN'), userController.getAllUsers);
router.get('/:id', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'SUPER_ADMIN'), userController.getUserById);
router.put('/:id', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'SUPER_ADMIN'), userController.updateUser);
router.put('/:id/activate', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'SUPER_ADMIN'), userController.activateUser);
router.put('/:id/deactivate', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'SUPER_ADMIN'), userController.deactivateUser);
router.delete('/:id', authenticate, authorize('ADMIN', 'BRANCH_MANAGER', 'SUPER_ADMIN'), userController.deleteUser);

export default router;
