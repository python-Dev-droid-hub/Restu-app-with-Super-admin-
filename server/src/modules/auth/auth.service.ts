import { UserRepository } from '@/modules/user/user.repository';
import { generateTokenPair, verifyRefreshToken } from '@/utils/jwt';
import { IUser, IJWTPayload } from '@/types';
import { createError } from '@/middleware/errorHandler';
import { Tenant } from '@/superadmin/models';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import {
  assertRoleAllowedForPlan,
  roleRequiresFeature,
} from '@/superadmin/services/planEnforcement.service';

type LoginAttemptEntry = { failures: number; lockUntil: number };

export class AuthService {
  private userRepository: UserRepository;
  private static loginAttempts = new Map<string, LoginAttemptEntry>();
  private static readonly MAX_FAILURES = 5;
  private static readonly LOCK_MS = 15 * 60 * 1000;

  constructor() {
    this.userRepository = new UserRepository();
  }

  private loginAttemptKey(email: string): string {
    return email.trim().toLowerCase();
  }

  private assertLoginAllowed(email: string): void {
    const entry = AuthService.loginAttempts.get(this.loginAttemptKey(email));
    if (entry && entry.lockUntil > Date.now()) {
      const minutes = Math.ceil((entry.lockUntil - Date.now()) / 60000);
      throw createError(`Too many failed login attempts. Try again in ${minutes} minute(s).`, 429);
    }
  }

  private recordLoginFailure(email: string): void {
    const key = this.loginAttemptKey(email);
    const entry = AuthService.loginAttempts.get(key) || { failures: 0, lockUntil: 0 };
    entry.failures += 1;
    if (entry.failures >= AuthService.MAX_FAILURES) {
      entry.lockUntil = Date.now() + AuthService.LOCK_MS;
      entry.failures = 0;
    }
    AuthService.loginAttempts.set(key, entry);
  }

  private clearLoginFailures(email: string): void {
    AuthService.loginAttempts.delete(this.loginAttemptKey(email));
  }

  async register(userData: {
    name: string;
    email: string;
    password: string;
    role?: string;
    phoneNumber?: string;
    profileImage?: string;
    vehicleNumber?: string;
    vehicleType?: string;
    assignedBranchId?: string;
    tenantId?: string;
  }): Promise<{ user: IUser; tokens: any }> {
    const { 
      name, 
      email, 
      password, 
      role, 
      phoneNumber,
      profileImage,
      vehicleNumber,
      vehicleType,
      assignedBranchId,
      tenantId,
    } = userData;
    const normalizedRole = (role || 'CUSTOMER').toUpperCase() as IUser['role'];

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw createError('User with this email already exists', 409);
    }

    // Create new user with all fields
    const userCreateData: any = {
      displayName: name,
      email,
      passwordHash: password,
      role: normalizedRole,
    };

    // Add optional fields if provided
    if (phoneNumber) userCreateData.phoneNumber = phoneNumber;
    if (profileImage) userCreateData.profileImage = profileImage;
    if (vehicleNumber) userCreateData.vehicleNumber = vehicleNumber;
    if (vehicleType) userCreateData.vehicleType = vehicleType;
    if (assignedBranchId) userCreateData.assignedBranch = new mongoose.Types.ObjectId(assignedBranchId);
    if (tenantId) userCreateData.tenantId = new mongoose.Types.ObjectId(tenantId);

    const user = await this.userRepository.create(userCreateData);

