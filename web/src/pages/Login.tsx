import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogin } from '@restaurant-app/shared';
import './Login.css';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useLogin();
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

    try {
      const result: any = await login({ email, password });
      console.log('Login result:', result);

      // Persist user data for web pages that depend on it
      const user = result?.user || result;
      if (user && typeof user === 'object') {
        localStorage.setItem('userData', JSON.stringify(user));
        if (user?.role) {
          localStorage.setItem('userRole', String(user.role));
        }
      }

      // Fallback: if token is returned but not yet stored (should be handled by shared hook)
      const token = result?.tokens?.accessToken || result?.accessToken || result?.token;
      if (token && !localStorage.getItem('auth_token')) {
        localStorage.setItem('auth_token', String(token));
      }

      const storedToken = await waitForAuthToken(1000);
      if (!storedToken) {
        console.error('Login succeeded but no auth token was persisted; refusing to navigate to authenticated routes');
        return;
      }

      // Extract user role from login result or wait for it to be available
      const checkUserRole = () => {
        // Try to get role from various sources
        let userRole = localStorage.getItem('userRole');

        // If not found, try to extract from login result or auth state
        if (!userRole && result && typeof result === 'object' && result.user?.role) {
          userRole = result.user.role;
          if (userRole) {
            localStorage.setItem('userRole', userRole);
          }
        }

        console.log('Final user role:', userRole);

        // Handle role-based redirection
        if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
          navigate('/admin/dashboard');
        } else {
          navigate('/customer');
        }
      };

      // Check immediately, then retry after a short delay
      checkUserRole();
    } catch (err) {
      console.error('Login error:', err);
      // Error is handled by useLogin hook
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
