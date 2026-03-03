import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import NotificationDropdown from './NotificationDropdown';
import './Layout.css';

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
        setProfileImage(parsed.profileImage || parsed.avatar || '');
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
          setProfileImage(parsed.profileImage || parsed.avatar || '');
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
    return 'dashboard';
  };

  const currentPageKey = getCurrentPageKey();
  const currentPage = t(currentPageKey as any);

  // Load unread notification count on component mount
  useEffect(() => {
    loadUnreadCount();
  }, []);

  const loadUnreadCount = async () => {
    // Only load notifications for ADMIN users
    if (userRole === 'ADMIN') {
      try {
        const response = await api.getNotificationUnreadCount();
        if (response.success && response.data) {
          // Type the response data properly
          const data = response.data as { unreadCount?: number };
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (error) {
        console.error('Error loading unread count:', error);
        setUnreadCount(0);
      }
    } else {
      setUnreadCount(0);
    }
  };

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
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
          <div className="nav-group">
            <Link to="/tables" className={`nav-item nav-subitem ${currentPageKey === 'tables' ? 'active' : ''}`}>
              <span className="nav-icon">🪑</span>
              <span className="nav-text">{t('tables')}</span>
            </Link>
            <Link to="/notifications" className={`nav-item nav-subitem ${currentPageKey === 'notifications' ? 'active' : ''}`}>
              <span className="nav-icon">🔔</span>
              <span className="nav-text">{t('notifications')}</span>
            </Link>
          </div>
          <Link to="/users" className={`nav-item ${currentPageKey === 'users' ? 'active' : ''}`}>
            <span className="nav-icon">👥</span>
            <span className="nav-text">{t('users')}</span>
          </Link>
          <Link to="/reports" className={`nav-item ${currentPageKey === 'reports' ? 'active' : ''}`}>
            <span className="nav-icon">📊</span>
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