    // Generate tokens
    const payload: IJWTPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      assignedBranch: user.assignedBranch?.toString(),
    };

    const tokens = generateTokenPair(payload);

    return { user, tokens };
  }

  async login(email: string, password: string): Promise<{ user: IUser; tokens: any }> {
    this.assertLoginAllowed(email);

    // Find user with password
    const user = await this.userRepository.findByEmailWithPassword(email);
    if (!user) {
      this.recordLoginFailure(email);
      throw createError('Invalid email or password', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      throw createError('Account is deactivated', 401);
    }

    if (user.tenantId) {
      const tenant = await Tenant.findById(user.tenantId);
      if (tenant && (!tenant.isActive || tenant.subscriptionStatus === 'SUSPENDED')) {
        const err = createError('Your restaurant account is suspended. Contact support.', 403) as Error & {
          suspended?: boolean;
        };
        err.suspended = true;
        throw err;
      }
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      this.recordLoginFailure(email);
      throw createError('Invalid email or password', 401);
    }

    this.clearLoginFailures(email);

    const tenantId = user.tenantId ? String(user.tenantId) : undefined;
    const featureGate = roleRequiresFeature(user.role);
    if (tenantId && featureGate) {
      await assertRoleAllowedForPlan(tenantId, user.role);
    }

    // Generate tokens with proper assignedBranch handling
    let assignedBranchId: string | undefined;
    if (user.assignedBranch) {
      if (typeof user.assignedBranch === 'string') {
        assignedBranchId = user.assignedBranch;
      } else if (user.assignedBranch instanceof mongoose.Types.ObjectId) {
        assignedBranchId = user.assignedBranch.toString();
      } else if (typeof user.assignedBranch === 'object' && (user.assignedBranch as any)._id) {
        assignedBranchId = (user.assignedBranch as any)._id.toString();
      }
    }

    const payload: IJWTPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      assignedBranch: assignedBranchId,
      tenantId: user.tenantId ? String(user.tenantId) : undefined,
    };

    const tokens = generateTokenPair(payload);

    // Remove password from user object
    const userWithoutPassword = user.getPublicProfile();

    return { user: userWithoutPassword as any, tokens };
  }

  async refreshToken(refreshToken: string): Promise<{ tokens: any }> {
    try {
      // Verify refresh token
      const payload = verifyRefreshToken(refreshToken);

      // Find user
      const user = await this.userRepository.findById(payload.userId);
      if (!user || !user.isActive) {
        throw createError('Invalid refresh token', 401);
      }

      // Generate new tokens
      const newPayload: IJWTPayload = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        assignedBranch: user.assignedBranch?.toString(),
        tenantId: user.tenantId ? String(user.tenantId) : payload.tenantId,
        impersonating: payload.impersonating,
        superAdminId: payload.superAdminId,
      };

      const tokens = generateTokenPair(newPayload);

      return { tokens };
    } catch (error) {
      throw createError('Invalid refresh token', 401);
    }
  }

  async resendVerificationEmail(email: string): Promise<{ verificationToken?: string }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return {};
    }

    if ((user as any).emailVerified) {
      return {};
    }

    const verificationToken = this.generateEmailVerificationToken(user._id.toString());
    return { verificationToken };
  }

  async verifyEmail(userId: string): Promise<void> {
    const user = await this.userRepository.updateEmailVerification(userId);
    if (!user) {
      throw createError('User not found', 404);
    }
  }

  generateEmailVerificationToken(userId: string): string {
    return jwt.sign(
      { userId, type: 'email_verify' },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );
  }

  async verifyEmailToken(token: string): Promise<void> {
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (e) {
      throw createError('Invalid or expired verification token', 401);
    }

    if (!decoded || decoded.type !== 'email_verify' || !decoded.userId) {
      throw createError('Invalid verification token', 401);
    }

    await this.verifyEmail(decoded.userId);
  }

  generatePasswordResetToken(userId: string): string {
    return jwt.sign(
      { userId, type: 'password_reset' },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '15m' }
    );
  }

  async requestPasswordReset(email: string): Promise<{ resetToken?: string }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not
      return {};
    }

    const resetToken = this.generatePasswordResetToken(user._id.toString());
    return { resetToken };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!);
    } catch (e) {
      throw createError('Invalid or expired reset token', 401);
    }

    if (!decoded || decoded.type !== 'password_reset' || !decoded.userId) {
      throw createError('Invalid or expired reset token', 401);
    }

    const updated = await this.userRepository.updatePassword(decoded.userId, newPassword);
    if (!updated) {
      throw createError('User not found', 404);
    }
  }
}
