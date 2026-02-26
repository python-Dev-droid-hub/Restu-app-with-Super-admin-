import { UserRepository } from '@/modules/user/user.repository';
import { generateTokenPair, verifyRefreshToken } from '@/utils/jwt';
import { IUser, IJWTPayload } from '@/types';
import { createError } from '@/middleware/errorHandler';
import jwt from 'jsonwebtoken';

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
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
      assignedBranchId
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
    if (assignedBranchId) userCreateData.assignedBranch = assignedBranchId;

    const user = await this.userRepository.create(userCreateData);

    // Generate tokens
    const payload: IJWTPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const tokens = generateTokenPair(payload);

    return { user, tokens };
  }

  async login(email: string, password: string): Promise<{ user: IUser; tokens: any }> {
    // Find user with password
    const user = await this.userRepository.findByEmailWithPassword(email);
    if (!user) {
      throw createError('Invalid email or password', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      throw createError('Account is deactivated', 401);
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw createError('Invalid email or password', 401);
    }

    // Generate tokens
    const payload: IJWTPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
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
