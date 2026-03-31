import { useCallback, useState } from 'react';
import { authApi } from '../api/auth';
import type { LoginCredentials, RegisterData, PasswordResetData } from '../api/auth';
import { setAuthToken } from '../api/client';
import { useAuth } from '../hooks/useAuth';

interface UseLoginReturn {
  login: (credentials: LoginCredentials) => Promise<any>;
  isLoading: boolean;
  error: string | null;
}

export function useLogin(): UseLoginReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshUser } = useAuth();

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('useLogin: Attempting login...');
      const response = await authApi.login(credentials);
      console.log('useLogin: Login response:', response);

      if (!response.success) {
        throw new Error(response.message || 'Login failed');
      }

      // Store token if returned (React Native)
      if (response.data.tokens?.accessToken) {
        console.log('useLogin: Storing access token');
        setAuthToken(response.data.tokens.accessToken);
      } else {
        console.warn('useLogin: No access token in response!');
      }

      // Refresh user in auth context
      console.log('useLogin: Refreshing user...');
      await refreshUser();
      console.log('useLogin: Login complete');

      return response.data;
    } catch (err) {
      console.error('useLogin: Login error:', err);
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshUser]);

  return { login, isLoading, error };
}

interface UseRegisterReturn {
  register: (data: RegisterData) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useRegister(): UseRegisterReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshUser } = useAuth();

  const register = useCallback(async (data: RegisterData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.register(data);

      if (!response.success) {
        throw new Error(response.message || 'Registration failed');
      }

      // Store token if returned (React Native)
      if (response.data.tokens?.accessToken) {
        setAuthToken(response.data.tokens.accessToken);
      }

      // Refresh user in auth context
      await refreshUser();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshUser]);

  return { register, isLoading, error };
}

interface UseLogoutReturn {
  logout: () => Promise<void>;
  isLoading: boolean;
}

export function useLogout(): UseLogoutReturn {
  const [isLoading, setIsLoading] = useState(false);
  const { logout: authLogout } = useAuth();

  const logout = useCallback(async () => {
    setIsLoading(true);

    try {
      await authApi.logout();
    } catch (err) {
      // Ignore logout errors
    } finally {
      // Clear auth state
      setAuthToken(null);
      await authLogout();
      setIsLoading(false);
    }
  }, [authLogout]);

  return { logout, isLoading };
}

interface UsePasswordResetReturn {
  requestReset: (email: string) => Promise<{ resetToken?: string }>;
  resetPassword: (data: PasswordResetData) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function usePasswordReset(): UsePasswordResetReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestReset = useCallback(async (email: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.requestPasswordReset(email);
      return response.data || {};
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Password reset request failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (data: PasswordResetData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.resetPassword(data);

      if (!response.success) {
        throw new Error(response.message || 'Password reset failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Password reset failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { requestReset, resetPassword, isLoading, error };
}

interface UseEmailVerificationReturn {
  resendVerification: (email: string) => Promise<{ verificationToken?: string }>;
  verifyEmail: (token: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useEmailVerification(): UseEmailVerificationReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshUser } = useAuth();

  const resendVerification = useCallback(async (email: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.resendVerification(email);
      return response.data || {};
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resend verification';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyEmail = useCallback(async (token: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.verifyEmail(token);

      if (!response.success) {
        throw new Error(response.message || 'Email verification failed');
      }

      // Refresh user to get updated emailVerified status
      await refreshUser();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Email verification failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshUser]);

  return { resendVerification, verifyEmail, isLoading, error };
}
