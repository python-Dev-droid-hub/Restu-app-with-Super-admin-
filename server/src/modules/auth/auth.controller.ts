import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { IAuthRequest, sendSuccess, sendError, asyncHandler } from '@/utils';
import { createError } from '@/utils';
import { parseDurationToMs } from '@/utils/tokenTtl';
import { getAuthCookieOptions } from '@/config/cookies';
import { verifyImpersonationToken } from '@/superadmin/services/impersonation.service';
import { logTenantActivity } from '@/superadmin/utils/helpers';
import { generateTokenPair } from '@/utils/jwt';
import { User } from '@/models/User';
import { Tenant } from '@/superadmin/models';
import { IJWTPayload } from '@/types';
import {
  assertPlanCanCreateStaff,
  assertRoleAllowedForPlan,
} from '@/superadmin/services/planEnforcement.service';
import jwt from 'jsonwebtoken';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  private setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
    const baseOptions = getAuthCookieOptions();

    const accessMaxAge = parseDurationToMs(process.env.JWT_EXPIRE || '30m', 30 * 60 * 1000);
    const refreshMaxAge = parseDurationToMs(
      process.env.JWT_REFRESH_EXPIRE || '7d',
      7 * 24 * 60 * 60 * 1000
    );

    res.cookie('accessToken', tokens.accessToken, {
      ...baseOptions,
      maxAge: accessMaxAge,
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      ...baseOptions,
      maxAge: refreshMaxAge,
    });
  }

  private clearAuthCookies(res: Response) {
    const baseOptions = getAuthCookieOptions();

    res.clearCookie('accessToken', baseOptions);
    res.clearCookie('refreshToken', baseOptions);
  }

  register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { 
      name, 
      email, 
      password, 
      role, 
      phoneNumber, 
      profileImage, 
      avatar,
      vehicleNumber,
      vehicleType,
      assignedBranchId,
      branchId
    } = req.body;

    // Check if trying to create a privileged role
    const adminOnlyRoles = ['ADMIN', 'BRANCH_MANAGER', 'SUPER_ADMIN'];
    const branchStaffRoles = ['CHEF', 'WAITER', 'RIDER'];
    const privilegedRoles = [...adminOnlyRoles, ...branchStaffRoles];
    const requestedRole = (role || 'CUSTOMER').toUpperCase();
    let creatorTenantId: string | undefined;
    
    if (privilegedRoles.includes(requestedRole)) {
      // Only authenticated users can create privileged roles
      const authHeader = req.header('Authorization');
      const cookieToken = (req as any).cookies?.accessToken;
      const token = cookieToken || authHeader?.replace('Bearer ', '');
      
      if (!token) {
        throw createError('Access denied. Authentication required to create users with privileged roles.', 401);
      }
      
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        
        // SUPER_ADMIN can create any role
        if (decoded.role === 'SUPER_ADMIN') {
          console.log(`SUPER_ADMIN ${decoded.userId} is creating a ${requestedRole} user`);
          const User = require('@/models/User').User;
          const creator = await User.findById(decoded.userId).select('tenantId');
          creatorTenantId = decoded.tenantId || creator?.tenantId?.toString();
        }
        else if (decoded.role === 'ADMIN') {
          if (requestedRole === 'SUPER_ADMIN') {
            throw createError('Access denied. Cannot create SUPER_ADMIN users.', 403);
          }
          const User = require('@/models/User').User;
          const creator = await User.findById(decoded.userId).select('tenantId');
          creatorTenantId = decoded.tenantId || creator?.tenantId?.toString();
          if (!creatorTenantId) {
            throw createError('Access denied. Tenant context required.', 403);
          }
          await assertPlanCanCreateStaff(creatorTenantId, requestedRole);
        }
        // BRANCH_MANAGER can only create CHEF, WAITER, RIDER for their branch
        else if (decoded.role === 'BRANCH_MANAGER') {
          if (adminOnlyRoles.includes(requestedRole)) {
            throw createError('Access denied. BRANCH_MANAGER cannot create admin roles.', 403);
          }
          
          // Debug logging
          console.log('[AUTH] BRANCH_MANAGER creating user:', {
            decoded,
            assignedBranchInToken: decoded.assignedBranch,
            branchInToken: decoded.branch,
            requestedAssignedBranchId: assignedBranchId,
            requestedBranchId: branchId
          });
          
          // Ensure the user is being assigned to the manager's branch
          let managerBranchId = decoded.assignedBranch?.toString() || decoded.branch?.toString();
          
          // If assignedBranch is an object (populated), extract the _id
          if (managerBranchId && managerBranchId.includes('_id:')) {
            const match = managerBranchId.match(/_id:\s*new\s*ObjectId\('([^']+)'\)/);
            if (match) {
              managerBranchId = match[1];
            }
          }
          
          // If branch not in token, fetch from DB
          if (!managerBranchId) {
            // Fetch user from DB to get assignedBranch
            const User = require('@/models/User').User;
            const user = await User.findById(decoded.userId).select('assignedBranch');
            const userBranch = user?.assignedBranch as any;
            managerBranchId = userBranch?._id?.toString() || userBranch?.toString() || '';
          }
          
          const requestedBranchId = (assignedBranchId || branchId)?.toString();
          
          console.log('[AUTH] Branch comparison:', { managerBranchId, requestedBranchId });
          
          if (!managerBranchId) {
            throw createError('Access denied. Manager has no assigned branch.', 403);
          }
          
          if (!requestedBranchId || requestedBranchId !== managerBranchId) {
            throw createError('Access denied. You can only create users for your assigned branch.', 403);
          }
          console.log(`[AUTH] BRANCH_MANAGER ${decoded.userId} creating ${requestedRole} for branch ${managerBranchId}`);
          const User = require('@/models/User').User;
          const creator = await User.findById(decoded.userId).select('tenantId');
          creatorTenantId = decoded.tenantId || creator?.tenantId?.toString();
          if (creatorTenantId) {
            await assertPlanCanCreateStaff(creatorTenantId, requestedRole);
          }
        }
        else {
          throw createError('Access denied. Only ADMIN, SUPER_ADMIN or BRANCH_MANAGER can create users with privileged roles.', 403);
        }
      } catch (error: any) {
        if (error?.message?.includes('Access denied')) {
          throw error;
        }
        throw createError('Access denied. Invalid token or insufficient permissions.', 401);
      }
    }

    const { user, tokens } = await this.authService.register({
      name,
      email,
      password,
      role,
      phoneNumber,
      profileImage: profileImage || avatar,
      vehicleNumber,
      vehicleType,
      assignedBranchId: assignedBranchId || branchId,
      tenantId: creatorTenantId,
    });

    // Check if this is an admin creating a user (vs self-registration)
    const authHeader = req.header('Authorization');
    const cookieToken = (req as any).cookies?.accessToken;
    const existingToken = cookieToken || authHeader?.replace('Bearer ', '');
    
    // Only set auth cookies for self-registration (no existing token)
    if (!existingToken) {
      this.setAuthCookies(res, tokens);
    }

    const verificationToken = this.authService.generateEmailVerificationToken(user._id.toString());

    sendSuccess(res, {
      user: user.getPublicProfile(),
      tokens: (!existingToken && process.env.NODE_ENV !== 'production') ? tokens : undefined,
      verificationToken: process.env.NODE_ENV === 'production' ? undefined : verificationToken,
    }, 'User registered successfully', 201);
  });

  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    const { user, tokens } = await this.authService.login(email, password);

    this.setAuthCookies(res, tokens);

    sendSuccess(res, {
      user,
      tokens,
    }, 'Login successful');
  });

  refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const cookieToken = (req as any).cookies?.refreshToken as string | undefined;
    const { refreshToken: bodyToken } = req.body;
    const refreshToken = cookieToken || bodyToken;

    if (!refreshToken) {
      throw createError('Refresh token is required', 400);
    }

    const { tokens } = await this.authService.refreshToken(refreshToken);

    this.setAuthCookies(res, tokens);

    sendSuccess(res, { tokens }, 'Token refreshed successfully');
  });

  logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // TODO: Implement token blacklisting if needed
    // For now, we'll just send a success response
    this.clearAuthCookies(res);
    sendSuccess(res, null, 'Logout successful');
  });

  verifyEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;

    await this.authService.verifyEmailToken(token);

    sendSuccess(res, null, 'Email verified successfully');
  });

  requestPasswordReset = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;

    const { resetToken } = await this.authService.requestPasswordReset(email);

    sendSuccess(
      res,
      process.env.NODE_ENV === 'production' ? null : { resetToken },
      'Password reset initiated if account exists'
    );
  });

  resendVerificationEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;
    const { verificationToken } = await this.authService.resendVerificationEmail(email);

    sendSuccess(
      res,
      process.env.NODE_ENV === 'production' ? null : { verificationToken },
      'Verification initiated if account exists'
    );
  });

  resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token, newPassword } = req.body;

    await this.authService.resetPassword(token, newPassword);

    sendSuccess(res, null, 'Password reset successful');
  });

  getMe = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    // This would be handled by the authenticate middleware
    // The user object would be attached to the request
    const user = req.user;
    if (!user) {
      throw createError('User not found', 404);
    }
    
    sendSuccess(res, user.getPublicProfile(), 'Current user retrieved successfully');
  });

  impersonate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token } = req.body;
    if (!token) throw createError('Impersonation token is required.', 400);

    const imp = verifyImpersonationToken(token);
    const user = await User.findById(imp.userId);
    if (!user || !user.isActive) throw createError('Tenant user not found.', 404);

    const payload: IJWTPayload = {
      userId: imp.userId,
      email: imp.email,
      role: user.role,
      impersonating: true,
      superAdminId: imp.superAdminId,
      tenantId: imp.tenantId,
    };

    const tokens = generateTokenPair(payload);
    this.setAuthCookies(res, tokens);

    const tenant = imp.tenantId
      ? await Tenant.findById(imp.tenantId).select('name slug logoUrl faviconUrl primaryColor secondaryColor')
      : null;

    sendSuccess(res, {
      user: user.getPublicProfile(),
      tokens,
      impersonating: true,
      tenantId: imp.tenantId,
      tenant: tenant
        ? {
            id: String(tenant._id),
            name: tenant.name,
            slug: tenant.slug,
            logoUrl: tenant.logoUrl,
            faviconUrl: tenant.faviconUrl,
            primaryColor: tenant.primaryColor,
            secondaryColor: tenant.secondaryColor,
          }
        : undefined,
    }, 'Impersonation login successful');
  });

  exitImpersonate = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const cookieToken = (req as any).cookies?.accessToken as string | undefined;
    const headerToken = req.header('Authorization')?.replace(/^Bearer\s+/i, '');
    const token = headerToken || cookieToken;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as IJWTPayload;
        if (decoded.impersonating && decoded.tenantId) {
          await logTenantActivity(decoded.tenantId, 'IMPERSONATION_ENDED', {
            performedBy: decoded.superAdminId,
            performedByType: 'SUPER_ADMIN',
            description: `Super admin ended impersonation of ${req.user?.email || decoded.email}`,
            metadata: { userId: decoded.userId },
          });
        }
      } catch {
        /* token may already be invalid */
      }
    }

    this.clearAuthCookies(res);
    sendSuccess(res, { redirectTo: '/superadmin/tenants' }, 'Impersonation ended');
  });
}
