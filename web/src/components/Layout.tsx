import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import NotificationDropdown from './NotificationDropdown';
import './Layout.css';
import { io, type Socket } from 'socket.io-client';
import { resolveSocketUrl } from '../utils/resolveSocketUrl';

const sanitizeWebImageSrc = (src: unknown): string => {
  if (!src || typeof src !== 'string') return '';
  const trimmed = src.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('file:') || lower.includes('var/mobile') || lower.includes('imagepicker')) return '';
  return trimmed;
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  // Notification state
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userRole, setUserRole] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [profileImage, setProfileImage] = useState<string>('');
  const socketRef = useRef<Socket | null>(null);

  // Get user data on component mount
  useEffect(() => {
    const role = localStorage.getItem('userRole') || 'CUSTOMER';
    setUserRole(role);
    
    // Load user name
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setUserName(parsed.name || '');
        setProfileImage(sanitizeWebImageSrc(parsed.profileImage || parsed.avatar));
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, []);

  // Listen for storage changes (when profile is updated in another tab/page)
  useEffect(() => {
    const handleStorageChange = () => {
      const userData = localStorage.getItem('userData');
      if (userData) {
        try {
          const parsed = JSON.parse(userData);
          setUserName(parsed.name || '');
          setProfileImage(sanitizeWebImageSrc(parsed.profileImage || parsed.avatar));
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }
    };
    
    // Listen for storage events (other tabs) and custom events (same window)
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('profileUpdated', handleStorageChange as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('profileUpdated', handleStorageChange as EventListener);
    };
  }, []);

  // Determine current page from pathname (returns translation key)
  const getCurrentPageKey = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return 'dashboard';
    if (path === '/orders') return 'orders';
    if (path === '/products') return 'products';
    if (path === '/branches') return 'branches';
    if (path === '/tables') return 'tables';
    if (path === '/users') return 'users';
    if (path === '/reports') return 'reports';
    if (path === '/notifications') return 'notifications';
    if (path === '/settings') return 'settings';
    if (path === '/categories') return 'categories';
    if (path === '/coupons') return 'coupons';
    if (path === '/deals') return 'deals';
    if (path === '/product-size') return 'product-size';
    if (path === '/table-assignment') return 'table-assignment';
    if (path === '/banners') return 'banners';
    return 'dashboard';
  };

  const currentPageKey = getCurrentPageKey();
  const currentPage = t(currentPageKey as any);

  useEffect(() => {
    if (userRole !== 'ADMIN') {
      setUnreadCount(0);
      return;
    }

    if (socketRef.current) return;

    const token = localStorage.getItem('auth_token') || localStorage.getItem('authToken') || '';

    const socket = io(resolveSocketUrl(), {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: token ? { token } : undefined,
    });
    socketRef.current = socket;

    const requestUnread = () => {
      socket.emit('admin_unread_count:get');
    };

    socket.on('connect', requestUnread);
    socket.on('admin_unread_count:data', (payload: any) => {
      setUnreadCount(typeof payload?.unreadCount === 'number' ? payload.unreadCount : 0);
    });
    socket.on('notification', requestUnread);

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [userRole]);

  const handleNotificationClick = () => {
    setShowNotifications((prev) => !prev);
  };

  const handleNotificationClose = () => {
    setShowNotifications(false);
  };

  const handleUnreadCountUpdate = (newCount: number) => {
    setUnreadCount(newCount);
  };

  const handleLogout = () => {
    console.log('Logout clicked');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
    console.log('localStorage cleared, navigating to login...');
    navigate('/login');
  };

  return (
    <div className="admin-app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            🍕
          </div>
          <div className="sidebar-brand">
            <h3>Restaurant</h3>
            <span>
              {userRole === 'ADMIN' ? 'ADMIN' :
               userRole === 'CUSTOMER' ? 'CUSTOMER' :
               userRole.toUpperCase()}
            </span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {/* Dashboard - available to all (but only admin reaches here) */}
          <Link to="/dashboard" className={`nav-item ${currentPageKey === 'dashboard' ? 'active' : ''}`}>
            <span className="nav-icon">📊</span>
            <span className="nav-text">{t('dashboard')}</span>
          </Link>

          {/* Admin-only navigation (all other roles use mobile apps) */}
          <Link to="/orders" className={`nav-item ${currentPageKey === 'orders' ? 'active' : ''}`}>
            <span className="nav-icon">🛒</span>
            <span className="nav-text">{t('orders')}</span>
          </Link>
          <Link to="/products" className={`nav-item ${currentPageKey === 'products' ? 'active' : ''}`}>
            <span className="nav-icon">🍕</span>
            <span className="nav-text">{t('products')}</span>
          </Link>
          <Link to="/branches" className={`nav-item ${currentPageKey === 'branches' ? 'active' : ''}`}>
            <span className="nav-icon">🏢</span>
            <span className="nav-text">{t('branches')}</span>
          </Link>
          
          {/* Additional tabs matching mobile */}
          <Link to="/notifications" className={`nav-item ${currentPageKey === 'notifications' ? 'active' : ''}`}>
            <span className="nav-icon">🔔</span>
            <span className="nav-text">Notifications</span>
          </Link>
          <Link to="/table-assignment" className={`nav-item ${currentPageKey === 'table-assignment' ? 'active' : ''}`}>
            <span className="nav-icon">🪑</span>
            <span className="nav-text">Table Assignment</span>
          </Link>
          <Link to="/categories" className={`nav-item ${currentPageKey === 'categories' ? 'active' : ''}`}>
            <span className="nav-icon">📁</span>
            <span className="nav-text">Categories</span>
          </Link>
          <Link to="/banners" className={`nav-item ${currentPageKey === 'banners' ? 'active' : ''}`}>
            <span className="nav-icon">🖼️</span>
            <span className="nav-text">Banner Management</span>
          </Link>
          <Link to="/coupons" className={`nav-item ${currentPageKey === 'coupons' ? 'active' : ''}`}>
            <span className="nav-icon">🎟️</span>
            <span className="nav-text">Coupons</span>
          </Link>
          <Link to="/deals" className={`nav-item ${currentPageKey === 'deals' ? 'active' : ''}`}>
            <span className="nav-icon">🏷️</span>
            <span className="nav-text">Deals</span>
          </Link>
          <Link to="/product-size" className={`nav-item ${currentPageKey === 'product-size' ? 'active' : ''}`}>
            <span className="nav-icon">�</span>
            <span className="nav-text">Product Size</span>
          </Link>
          <Link to="/tables" className={`nav-item ${currentPageKey === 'tables' ? 'active' : ''}`}>
            <span className="nav-icon">🪑</span>
            <span className="nav-text">{t('tables')}</span>
          </Link>
          <Link to="/users" className={`nav-item ${currentPageKey === 'users' ? 'active' : ''}`}>
            <span className="nav-icon">👥</span>
            <span className="nav-text">{t('users')}</span>
          </Link>
          <Link to="/reports" className={`nav-item ${currentPageKey === 'reports' ? 'active' : ''}`}>
            <span className="nav-icon">�</span>
            <span className="nav-text">{t('reports')}</span>
          </Link>
          <Link to="/settings" className={`nav-item ${currentPageKey === 'settings' ? 'active' : ''}`}>
            <span className="nav-icon">⚙️</span>
            <span className="nav-text">{t('settings')}</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="main-wrapper">
        {/* Header */}
        <header className="header">
          <div className="header-left">
            <h1 className="page-title">{currentPage}</h1>
          </div>
          <div className="header-right">
            <button className="icon-btn" onClick={handleNotificationClick} title="Notifications">
              <span className="notification-badge">{unreadCount > 0 ? unreadCount : ''}</span>
              🔔
            </button>
            <div className="user-menu">
              <div className="user-avatar">
                {profileImage ? (
                  <img 
                    src={profileImage} 
                    alt={userName || 'User'} 
                    loading="lazy"
                    decoding="async"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                  />
                ) : (
                  '👤'
                )}
              </div>
              <div className="user-info">
                <p className="user-name">
                  {userName || (userRole === 'ADMIN' ? 'Admin User' : userRole.charAt(0).toUpperCase() + userRole.slice(1).toLowerCase())}
                </p>
                <p className="user-role">
                  {userRole === 'ADMIN' ? 'Administrator' :
                   userRole === 'CUSTOMER' ? 'Customer' :
                   userRole.charAt(0).toUpperCase() + userRole.slice(1).toLowerCase()}
                </p>
              </div>
            </div>
            <button type="button" className="icon-btn logout-btn" onClick={handleLogout} title="Logout">
              🚪
            </button>
          </div>
        </header>

        {/* Notification Dropdown */}
        <NotificationDropdown
          isOpen={showNotifications}
          onClose={handleNotificationClose}
          unreadCount={unreadCount}
          onUnreadCountUpdate={handleUnreadCountUpdate}
        />

        {/* Page Content */}
        <main className="content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
