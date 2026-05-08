import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import './Login.css';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const waitForAuthToken = async (maxWaitMs: number) => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < maxWaitMs) {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('authToken');
      if (token) return token;
      await new Promise((r) => setTimeout(r, 50));
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setError(null);

    try {
      localStorage.removeItem('userRole');
      localStorage.removeItem('userData');
      const result: any = await api.post('/auth/login', { email, password });
      if (!result?.success) {
        setError(result?.message || 'Login failed. Please check your credentials.');
        setIsLoading(false);
        return;
      }

      // Store auth token immediately
      const accessToken = result?.data?.tokens?.accessToken || result?.data?.token;
      if (accessToken) {
        localStorage.setItem('auth_token', accessToken);
        localStorage.setItem('authToken', accessToken);
      }

      console.log('Login result:', result);

      // Persist user data for web pages that depend on it
      const user = result?.data?.user || result?.user || result?.data;
      if (user && typeof user === 'object') {
        localStorage.setItem('userData', JSON.stringify(user));
        if ((user as any)?._id || (user as any)?.id) {
          localStorage.setItem('userId', String((user as any)?._id || (user as any)?.id));
        }
        if (user?.role) {
          localStorage.setItem('userRole', String(user.role));
        }
      }

      // Fallback token storage
      const token = result?.data?.tokens?.accessToken || result?.tokens?.accessToken || result?.accessToken || result?.token;
      if (token && !localStorage.getItem('auth_token')) {
        localStorage.setItem('auth_token', String(token));
      }

      const storedToken = await waitForAuthToken(1000);
      if (!storedToken) {
        console.error('Login succeeded but no auth token was persisted; refusing to navigate to authenticated routes');
        return;
      }

      const meRes: any = await api.get('/auth/me');
      if (meRes?.success && meRes?.data) {
        localStorage.setItem('userData', JSON.stringify(meRes.data));
        if ((meRes.data as any)?._id || (meRes.data as any)?.id) {
          localStorage.setItem('userId', String((meRes.data as any)?._id || (meRes.data as any)?.id));
        }
        if ((meRes.data as any)?.role) {
          localStorage.setItem('userRole', String((meRes.data as any).role));
        }
      }

      // Extract user role from login result or wait for it to be available
      const checkUserRole = () => {
        // Prefer userData.role (authoritative), then fall back to userRole key
        let userRole = '';
        try {
          const rawUser = localStorage.getItem('userData');
          const parsed = rawUser ? JSON.parse(rawUser) : null;
          userRole = String(parsed?.role || '');
        } catch {
          userRole = '';
        }
        if (!userRole) {
          userRole = localStorage.getItem('userRole') || '';
        }

        // If not found, try to extract from login result or auth state
        if (!userRole && result && typeof result === 'object' && (result.data?.user?.role || result.user?.role)) {
          userRole = result.data?.user?.role || result.user?.role;
          if (userRole) {
            localStorage.setItem('userRole', userRole);
          }
        }

        const normalizedRole = String(userRole || '').trim().toUpperCase();
        console.log('Final user role:', normalizedRole);

        // Handle role-based redirection
        if (normalizedRole === 'ADMIN' || normalizedRole === 'SUPER_ADMIN') {
          navigate('/admin/dashboard');
        } else if (normalizedRole === 'BRANCH_MANAGER') {
          navigate('/manager/dashboard');
        } else if (normalizedRole === 'CHEF') {
          navigate('/chef/dashboard');
        } else if (normalizedRole === 'WAITER') {
          navigate('/waiter');
        } else if (normalizedRole === 'RIDER') {
          navigate('/rider');
        } else {
          navigate('/customer');
        }
      };

      // Check immediately, then retry after a short delay
      checkUserRole();
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Login</h1>
        <p className="login-subtitle">Sign in to your account</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={isLoading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            className="login-button"
            disabled={isLoading || !email || !password}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <a href="/forgot-password">Forgot password?</a>
          <span> | </span>
          <a href="/register">Create account</a>
        </div>
      </div>
    </div>
  );
}
