import { api } from './client';

// Auth types
export interface User {
  _id: string;
  email: string;
  displayName?: string;
  phoneNumber?: string;
  role: 'CUSTOMER' | 'RIDER' | 'ADMIN' | 'WAITER' | 'CHEF' | 'BRANCH_MANAGER';
  profileImage?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  assignedBranch?: string;
  lastLoginAt?: string;
  createdAt: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: User['role'];
}

export interface PasswordResetData {
  token: string;
  newPassword: string;
}

// Auth API endpoints
export const authApi = {
  // Register new user
  register: async (data: RegisterData) => {
    return api.post<{ user: User; tokens?: Tokens; verificationToken?: string }>('/auth/register', data);
  },

  // Login
  login: async (credentials: LoginCredentials) => {
    return api.post<{ user: User; tokens?: Tokens }>('/auth/login', credentials);
  },

  // Logout
  logout: async () => {
    return api.post<null>('/auth/logout', {});
  },

  // Get current user
  me: async () => {
    return api.get<{ user: User }>('/auth/me');
  },

  // Refresh token
  refreshToken: async (refreshToken?: string) => {
    return api.post<{ tokens?: Tokens }>('/auth/refresh-token', { refreshToken });
  },

  // Request password reset
  requestPasswordReset: async (email: string) => {
    return api.post<{ resetToken?: string }>('/auth/request-password-reset', { email });
  },

  // Reset password
  resetPassword: async (data: PasswordResetData) => {
    return api.post<null>('/auth/reset-password', data);
  },

  // Verify email
  verifyEmail: async (token: string) => {
    return api.get<null>(`/auth/verify-email/${token}`);
  },

  // Resend verification email
  resendVerification: async (email: string) => {
    return api.post<{ verificationToken?: string }>('/auth/resend-verification', { email });
  },
};
