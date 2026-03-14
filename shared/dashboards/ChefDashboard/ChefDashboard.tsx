import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { StatCard } from '../../dashboards/components/StatCard';
import { getNavigationItems } from '../../dashboards/components/NavigationMenu';
import { api } from '../../api/client';

type TabType = 'overview' | 'kitchen' | 'menu' | 'profile';

interface KitchenOrder {
  id: string;
  orderNumber: string;
  tableNumber: string;
  orderType: 'DINE_IN' | 'DELIVERY' | 'TAKEAWAY';
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    status: 'PENDING' | 'PREPARING' | 'READY';
    preparationTime: number;
    specialInstructions?: string;
  }>;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  orderTime: string;
  estimatedReadyTime: string;
}

interface MenuItem {
  _id: string;
  name: string;
  description?: string;
  price: number;
  category?: {
    name: string;
  };
  preparationTime: number;
  isAvailable: boolean;
}

interface ChefStats {
  pendingOrders: number;
  preparingOrders: number;
  completedToday: number;
  avgPreparationTime: number;
}

interface MenuItemsResponse {
  products: MenuItem[];
}

interface ProfileData {
  name: string;
  email: string;
  phoneNumber: string;
  specialization: string;
}

interface ChefOrdersResponse {
  orders: KitchenOrder[];
}

