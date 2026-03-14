import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { StatCard } from '../../dashboards/components/StatCard';
import { getNavigationItems } from '../../dashboards/components/NavigationMenu';
import { api } from '../../api/client';

type TabType = 'overview' | 'orders' | 'favorites' | 'profile';

interface Favorite {
  id: string;
  branchId: string;
  branchName: string;
  address: string;
  city: string;
  phone: string;
  operatingHours?: any;
  addedAt: string;
}

interface Order {
  _id: string;
  id?: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  orderDate?: string;
  restaurantName?: string;
  deliveryAddress?: string;
  items?: Array<{ name: string; quantity: number; price: number }>;
}

interface CustomerStats {
  totalOrders: number;
  totalSpent: number;
  favoriteRestaurants: number;
  pendingOrders: number;
}

interface CustomerOrdersResponse {
  orders: Order[];
}

export function CustomerDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [stats, setStats] = useState<CustomerStats>({
    totalOrders: 0,
    totalSpent: 0,
    favoriteRestaurants: 0,
    pendingOrders: 0,
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  const navigationItems = getNavigationItems('CUSTOMER');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch customer stats
      const statsResponse = await api.get<CustomerStats>('/dashboard/customer/stats');
      if (statsResponse.success && statsResponse.data) {
        setStats({
          totalOrders: statsResponse.data.totalOrders || 0,
          totalSpent: statsResponse.data.totalSpent || 0,
          favoriteRestaurants: statsResponse.data.favoriteRestaurants || 0,
          pendingOrders: statsResponse.data.pendingOrders || 0,
        });
      }

      // Fetch customer orders
      const ordersResponse = await api.get<CustomerOrdersResponse>('/orders/my-orders');
      if (ordersResponse.success && ordersResponse.data) {
        const formattedOrders = ordersResponse.data.orders.map((order: any) => ({
          _id: order._id,
          id: order._id,
          orderNumber: order.orderNumber || `ORD-${order._id.toString().slice(-6).toUpperCase()}`,
          restaurantName: order.branch?.branchName || 'Unknown Restaurant',
          items: order.items?.map((item: any) => item.product?.name || 'Unknown Item') || [],
          totalAmount: order.totalAmount || 0,
          status: order.status || 'PENDING',
          createdAt: order.createdAt,
          orderDate: order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Unknown',
          deliveryAddress: order.deliveryAddress?.street || 'N/A',
        }));
        setOrders(formattedOrders);
      }

      // Fetch customer favorites
      const favoritesResponse = await api.get<{ favorites: Favorite[] }>('/favorites');
      if (favoritesResponse.success && favoritesResponse.data) {
        setFavorites(favoritesResponse.data.favorites || []);
        // Update favorites count in stats
        setStats((prev: CustomerStats) => ({
          ...prev,
          favoriteRestaurants: favoritesResponse.data.favorites?.length || 0
        }));
      }

    } catch (error) {
      console.error('Error fetching customer dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: '#ff9800',
      CONFIRMED: '#2196f3',
      PREPARING: '#9c27b0',
      READY: '#00bcd4',
      DELIVERED: '#4caf50',
      CANCELLED: '#f44336',
    };
    return colors[status] || '#757575';
  };

  const renderOrderCard = (order: Order) => (
    <div
      key={order.id}
      style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '16px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>{order.orderNumber}</div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a2e' }}>{order.restaurantName}</div>
        </div>
        <span
          style={{
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 500,
            backgroundColor: getStatusColor(order.status) + '20',
            color: getStatusColor(order.status),
            textTransform: 'capitalize',
          }}
        >
          {order.status.toLowerCase()}
        </span>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>Items:</div>
        <div style={{ fontSize: '14px', color: '#1a1a2e' }}>{(order.items || []).join(', ')}</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '14px', color: '#666' }}>{order.orderDate}</div>
        <div style={{ fontSize: '18px', fontWeight: 600, color: '#1976d2' }}>${order.totalAmount.toFixed(2)}</div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{
              display: 'flex',
              gap: '16px',
              marginBottom: '20px',
              borderBottom: '1px solid #ddd',
              paddingBottom: '16px',
            }}>
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'orders', label: 'Orders', icon: '📦' },
                { id: 'favorites', label: 'Favorites', icon: '❤️' },
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
            {/* Stats Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}>
              <StatCard
                title="Total Orders"
                value={stats.totalOrders}
                change={12}
                icon="📦"
                color="primary"
              />
              <StatCard
                title="Total Spent"
                value={`$${stats.totalSpent}`}
                change={8}
                icon="💰"
                color="success"
              />
              <StatCard
                title="Favorites"
                value={stats.favoriteRestaurants}
                change={2}
                icon="❤️"
                color="warning"
              />
              <StatCard
                title="Pending Orders"
                value={stats.pendingOrders}
                change={-1}
                icon="⏳"
                color="info"
              />
            </div>

            {/* Recent Orders */}
            <div>
              <h3 style={{ margin: '0 0 16px 0', color: '#1a1a2e' }}>Recent Orders</h3>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Loading...</div>
              ) : orders.length > 0 ? (
                orders.slice(0, 3).map(renderOrderCard)
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No orders yet</div>
              )}
            </div>
          </div>
        );

      case 'orders':
        return (
          <div>
            <div style={{
              display: 'flex',
              gap: '16px',
              marginBottom: '20px',
              borderBottom: '1px solid #ddd',
              paddingBottom: '16px',
            }}>
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'orders', label: 'Orders', icon: '📦' },
                { id: 'favorites', label: 'Favorites', icon: '❤️' },
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
            <h2 style={{ margin: '0 0 20px 0', color: '#1a1a2e' }}>My Orders</h2>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Loading...</div>
            ) : orders.length > 0 ? (
              orders.map(renderOrderCard)
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No orders yet</div>
            )}
          </div>
        );

      case 'favorites':
        return (
          <div>
            <div style={{
              display: 'flex',
              gap: '16px',
              marginBottom: '20px',
              borderBottom: '1px solid #ddd',
              paddingBottom: '16px',
            }}>
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'orders', label: 'Orders', icon: '📦' },
                { id: 'favorites', label: 'Favorites', icon: '❤️' },
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
            <h2 style={{ margin: '0 0 20px 0', color: '#1a1a2e' }}>Favorite Restaurants</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '20px',
            }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Loading favorites...</div>
              ) : favorites.length > 0 ? (
                favorites.map((favorite) => (
                  <div
                    key={favorite.id}
                    style={{
                      backgroundColor: '#fff',
                      borderRadius: '12px',
                      padding: '20px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '8px',
                        backgroundColor: '#f0f0f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '30px',
                      }}>
                        🍽️
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1a1a2e' }}>{favorite.branchName}</div>
                        <div style={{ fontSize: '14px', color: '#666' }}>{favorite.address}, {favorite.city}</div>
                        <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                          📞 {favorite.phone}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button style={{
                        flex: 1,
                        padding: '8px',
                        backgroundColor: '#1976d2',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}>
                        Order Now
                      </button>
                      <button style={{
                        padding: '8px 12px',
                        backgroundColor: '#ffebee',
                        color: '#c62828',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}>
                        ❤️
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  No favorite restaurants yet
                </div>
              )}
            </div>
          </div>
        );

      case 'profile':
        return (
          <div>
            <div style={{
              display: 'flex',
              gap: '16px',
              marginBottom: '20px',
              borderBottom: '1px solid #ddd',
              paddingBottom: '16px',
            }}>
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'orders', label: 'Orders', icon: '📦' },
                { id: 'favorites', label: 'Favorites', icon: '❤️' },
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
            <h2 style={{ margin: '0 0 20px 0', color: '#1a1a2e' }}>My Profile</h2>
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '8px' }}>Full Name</label>
                <input
                  type="text"
                  defaultValue="John Doe"
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
                  defaultValue="john@example.com"
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
                <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '8px' }}>Phone</label>
                <input
                  type="tel"
                  defaultValue="+1 234 567 890"
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
                <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '8px' }}>Default Address</label>
                <textarea
                  defaultValue="123 Main St, New York, NY 10001"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px',
                    resize: 'vertical',
                  }}
                />
              </div>
              <button style={{
                padding: '12px 24px',
                backgroundColor: '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}>
                Save Changes
              </button>
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
      title="Customer Dashboard"
    >
      {renderTabContent()}
    </DashboardLayout>
  );
}
