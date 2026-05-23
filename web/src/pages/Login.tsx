import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { setAuthSession } from '../utils/authStorage';
import { requestBrowserNotificationPermission } from '../services/browserNotifications';
import './Login.css';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const redirectByRole = (roleRaw: string) => {
    const role = String(roleRaw || '').trim().toUpperCase();
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      navigate('/admin/dashboard');
    } else if (role === 'BRANCH_MANAGER') {
      navigate('/manager/dashboard');
    } else if (role === 'CHEF') {
      navigate('/chef/dashboard');
    } else if (role === 'WAITER') {
      navigate('/waiter');
    } else if (role === 'RIDER') {
      navigate('/rider');
    } else {
      navigate('/customer');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setError(null);

    try {
      const result: any = await api.post('/auth/login', { email, password });
      if (!result?.success) {
        setError(result?.message || 'Login failed. Please check your credentials.');
        return;
      }

      const tokens = result?.data?.tokens;
      const accessToken =
        tokens?.accessToken || result?.data?.token || result?.accessToken || result?.token;

      if (!accessToken) {
        setError('Login succeeded but no access token was returned.');
        return;
      }

      setAuthSession(accessToken, tokens?.refreshToken);
      void requestBrowserNotificationPermission();

      const user = result?.data?.user || result?.user;
      if (user && typeof user === 'object') {
        const role = String(user.role || '').trim().toUpperCase();
        const normalizedUser = { ...user, role };
        localStorage.setItem('userData', JSON.stringify(normalizedUser));
        const ab = user.assignedBranch;
        const branchId = ab?._id || ab?.id || (typeof ab === 'string' ? ab : '');
        if (branchId) localStorage.setItem('selectedBranchId', String(branchId));
        if (user._id || user.id) {
          localStorage.setItem('userId', String(user._id || user.id));
        }
        if (role) {
          localStorage.setItem('userRole', role);
          window.dispatchEvent(new Event('profileUpdated'));
          window.dispatchEvent(new Event('userDataUpdated'));
          redirectByRole(role);
          return;
        }
      }

      const meRes: any = await api.get('/auth/me');
      if (meRes?.success && meRes?.data) {
        localStorage.setItem('userData', JSON.stringify(meRes.data));
        const ab = meRes.data.assignedBranch;
        const branchId = ab?._id || ab?.id || (typeof ab === 'string' ? ab : '');
        if (branchId) localStorage.setItem('selectedBranchId', String(branchId));
        if (meRes.data._id || meRes.data.id) {
          localStorage.setItem('userId', String(meRes.data._id || meRes.data.id));
        }
        if (meRes.data.role) {
          localStorage.setItem('userRole', String(meRes.data.role));
          window.dispatchEvent(new Event('profileUpdated'));
          window.dispatchEvent(new Event('userDataUpdated'));
          redirectByRole(meRes.data.role);
          return;
        }
      }

      const role = localStorage.getItem('userRole') || '';
      if (role) {
        redirectByRole(role);
      } else {
        setError('Logged in but could not determine your role. Contact support.');
      }
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
