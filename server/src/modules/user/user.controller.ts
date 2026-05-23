import { Request, Response, NextFunction } from 'express';
import { UserRepository } from './user.repository';
import { IAuthRequest, sendSuccess, sendError, asyncHandler } from '@/utils';
import { createError } from '@/middleware/errorHandler';
import { Types } from 'mongoose';
import { updateRiderLocation as storeRiderLocation } from '@/services/locationService';
import { normalizeUserRole } from '@/utils/roles';

export class UserController {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  getProfile = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const user = req.user;
    
    if (!user) {
      throw createError('User not found', 404);
    }

    sendSuccess(res, user.getPublicProfile(), 'Profile retrieved successfully');
  });

  updateProfile = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const userId = req.user!._id;
    const { name, phone, avatar, image } = req.body;

    const updateData: any = {};
    if (name) updateData.displayName = name;
    if (phone) updateData.phoneNumber = phone;
    if (avatar) updateData.profileImage = avatar;
    if (image) updateData.profileImage = image; // Also accept 'image' field

    const updatedUser = await this.userRepository.updateById(userId, updateData);
    
    if (!updatedUser) {
      throw createError('User not found', 404);
    }

    sendSuccess(res, updatedUser.getPublicProfile(), 'Profile updated successfully');
  });

  updateProfileImage = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const userId = req.user!._id;
    
    if (!req.file && !req.body.profileImage && !req.body.image) {
      throw createError('No image provided', 400);
    }

    // If file was uploaded via multer, use its path
    // Otherwise use the base64 or URL string from body
    const profileImage = req.file ? `/uploads/${req.file.filename}` : (req.body.profileImage || req.body.image);

    const updatedUser = await this.userRepository.updateById(userId, { profileImage });
    
    if (!updatedUser) {
      throw createError('User not found', 404);
    }

    sendSuccess(res, { profileImage, imageUrl: profileImage, user: updatedUser.getPublicProfile() }, 'Profile image updated successfully');
  });

  getAllUsers = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const role = req.query.role as string;
    const search = req.query.search as string;
    const userRole = req.user!.role;
    // assignedBranch could be ObjectId, string, or populated object
    const rawBranchId = req.user!.assignedBranch;
    let userBranchId: string | undefined;
    
    if (rawBranchId) {
      if (typeof rawBranchId === 'string') {
        userBranchId = rawBranchId;
      } else if (rawBranchId instanceof Types.ObjectId) {
        userBranchId = rawBranchId.toString();
      } else if (typeof rawBranchId === 'object' && '_id' in (rawBranchId as any)) {
        // It's a populated object, extract the _id
        userBranchId = (rawBranchId as any)._id?.toString();
      }
    }
    
    console.log('[USERS] Extracted branchId:', userBranchId, 'from:', rawBranchId);
    const canManageUsers = ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'].includes(userRole);
    const activeOnly = req.query.activeOnly === 'true';
    const showInactive =
      req.query.showInactive === 'true' || (canManageUsers && req.query.showInactive !== 'false');

    let filter: any = {};

    // Management dashboards list active + inactive; use ?activeOnly=true to hide deactivated
    if (activeOnly || (!showInactive && !canManageUsers)) {
      filter.isActive = true;
    }
    
    // If a specific role is requested, use it
    if (role) {
      filter.role = role;
    }
    // If no role specified and user is BRANCH_MANAGER, exclude SUPER_ADMIN by default
    else if (userRole === 'BRANCH_MANAGER') {
      filter.role = { $ne: 'SUPER_ADMIN' };
    }

    // SUPER_ADMIN sees all users, no branch filtering
    if (userRole === 'SUPER_ADMIN') {
      // No additional filters for SUPER_ADMIN
      console.log('[USERS] SUPER_ADMIN - showing all users');
    }
    // Branch managers can only see users from their branch
    else if (userRole === 'BRANCH_MANAGER') {
      // Filter by branch - only show users assigned to manager's branch
      if (userBranchId) {
        // Convert to ObjectId for proper MongoDB comparison
        try {
          const branchObjectId = typeof userBranchId === 'string' 
            ? new Types.ObjectId(userBranchId)
            : userBranchId;
          filter.assignedBranch = branchObjectId;
        } catch (e) {
          console.log('[USERS] Invalid branchId format:', userBranchId);
        }
      }
    }

    console.log('[USERS] Filter:', JSON.stringify(filter));
    console.log('[USERS] User role:', userRole, 'branchId:', userBranchId);

    let result;
    if (search) {
      result = await this.userRepository.searchUsers(search, page, limit, filter);
    } else {
      result = await this.userRepository.findAll(page, limit, filter);
    }

    console.log('[USERS] Found users:', result.users.length, 'Total:', result.total);

    const totalPages = Math.ceil(result.total / limit);

    sendSuccess(res, {
      users: result.users.map(user => user.getPublicProfile()),
      pagination: {
        page,
        limit,
        total: result.total,
        pages: totalPages,
      },
    }, 'Users retrieved successfully');
  });

  getUserById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const user = await this.userRepository.findById(id);
    
    if (!user) {
      throw createError('User not found', 404);
    }

    sendSuccess(res, user.getPublicProfile(), 'User retrieved successfully');
  });

  deactivateUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const user = await this.userRepository.softDeleteById(id);
    
    if (!user) {
      throw createError('User not found', 404);
    }

    sendSuccess(res, null, 'User deactivated successfully');
  });

  activateUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const user = await this.userRepository.updateById(id, { isActive: true });
    
    if (!user) {
      throw createError('User not found', 404);
    }

    sendSuccess(res, { user: user.getPublicProfile() }, 'User activated successfully');
  });

  updateUser = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { name, email, role, isActive, phone, assignedBranch } = req.body;

    const existing = await this.userRepository.findById(id);
    if (!existing) {
      throw createError('User not found', 404);
    }

    const updateData: Record<string, unknown> = {};
    if (name) updateData.displayName = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (phone) updateData.phoneNumber = phone;
    if (assignedBranch !== undefined) updateData.assignedBranch = assignedBranch;

    const user = await this.userRepository.updateById(id, updateData);

    if (!user) {
      throw createError('User not found', 404);
    }

    const actorRole = String(req.user?.role || '').toUpperCase();
    const previousRole = String(existing.role || '');
    const newRole = role ? String(role) : previousRole;
    const roleChanged = role && newRole !== previousRole;
    const branchId =
      (user.assignedBranch as any)?._id?.toString?.() ||
      (user.assignedBranch ? String(user.assignedBranch) : undefined);

    if (roleChanged) {
      const {
        notifyRoleAssignedByAdmin,
        notifyRoleChangedByManager,
      } = await import('@/services/roleNotificationService');

      if (actorRole === 'ADMIN' || actorRole === 'SUPER_ADMIN') {
        void notifyRoleAssignedByAdmin({
          adminId: String(req.user!._id),
          targetUserId: id,
          newRole,
          previousRole,
          branchId,
        });
      } else if (actorRole === 'BRANCH_MANAGER') {
        void notifyRoleChangedByManager({
          managerId: String(req.user!._id),
          targetUserId: id,
          newRole,
          previousRole,
          branchId,
          roleDetails: `Updated user ${user.displayName || user.email}`,
        });
      }
    }

    sendSuccess(res, { user: user.getPublicProfile() }, 'User updated successfully');
  });

  deleteUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const deleted = await this.userRepository.deleteById(id);
    
    if (!deleted) {
      throw createError('User not found', 404);
    }

    sendSuccess(res, null, 'User deleted successfully');
  });

  changePassword = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const userId = req.user!._id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw createError('Current password and new password are required', 400);
    }

    const user = await this.userRepository.findByIdWithPassword(userId);
    
    if (!user) {
      throw createError('User not found', 404);
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      throw createError('Current password is incorrect', 400);
    }

    await this.userRepository.updatePassword(userId, newPassword);

    sendSuccess(res, null, 'Password changed successfully');
  });

  // Rider-specific endpoints
  updateRiderLocation = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const userId = req.user!._id;
    const userRole = req.user!.role;
    const { longitude, latitude } = req.body;

    if (userRole !== 'RIDER' && userRole !== 'SUPER_ADMIN') {
      throw createError('Only riders can update their location', 403);
    }

    if (longitude === undefined || latitude === undefined) {
      throw createError('Longitude and latitude are required', 400);
    }

    const record = storeRiderLocation(userId.toString(), latitude, longitude);

    const updatedUser = await this.userRepository.updateRiderLocation(userId, longitude, latitude);

    if (!updatedUser) {
      throw createError('User not found', 404);
    }

    sendSuccess(
      res,
      {
        location: updatedUser.currentLocation,
        lastLocationUpdate: updatedUser.lastLocationUpdate,
        snapshot: record,
      },
      'Location updated successfully'
    );
  });

  updateRiderDutyStatus = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const userId = req.user!._id;
    const userRole = req.user!.role;
    const { onDuty } = req.body;

    if (userRole !== 'RIDER' && userRole !== 'SUPER_ADMIN') {
      throw createError('Only riders can update their duty status', 403);
    }

    if (onDuty === undefined) {
      throw createError('onDuty status is required', 400);
    }

    const updatedUser = await this.userRepository.updateRiderDutyStatus(userId, onDuty);
    
    if (!updatedUser) {
      throw createError('User not found', 404);
    }

    sendSuccess(res, { 
      onDuty: updatedUser.onDuty,
    }, `Rider is now ${onDuty ? 'on duty' : 'off duty'}`);
  });

  getRiderStatus = asyncHandler(async (req: IAuthRequest, res: Response): Promise<void> => {
    const userId = req.user!._id;
    const userRole = req.user!.role;

    if (userRole !== 'RIDER' && userRole !== 'SUPER_ADMIN') {
      throw createError('Only riders can view their status', 403);
    }

    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw createError('User not found', 404);
    }

    sendSuccess(res, {
      onDuty: (user as any).onDuty || false,
      currentLocation: (user as any).currentLocation || null,
      lastLocationUpdate: (user as any).lastLocationUpdate || null,
    }, 'Rider status retrieved successfully');
  });
}
