import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { User } from '../api/auth';

type UserRole = User['role'];

interface DashboardLayoutProps {
  children: React.ReactNode;
  navigationItems: NavItem[];
  title?: string;
  onNavigate?: (path: string) => void;
}

export interface NavItem {
  label: string;
  icon: string;
  path: string;
  roles?: UserRole[];
}

export function DashboardLayout({ children, navigationItems, title, onNavigate }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const currentPath = window.location.pathname;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          position: 'fixed',
          top: '16px',
          left: '16px',
          zIndex: 50,
          padding: '8px',
          backgroundColor: '#fff',
          border: '1px solid #ddd',
          borderRadius: '4px',
          display: window.innerWidth > 768 ? 'none' : 'block',
        }}
      >
        ☰
      </button>

      {/* Sidebar */}
      <aside
        style={{
          width: '250px',
          backgroundColor: '#1a1a2e',
          color: '#fff',
          padding: '20px',
          position: 'fixed',
          height: '100vh',
          overflowY: 'auto',
          transform: sidebarOpen || window.innerWidth > 768 ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
          zIndex: 40,
        }}
      >
        {/* Logo/Brand */}
        <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #333' }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>Restaurant App</h2>
          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#888' }}>
            {user?.role?.replace('_', ' ')}
          </p>
        </div>

        {/* Navigation */}
        <nav>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {navigationItems.map((item) => (
              <li key={item.path} style={{ marginBottom: '8px' }}>
                {onNavigate ? (
                  <button
                    onClick={() => onNavigate(item.path)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 16px',
                      color: currentPath === item.path ? '#fff' : '#aaa',
                      backgroundColor: currentPath === item.path ? '#16213e' : 'transparent',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      transition: 'all 0.2s',
                      border: 'none',
                      width: '100%',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    <span style={{ marginRight: '12px' }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ) : (
                  <a
                    href={item.path}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 16px',
                      color: currentPath === item.path ? '#fff' : '#aaa',
                      backgroundColor: currentPath === item.path ? '#16213e' : 'transparent',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    <span style={{ marginRight: '12px' }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </a>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* User Info & Logout */}
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            right: '20px',
            paddingTop: '20px',
            borderTop: '1px solid #333',
          }}
        >
          <div style={{ marginBottom: '15px' }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>
              {user?.displayName || user?.email}
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#888' }}>
              {user?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#e94560',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 30,
            display: window.innerWidth > 768 ? 'none' : 'block',
          }}
        />
      )}

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          marginLeft: window.innerWidth > 768 ? '250px' : '0',
          padding: '30px',
          backgroundColor: '#f5f5f5',
          minHeight: '100vh',
        }}
      >
        {title && (
          <header
            style={{
              marginBottom: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: '28px',
                color: '#1a1a2e',
                flex: 1,
                minWidth: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {title}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
              <button
                type="button"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '9999px',
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  cursor: 'pointer',
                  fontSize: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Notifications"
              >
                🔔
              </button>
              <button
                type="button"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '9999px',
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  color: '#1a1a2e',
                }}
                aria-label="Profile"
              >
                {(user?.displayName || user?.email || 'U').slice(0, 1).toUpperCase()}
              </button>
            </div>
          </header>
        )}
        {children}
      </main>
    </div>
  );
}
