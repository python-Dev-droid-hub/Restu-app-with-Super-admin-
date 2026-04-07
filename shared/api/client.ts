// API Configuration - works in both Node and browser environments
declare const process: { env?: { REACT_APP_API_URL?: string } } | undefined;

const API_BASE_URL = (typeof process !== 'undefined' && process?.env?.REACT_APP_API_URL) 
  || (typeof window !== 'undefined' && (window as any).REACT_APP_API_URL)
  || 'http://localhost:3101/api';

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  statusCode: number;
  error?: string;
}

export interface ApiError extends Error {
  statusCode: number;
  message: string;
  error?: string;
}

// Request options
interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

// Token storage (persistent for web, memory for React Native)
const TOKEN_KEY = 'auth_token';
let authToken: string | null = null; // Fallback for React Native

export function setAuthToken(token: string | null) {
  console.log('setAuthToken called with:', token ? 'token present' : 'null');
  if (typeof window !== 'undefined') {
    // Web: use localStorage for persistence
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      console.log('Token stored in localStorage, key:', TOKEN_KEY);
      // Verify storage
      const stored = localStorage.getItem(TOKEN_KEY);
      console.log('Token verification - stored:', stored ? 'yes' : 'no');
    } else {
      localStorage.removeItem(TOKEN_KEY);
      console.log('Token removed from localStorage');
    }
  } else {
    // React Native or Node: use memory (fallback)
    authToken = token;
    console.log('Token stored in memory (React Native/Node)');
  }
}

export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    // Web: get from localStorage
    const token = localStorage.getItem(TOKEN_KEY);
    console.log('getAuthToken from localStorage:', token ? 'found' : 'not found');
    return token;
  } else {
    // React Native or Node: get from memory
    console.log('getAuthToken from memory:', authToken ? 'found' : 'not found');
    return authToken;
  }
}

// Main API client
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { params, ...fetchOptions } = options;

    // Build URL with query params
    let url = `${this.baseURL}${endpoint}`;
    if (params) {
      const queryString = new URLSearchParams(params).toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    // Set default headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((fetchOptions.headers as Record<string, string>) || {}),
    };

    // Add auth token if available (for React Native or fallback)
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // For web: include credentials to send cookies
    const credentials = typeof window !== 'undefined' ? 'include' : undefined;

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        credentials: credentials as RequestCredentials,
      });

      const data = await response.json();

      if (!response.ok) {
        const error = new Error(data.message || 'An error occurred') as ApiError;
        error.statusCode = response.status;
        error.error = data.error;
        throw error;
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error');
    }
  }

  // HTTP methods
  get<T>(endpoint: string, options: RequestOptions = {}) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body: unknown, options: RequestOptions = {}) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  put<T>(endpoint: string, body: unknown, options: RequestOptions = {}) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  patch<T>(endpoint: string, body: unknown, options: RequestOptions = {}) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  delete<T>(endpoint: string, options: RequestOptions = {}) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Export singleton instance
export const api = new ApiClient(API_BASE_URL);

// Re-export for creating custom instances
export { ApiClient };
