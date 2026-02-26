import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { StatCard } from '../../dashboards/components/StatCard';
import { getNavigationItems } from '../../dashboards/components/NavigationMenu';
import { UserManagement } from './UserManagement';
import { RestaurantManagement } from './RestaurantManagement';
import { MenuManagement } from './MenuManagement';
import { OrderManagement } from './OrderManagement';
import { Analytics } from './Analytics';
import { Settings } from './Settings';
import { TableManagement } from './TableManagement';
import { dashboardApi, AdminStats } from '../../api/dashboard';

type TabType = 'overview' | 'users' | 'restaurants' | 'menu' | 'orders' | 'tables' | 'notifications' | 'analytics' | 'settings';

// Map URL paths to tabs
const pathToTab: Record<string, TabType> = {
  '/admin': 'overview',
  '/admin/': 'overview',
  '/admin/users': 'users',
  '/admin/restaurants': 'restaurants',
  '/admin/menu': 'menu',
  '/admin/orders': 'orders',
  '/admin/tables': 'tables',
  '/admin/notifications': 'notifications',
  '/admin/settings': 'settings',
};

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const path = window.location.pathname;
    return pathToTab[path] || 'overview';
  });

  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      const tab = pathToTab[path];
      if (tab) {
        setActiveTab(tab);
      }
    };

    // Listen for popstate (back/forward) and custom navigation events
    window.addEventListener('popstate', handleLocationChange);
    
    // Also check on mount in case URL changed
    handleLocationChange();

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Map tabs to URL paths
  const tabToPath: Record<TabType, string> = {
    overview: '/admin',
    users: '/admin/users',
    restaurants: '/admin/restaurants',
    menu: '/admin/menu',
    orders: '/admin/orders',
    tables: '/admin/tables',
    notifications: '/admin/notifications',
    analytics: '/admin/analytics',
    settings: '/admin/settings',
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    window.history.pushState(null, '', tabToPath[tab]);
  };
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalRestaurants: 0,
    totalOrders: 0,
    totalRevenue: 0,
    usersChange: 0,
    restaurantsChange: 0,
    ordersChange: 0,
    revenueChange: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get navigation items for admin
  const navigationItems = getNavigationItems('ADMIN');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await dashboardApi.getAdminStats();
        if (response.success && response.data) {
          setStats(response.data);
        } else {
          setError(response.message || 'Failed to fetch stats');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {/* Stats Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
            }}>
              <StatCard
                title="Total Users"
                value={stats.totalUsers.toLocaleString()}
                change={stats.usersChange}
                icon="👥"
                color="primary"
              />
              <StatCard
                title="Total Restaurants"
                value={stats.totalRestaurants}
                change={stats.restaurantsChange}
                icon="🏪"
                color="success"
              />
              <StatCard
                title="Total Orders"
                value={stats.totalOrders.toLocaleString()}
                change={stats.ordersChange}
                icon="📦"
                color="warning"
              />
              <StatCard
                title="Total Revenue"
                value={`$${stats.totalRevenue.toLocaleString()}`}
                change={stats.revenueChange}
                icon="💰"
                color="info"
              />
            </div>

            {/* Quick Actions */}
            <div style={{
              backgroundColor: '#fff',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#1a1a2e' }}>Quick Actions</h3>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleTabChange('users')}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#1976d2',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  👥 Manage Users
                </button>
                <button
                  onClick={() => handleTabChange('restaurants')}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#388e3c',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  🏪 Manage Restaurants
                </button>
                <button
                  onClick={() => handleTabChange('analytics')}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#f57c00',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  📊 View Analytics
                </button>
              </div>
            </div>

            {/* Recent Activity Placeholder */}
            <div style={{
              backgroundColor: '#fff',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#1a1a2e' }}>Recent Activity</h3>
              <div style={{ color: '#666', fontStyle: 'italic' }}>
                Recent activity feed will be implemented here...
              </div>
            </div>
          </div>
        );

      case 'users':
        return <UserManagement />;

      case 'restaurants':
        return <RestaurantManagement />;

      case 'menu':
        return <MenuManagement />;

      case 'orders':
        return <OrderManagement />;

      case 'tables':
        return <TableManagement />;

      case 'notifications':
        return (
          <div style={{ padding: '24px', background: '#fff', borderRadius: '12px' }}>
            <h2>Notifications</h2>
            <p>Notification management coming soon...</p>
          </div>
        );

      case 'analytics':
        return <Analytics />;

      case 'settings':
        return <Settings />;

      default:
        return <div>Tab not found</div>;
    }
  };

  return (
    <DashboardLayout
      navigationItems={navigationItems}
      title={activeTab === 'overview' ? 'Admin Dashboard' : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Management`}
    >
      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '30px',
        borderBottom: '1px solid #ddd',
        paddingBottom: '16px',
      }}>
        {[
          { key: 'overview', label: 'Overview', icon: '📊' },
          { key: 'users', label: 'Users', icon: '👥' },
          { key: 'restaurants', label: 'Restaurants', icon: '🏪' },
          { key: 'menu', label: 'Menu', icon: '🍽️' },
          { key: 'orders', label: 'Orders', icon: '📦' },
          { key: 'tables', label: 'Tables', icon: '🪑' },
          { key: 'notifications', label: 'Notifications', icon: '🔔' },
          { key: 'analytics', label: 'Analytics', icon: '📈' },
          { key: 'settings', label: 'Settings', icon: '⚙️' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key as TabType)}
            style={{
              padding: '12px 20px',
              backgroundColor: activeTab === tab.key ? '#1976d2' : 'transparent',
              color: activeTab === tab.key ? '#fff' : '#666',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </DashboardLayout>
  );
}
