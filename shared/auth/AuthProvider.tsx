import type { ReactNode } from 'react';
import React, { createContext, useState, useCallback } from 'react';
import { authApi } from '../api/auth';
import type { User } from '../api/auth';
import { setAuthToken, getAuthToken } from '../api/client';

// Auth state interface
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Auth context value interface
export interface AuthContextValue extends AuthState {
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: User['role']) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  
  // Token management (for React Native)
  setToken: (token: string | null) => void;
  
  // Password reset
  requestPasswordReset: (email: string) => Promise<{ resetToken?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  
  // Email verification
  resendVerification: (email: string) => Promise<{ verificationToken?: string }>;
}

// Create context
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Provider props
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from stored token
  React.useEffect(() => {
    const initAuth = async () => {
      console.log('AuthProvider: Initializing auth state...');
      try {
        // Check if we have a stored token
        const token = getAuthToken();
        console.log('AuthProvider: Token exists:', !!token);
        if (token) {
          // If we have a token, fetch user data and set authenticated
          try {
            console.log('AuthProvider: Fetching user data...');
            const response = await authApi.me();
            console.log('AuthProvider: User data response:', response);
            if (response.success && response.data) {
              // Backend returns user directly in data, not wrapped in { user: ... }
              const userData = response.data.user || response.data;
              console.log('AuthProvider: User authenticated:', userData.role);
              setUser(userData);
              setIsAuthenticated(true);
            } else {
              console.log('AuthProvider: User fetch failed, clearing token');
              // Token exists but user fetch failed - clear token
              setAuthToken(null);
              setUser(null);
              setIsAuthenticated(false);
            }
          } catch (err) {
            console.error('AuthProvider: Error fetching user:', err);
            // Token exists but user fetch failed - clear token
            setAuthToken(null);
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          console.log('AuthProvider: No token found');
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('AuthProvider: Init error:', err);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
        console.log('AuthProvider: Init complete, isLoading: false');
      }
    };

    initAuth();
  }, []);

  // Login
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('AuthProvider: Attempting login...');
      const response = await authApi.login({ email, password });
      console.log('AuthProvider: Login response:', response);

      if (!response.success) {
        throw new Error(response.message || 'Login failed');
      }

      // Store token if returned (React Native)
      if (response.data.tokens?.accessToken) {
        console.log('AuthProvider: Storing access token');
        setAuthToken(response.data.tokens.accessToken);
      }

      console.log('AuthProvider: User logged in:', response.data.user);
      setUser(response.data.user);
      setIsAuthenticated(true);
    } catch (err) {
      console.error('AuthProvider: Login error:', err);
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Register
  const register = useCallback(async (
    name: string,
    email: string,
    password: string,
    role?: User['role']
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.register({ name, email, password, role });

      if (!response.success) {
        throw new Error(response.message || 'Registration failed');
      }

      // Store token if returned (React Native)
      if (response.data.tokens?.accessToken) {
        setAuthToken(response.data.tokens.accessToken);
      }

      setUser(response.data.user);
      setIsAuthenticated(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    setIsLoading(true);

    try {
      await authApi.logout();
    } catch (err) {
      // Ignore logout errors
    } finally {
      // Clear token and state
      setAuthToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    console.log('AuthProvider: refreshUser called');
    try {
      const token = getAuthToken();
      console.log('AuthProvider: refreshUser - token exists:', !!token);
      const response = await authApi.me();
      console.log('AuthProvider: refreshUser - full response:', response);
      console.log('AuthProvider: refreshUser - response.data:', response.data);
      console.log('AuthProvider: refreshUser - response.data.user:', response.data?.user);
      if (response.success && response.data) {
        // Backend returns user directly in data, not wrapped in { user: ... }
        const userData = response.data.user || response.data;
        console.log('AuthProvider: refreshUser - setting user:', userData.role);
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        console.log('AuthProvider: refreshUser - no user in response');
      }
    } catch (err) {
      console.error('AuthProvider: refreshUser - error:', err);
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  // Set token manually (for React Native)
  const setToken = useCallback((token: string | null) => {
    setAuthToken(token);
    if (token) {
      refreshUser();
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
  }, [refreshUser]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Request password reset
  const requestPasswordReset = useCallback(async (email: string) => {
    const response = await authApi.requestPasswordReset(email);
    return response.data || {};
  }, []);

  // Reset password
  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.resetPassword({ token, newPassword });

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

  // Resend verification email
  const resendVerification = useCallback(async (email: string) => {
    const response = await authApi.resendVerification(email);
    return response.data || {};
  }, []);

  // Context value
  const value: AuthContextValue = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    refreshUser,
    clearError,
    setToken,
    requestPasswordReset,
    resetPassword,
    resendVerification,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