export function ChefDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [stats, setStats] = useState<ChefStats>({
    pendingOrders: 0,
    preparingOrders: 0,
    completedToday: 0,
    avgPreparationTime: 0,
  });
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  const navigationItems = getNavigationItems('CHEF');

  const handleNavigation = (path: string) => {
    const tabMapping: Record<string, TabType> = {
      '/chef/overview': 'overview',
      '/chef/queue': 'kitchen',
      '/chef/menu': 'menu',
      '/chef/profile': 'profile',
    };
    const tab = tabMapping[path];
    if (tab) {
      setActiveTab(tab);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch chef stats
      const statsResponse = await api.get<ChefStats>('/dashboard/chef/stats');
      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }

      // Fetch kitchen orders
      const ordersResponse = await api.get<ChefOrdersResponse>('/dashboard/chef/orders');
      if (ordersResponse.success && ordersResponse.data) {
        setOrders(ordersResponse.data.orders || []);
      }

      // Fetch menu items
      const menuResponse = await api.get<MenuItemsResponse>('/menu/admin/products');
      if (menuResponse.success && menuResponse.data) {
        setMenuItems(menuResponse.data.products || []);
      }

    } catch (error) {
      console.error('Error fetching chef dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!profile) return;

    try {
      setProfileLoading(true);
      setProfileError(null);
      setProfileSuccess(null);

      const response = await api.put('/users/profile', {
        name: profile.name,
        phone: profile.phoneNumber,
        specialization: profile.specialization
      });

      if (response.success) {
        setProfileSuccess('Profile updated successfully!');
        setTimeout(() => setProfileSuccess(null), 3000);
      } else {
        setProfileError(response.message || 'Failed to update profile');
      }
    } catch (error) {
      setProfileError('Failed to update profile');
      console.error('Error updating profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      NORMAL: '#4caf50',
      HIGH: '#ff9800',
      URGENT: '#f44336',
    };
    return colors[priority] || '#757575';
  };

  const getItemStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: '#ff9800',
      PREPARING: '#2196f3',
      READY: '#4caf50',
    };
    return colors[status] || '#757575';
  };

  const renderOrderCard = (order: KitchenOrder) => {
    const allItemsReady = order.items.every(item => item.status === 'READY');
    const anyItemPreparing = order.items.some(item => item.status === 'PREPARING');

    return (
      <div
        key={order.id}
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '16px',
          borderLeft: `4px solid ${getPriorityColor(order.priority)}`,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '14px', color: '#666' }}>{order.orderNumber}</span>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: getPriorityColor(order.priority) + '20',
                  color: getPriorityColor(order.priority),
                  textTransform: 'capitalize',
                }}
              >
                {order.priority}
              </span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a2e' }}>
              {order.orderType === 'DINE_IN' ? `🪑 Table ${order.tableNumber}` : `🚴 ${order.orderType.replace('_', ' ')}`}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', color: '#666' }}>🕐 {order.orderTime}</div>
            <div style={{ fontSize: '12px', color: '#999' }}>Ready by: {order.estimatedReadyTime}</div>
          </div>
        </div>

        {/* Items */}
        <div style={{ marginBottom: '16px' }}>
          {order.items.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                backgroundColor: item.status === 'READY' ? '#e8f5e9' : item.status === 'PREPARING' ? '#e3f2fd' : '#fff3e0',
                borderRadius: '8px',
                marginBottom: '8px',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a2e' }}>
                  {item.quantity}x {item.name}
                </div>
                {item.specialInstructions && (
                  <div style={{ fontSize: '12px', color: '#e65100', marginTop: '4px' }}>
                    ⚠️ {item.specialInstructions}
                  </div>
                )}
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  ⏱️ {item.preparationTime} min
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    backgroundColor: getItemStatusColor(item.status) + '20',
                    color: getItemStatusColor(item.status),
                    textTransform: 'capitalize',
                  }}
                >
                  {item.status.toLowerCase()}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {order.items.some(item => item.status === 'PENDING') && (
            <button
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: '#ff9800',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              Start Cooking
            </button>
          )}
          {anyItemPreparing && (
            <button
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: '#4caf50',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              Mark Ready
            </button>
          )}
          {allItemsReady && (
            <button
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              Notify Waiter
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderTabNavigation = () => (
    <div style={{
      display: 'flex',
      gap: '16px',
      marginBottom: '20px',
      borderBottom: '1px solid #ddd',
      paddingBottom: '16px',
    }}>
      {[
        { id: 'overview', label: 'Overview', icon: '📊' },
        { id: 'kitchen', label: 'Kitchen Queue', icon: '👨‍🍳' },
        { id: 'menu', label: 'Menu Items', icon: '📋' },
        { id: 'profile', label: 'Profile', icon: '👤' },
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id as TabType)}
          style={{
            padding: '12px 20px',
            backgroundColor: activeTab === tab.id ? '#1976d2' : 'transparent',
            color: activeTab === tab.id ? '#fff' : '#666',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {renderTabNavigation()}

            {/* Stats Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}>
              <StatCard
                title="Pending Orders"
                value={stats.pendingOrders}
                change={-2}
                icon="⏳"
                color="warning"
              />
              <StatCard
                title="Preparing"
                value={stats.preparingOrders}
                change={1}
                icon="👨‍🍳"
                color="info"
              />
              <StatCard
                title="Completed Today"
                value={stats.completedToday}
                change={5}
                icon="✅"
                color="success"
              />
              <StatCard
                title="Avg Prep Time"
                value={`${stats.avgPreparationTime}m`}
                change={-2}
                icon="⏱️"
                color="primary"
              />
            </div>

            {/* Kitchen Queue Summary */}
            <div>
              <h3 style={{ margin: '0 0 16px 0', color: '#1a1a2e' }}>Active Orders</h3>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Loading...</div>
              ) : orders.length > 0 ? (
                orders.slice(0, 3).map(renderOrderCard)
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No active orders</div>
              )}
            </div>
          </div>
        );

      case 'kitchen':
        return (
          <div>
            {renderTabNavigation()}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#1a1a2e' }}>Kitchen Queue</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={{
                  padding: '8px 16px',
                  backgroundColor: '#f5f5f5',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}>
                  Filter: All
                </button>
              </div>
            </div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Loading...</div>
            ) : orders.length > 0 ? (
              orders.map(renderOrderCard)
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No orders in queue</div>
            )}
          </div>
        );

      case 'menu':
        return (
          <div>
            {renderTabNavigation()}
            <h2 style={{ margin: '0 0 20px 0', color: '#1a1a2e' }}>Menu Items</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '20px',
            }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Loading menu items...</div>
              ) : menuItems.length > 0 ? (
                menuItems.map((item) => (
                  <div
                    key={item._id}
                    style={{
                      backgroundColor: '#fff',
                      borderRadius: '12px',
                      padding: '20px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a2e' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '14px', color: '#666' }}>
                          Category: {item.category?.name || 'Uncategorized'}
                        </div>
                      </div>
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: item.isAvailable ? '#e8f5e9' : '#ffebee',
                        color: item.isAvailable ? '#2e7d32' : '#c62828',
                        borderRadius: '4px',
                        fontSize: '12px',
                      }}>
                        {item.isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                      ⏱️ Prep time: {item.preparationTime} min
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                      � Price: ${item.price.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      📝 {item.description || 'No description available'}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  No menu items available
                </div>
              )}
            </div>
          </div>
        );

      case 'profile':
        return (
          <div>
            {renderTabNavigation()}
            <h2 style={{ margin: '0 0 20px 0', color: '#1a1a2e' }}>My Profile</h2>

            {profileError && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#ffebee',
                color: '#c62828',
                borderRadius: '6px',
                border: '1px solid #ffcdd2',
                marginBottom: '16px',
              }}>
                {profileError}
              </div>
            )}

            {profileSuccess && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#e8f5e9',
                color: '#2e7d32',
                borderRadius: '6px',
                border: '1px solid #c8e6c9',
                marginBottom: '16px',
              }}>
                {profileSuccess}
              </div>
            )}

            <div style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}>
              {profileLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  Loading profile...
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '8px' }}>Full Name</label>
                    <input
                      type="text"
                      value={profile?.name || ''}
                      onChange={(e) => setProfile((prev: ProfileData | null) => prev ? { ...prev, name: e.target.value } : null)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '8px' }}>Email</label>
                    <input
                      type="email"
                      value={profile?.email || ''}
                      disabled
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: '#f5f5f5',
                        color: '#666',
                      }}
                    />
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                      Email cannot be changed
                    </div>
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '8px' }}>Phone</label>
                    <input
                      type="tel"
                      value={profile?.phoneNumber || ''}
                      onChange={(e) => setProfile((prev: ProfileData | null) => prev ? { ...prev, phoneNumber: e.target.value } : null)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '8px' }}>Specialization</label>
                    <input
                      type="text"
                      value={profile?.specialization || ''}
                      onChange={(e) => setProfile((prev: ProfileData | null) => prev ? { ...prev, specialization: e.target.value } : null)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                  <button
                    onClick={saveProfile}
                    disabled={profileLoading}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: profileLoading ? '#ccc' : '#1976d2',
                      color: profileLoading ? '#666' : '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: profileLoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                    }}
                  >
                    {profileLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <DashboardLayout
      navigationItems={navigationItems}
      title="Chef Dashboard"
      onNavigate={handleNavigation}
    >
      {renderTabContent()}
    </DashboardLayout>
  );
}
