import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import NotificationDropdown from './NotificationDropdown';
import './Layout.css';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Notification state
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userRole, setUserRole] = useState<string>('');

  // Get user role on component mount
  useEffect(() => {
    const role = localStorage.getItem('userRole') || 'CUSTOMER';
    setUserRole(role);
  }, []);

  // Determine current page from pathname
  const getCurrentPage = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return 'Dashboard';
    if (path === '/orders') return 'Orders';
    if (path === '/products') return 'Products';
    if (path === '/branches') return 'Branches';
    if (path === '/tables') return 'Tables';
    if (path === '/users') return 'Users';
    if (path === '/reports') return 'Reports';
    if (path === '/notifications') return 'Notifications';
    if (path === '/settings') return 'Settings';
    return 'Dashboard';
  };

  const currentPage = getCurrentPage();

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
          <Link to="/dashboard" className={`nav-item ${currentPage === 'Dashboard' ? 'active' : ''}`}>
            <span className="nav-icon">📊</span>
            <span className="nav-text">Dashboard</span>
          </Link>

          {/* Admin-only navigation (all other roles use mobile apps) */}
          <Link to="/orders" className={`nav-item ${currentPage === 'Orders' ? 'active' : ''}`}>
            <span className="nav-icon">🛒</span>
            <span className="nav-text">Orders</span>
          </Link>
          <Link to="/products" className={`nav-item ${currentPage === 'Products' ? 'active' : ''}`}>
            <span className="nav-icon">🍕</span>
            <span className="nav-text">Products</span>
          </Link>
          <Link to="/branches" className={`nav-item ${currentPage === 'Branches' ? 'active' : ''}`}>
            <span className="nav-icon">🏢</span>
            <span className="nav-text">Branches</span>
          </Link>
          <div className="nav-group">
            <Link to="/tables" className={`nav-item nav-subitem ${currentPage === 'Tables' ? 'active' : ''}`}>
              <span className="nav-icon">🪑</span>
              <span className="nav-text">Tables</span>
            </Link>
            <Link to="/notifications" className={`nav-item nav-subitem ${currentPage === 'Notifications' ? 'active' : ''}`}>
              <span className="nav-icon">�</span>
              <span className="nav-text">Notifications</span>
            </Link>
          </div>
          <Link to="/users" className={`nav-item ${currentPage === 'Users' ? 'active' : ''}`}>
            <span className="nav-icon">�</span>
            <span className="nav-text">Users</span>
          </Link>
          <Link to="/reports" className={`nav-item ${currentPage === 'Reports' ? 'active' : ''}`}>
            <span className="nav-icon">�</span>
            <span className="nav-text">Reports</span>
          </Link>
          <Link to="/settings" className={`nav-item ${currentPage === 'Settings' ? 'active' : ''}`}>
            <span className="nav-icon">⚙️</span>
            <span className="nav-text">Settings</span>
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
                👤
              </div>
              <div className="user-info">
                <p className="user-name">
                  {userRole === 'ADMIN' ? 'Admin User' :
                   userRole === 'CUSTOMER' ? 'Customer' :
                   userRole.charAt(0).toUpperCase() + userRole.slice(1).toLowerCase()}
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
