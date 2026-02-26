import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { IAuthRequest, sendSuccess, sendError, asyncHandler } from '@/utils';
import { createError } from '@/utils';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  private setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
    const isProd = process.env.NODE_ENV === 'production';
    const secure = (process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProd);
    const sameSite = (process.env.COOKIE_SAMESITE as any) || (isProd ? 'none' : 'lax');
    const domain = process.env.COOKIE_DOMAIN || undefined;

    const baseOptions: any = {
      httpOnly: true,
      secure,
      sameSite,
      domain,
      path: '/',
    };

    res.cookie('accessToken', tokens.accessToken, {
      ...baseOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      ...baseOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  private clearAuthCookies(res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    const secure = (process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProd);
    const sameSite = (process.env.COOKIE_SAMESITE as any) || (isProd ? 'none' : 'lax');
    const domain = process.env.COOKIE_DOMAIN || undefined;

    const baseOptions: any = {
      httpOnly: true,
      secure,
      sameSite,
      domain,
      path: '/',
    };

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
    });

    this.setAuthCookies(res, tokens);

    const verificationToken = this.authService.generateEmailVerificationToken(user._id.toString());

    sendSuccess(res, {
      user: user.getPublicProfile(),
      tokens: process.env.NODE_ENV === 'production' ? undefined : tokens,
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

    sendSuccess(res, {
      tokens: process.env.NODE_ENV === 'production' ? undefined : tokens,
    }, 'Token refreshed successfully');
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
}
