import { Router, Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '@/middleware/auth';
import { validate } from '@/middleware/validation';
import Joi from 'joi';

const router = Router() as any;
const authController = new AuthController();

// Validation schemas
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('CUSTOMER', 'RIDER', 'ADMIN', 'WAITER', 'CHEF', 'BRANCH_MANAGER', 'SUPER_ADMIN').optional(),
  phoneNumber: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
  profileImage: Joi.string().optional(),
  avatar: Joi.string().optional(),
  // Role-specific fields
  vehicleNumber: Joi.string().max(50).optional(),
  vehicleType: Joi.string().max(50).optional(),
  assignedBranchId: Joi.string().optional(),
  branchId: Joi.string().optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().optional(),
});

const requestPasswordResetSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
});

const impersonateSchema = Joi.object({
  token: Joi.string().required(),
});

// Public routes
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
// Browser GET (e.g. opening the URL) — login requires POST
router.get('/login', (_req: Request, res: Response) => {
  res.status(405).json({
    success: false,
    message: 'Use POST /api/auth/login with JSON body { email, password }',
    statusCode: 405,
  });
});
router.post('/refresh-token', validate(refreshTokenSchema), authController.refreshToken);
router.post('/request-password-reset', validate(requestPasswordResetSchema), authController.requestPasswordReset);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/resend-verification', validate(requestPasswordResetSchema), authController.resendVerificationEmail);
router.post('/impersonate', validate(impersonateSchema), authController.impersonate);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);
router.post('/exit-impersonate', authenticate, authController.exitImpersonate);

export default router;
