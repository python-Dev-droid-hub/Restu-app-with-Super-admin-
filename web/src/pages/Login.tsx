import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { setAuthSession, setUserProfile, getStoredRole } from '../utils/authStorage';
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

      const user = result?.data?.user || result?.user;
      if (user && typeof user === 'object') {
        const role = String(user.role || '').trim().toUpperCase();
        const normalizedUser = { ...user, role };
        const persistSession = role !== 'RIDER';
        setAuthSession(accessToken, tokens?.refreshToken, { persist: persistSession });
        setUserProfile(normalizedUser, { persist: persistSession });
        void requestBrowserNotificationPermission();
        const ab = user.assignedBranch;
        const branchId = ab?._id || ab?.id || (typeof ab === 'string' ? ab : '');
        if (branchId) localStorage.setItem('selectedBranchId', String(branchId));
        if (role) {
          window.dispatchEvent(new Event('profileUpdated'));
          window.dispatchEvent(new Event('userDataUpdated'));
          window.dispatchEvent(new Event('tenant-branding-refresh'));
          redirectByRole(role);
          return;
        }
      }

      setAuthSession(accessToken, tokens?.refreshToken);
      void requestBrowserNotificationPermission();

      const meRes: any = await api.get('/auth/me');
      if (meRes?.success && meRes?.data) {
        const role = String(meRes.data.role || '').trim().toUpperCase();
        const persistSession = role !== 'RIDER';
        setAuthSession(accessToken, tokens?.refreshToken, { persist: persistSession });
        setUserProfile({ ...meRes.data, role }, { persist: persistSession });
        const ab = meRes.data.assignedBranch;
        const branchId = ab?._id || ab?.id || (typeof ab === 'string' ? ab : '');
        if (branchId) localStorage.setItem('selectedBranchId', String(branchId));
        if (role) {
          window.dispatchEvent(new Event('profileUpdated'));
          window.dispatchEvent(new Event('userDataUpdated'));
          window.dispatchEvent(new Event('tenant-branding-refresh'));
          redirectByRole(role);
          return;
        }
      }

      const role = getStoredRole();
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
          <span> | </span>
          <a href="/superadmin/login">Platform super admin</a>
        </div>
      </div>
    </div>
  );
}
