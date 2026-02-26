import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { StatCard } from '../../dashboards/components/StatCard';
import { getNavigationItems } from '../../dashboards/components/NavigationMenu';
import { api } from '../../api/client';

type TabType = 'overview' | 'deliveries' | 'earnings' | 'profile';

interface Delivery {
  id: string;
  orderNumber: string;
  restaurantName: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  items: string[];
  totalAmount: number;
  status: 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED';
  estimatedTime: string;
  distance: string;
}

interface RiderEarnings {
  totalEarnings: number;
  thisWeekEarnings: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
  weeklyBreakdown: any[];
}

interface RiderStats {
  todayDeliveries: number;
  todayEarnings: number;
  totalDeliveries: number;
  rating: number;
  isOnline: boolean;
}

interface RiderStatsResponse {
  assignedDeliveries?: number;
  todayEarnings?: number;
  completedDeliveries?: number;
}

interface RiderDeliveriesResponse {
  deliveries: Delivery[];
}

export function RiderDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [stats, setStats] = useState<RiderStats>({
    todayDeliveries: 0,
    todayEarnings: 0,
    totalDeliveries: 0,
    rating: 0,
    isOnline: true,
  });
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [earnings, setEarnings] = useState<RiderEarnings | null>(null);
  const [loading, setLoading] = useState(true);

  const navigationItems = getNavigationItems('RIDER');

  const handleNavigation = (path: string) => {
    const tabMapping: Record<string, TabType> = {
      '/rider/overview': 'overview',
      '/rider/deliveries': 'deliveries',
      '/rider/earnings': 'earnings',
      '/rider/profile': 'profile',
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

      // Fetch rider stats
      const statsResponse = await api.get<RiderStatsResponse>('/dashboard/rider/stats');
      if (statsResponse.success && statsResponse.data) {
        setStats({
          todayDeliveries: statsResponse.data.assignedDeliveries || 0,
          todayEarnings: statsResponse.data.todayEarnings || 0,
          totalDeliveries: statsResponse.data.completedDeliveries || 0,
          rating: 4.8, // This might come from a different endpoint
          isOnline: true, // This might need a separate endpoint to track online status
        });
      }

      // Fetch assigned deliveries
      const deliveriesResponse = await api.get<RiderDeliveriesResponse>('/orders/driver/my-orders');
      if (deliveriesResponse.success && deliveriesResponse.data) {
        const formattedDeliveries = deliveriesResponse.data.deliveries.map((order: any) => ({
          id: order._id,
          orderNumber: order.orderNumber || `ORD-${order._id.toString().slice(-6).toUpperCase()}`,
          restaurantName: order.branch?.branchName || 'Unknown Restaurant',
          customerName: order.customer?.displayName || 'Unknown Customer',
          customerPhone: order.customer?.phoneNumber || 'N/A',
          deliveryAddress: order.deliveryAddress?.street || 'N/A',
          items: order.items?.map((item: any) => item.product?.name || 'Unknown Item') || [],
          totalAmount: order.totalAmount || 0,
          status: order.status || 'ASSIGNED',
          estimatedTime: '15 min', // This could be calculated based on distance/time
          distance: '2.3 km', // This could be calculated based on coordinates
        }));
        setDeliveries(formattedDeliveries);
      }

      // Fetch earnings data
      const earningsResponse = await api.get<RiderEarnings>('/dashboard/rider/earnings');
      if (earningsResponse.success && earningsResponse.data) {
        setEarnings(earningsResponse.data);
      }

    } catch (error) {
      console.error('Error fetching rider dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ASSIGNED: '#ff9800',
      PICKED_UP: '#9c27b0',
      IN_TRANSIT: '#2196f3',
      DELIVERED: '#4caf50',
    };
    return colors[status] || '#757575';
  };

  const renderDeliveryCard = (delivery: Delivery) => (
    <div
      key={delivery.id}
      style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '16px',
        borderLeft: `4px solid ${getStatusColor(delivery.status)}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>{delivery.orderNumber}</div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a2e' }}>{delivery.restaurantName}</div>
        </div>
        <span
          style={{
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 500,
            backgroundColor: getStatusColor(delivery.status) + '20',
            color: getStatusColor(delivery.status),
            textTransform: 'capitalize',
          }}
        >
          {delivery.status.replace('_', ' ')}
        </span>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>Customer:</div>
        <div style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a2e' }}>{delivery.customerName}</div>
        <div style={{ fontSize: '14px', color: '#666' }}>{delivery.customerPhone}</div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>📍 {delivery.deliveryAddress}</div>
        <div style={{ fontSize: '14px', color: '#666' }}>🚴 {delivery.distance} • ⏱️ {delivery.estimatedTime}</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '14px', color: '#666' }}>{delivery.items.join(', ')}</div>
        <div style={{ fontSize: '18px', fontWeight: 600, color: '#1976d2' }}>${delivery.totalAmount.toFixed(2)}</div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        {delivery.status === 'ASSIGNED' && (
          <button style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#9c27b0',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
          }}>
            Pick Up Order
          </button>
        )}
        {delivery.status === 'PICKED_UP' && (
          <button style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#2196f3',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
          }}>
            Start Delivery
          </button>
        )}
        {delivery.status === 'IN_TRANSIT' && (
          <button style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#4caf50',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
          }}>
            Mark Delivered
          </button>
        )}
        <button style={{
          padding: '10px 16px',
          backgroundColor: '#f5f5f5',
          color: '#666',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
        }}>
          📍 Navigate
        </button>
      </div>
    </div>
  );

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
        { id: 'deliveries', label: 'Deliveries', icon: '🚴' },
        { id: 'earnings', label: 'Earnings', icon: '💰' },
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

            {/* Online Status Toggle */}
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a2e' }}>
                  {stats.isOnline ? '🟢 Online' : '🔴 Offline'}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {stats.isOnline ? 'You are receiving delivery requests' : 'You are not receiving orders'}
                </div>
              </div>
              <button
                onClick={() => setStats((prev: RiderStats) => ({ ...prev, isOnline: !prev.isOnline }))}
                style={{
                  padding: '12px 24px',
                  backgroundColor: stats.isOnline ? '#dc3545' : '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                {stats.isOnline ? 'Go Offline' : 'Go Online'}
              </button>
            </div>

            {/* Stats Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}>
              <StatCard
                title="Today's Deliveries"
                value={stats.todayDeliveries}
                change={2}
                icon="📦"
                color="primary"
              />
              <StatCard
                title="Today's Earnings"
                value={`$${stats.todayEarnings.toFixed(2)}`}
                change={15}
                icon="💰"
                color="success"
              />
              <StatCard
                title="Total Deliveries"
                value={stats.totalDeliveries}
                change={8}
                icon="🚴"
                color="info"
              />
              <StatCard
                title="Rating"
                value={stats.rating}
                change={0.2}
                icon="⭐"
                color="warning"
              />
            </div>

            {/* Current Deliveries */}
            <div>
              <h3 style={{ margin: '0 0 16px 0', color: '#1a1a2e' }}>Current Deliveries</h3>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Loading...</div>
              ) : deliveries.filter(d => d.status !== 'DELIVERED').length > 0 ? (
                deliveries.filter(d => d.status !== 'DELIVERED').map(renderDeliveryCard)
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No active deliveries</div>
              )}
            </div>
          </div>
        );

      case 'deliveries':
        return (
          <div>
            {renderTabNavigation()}
            <h2 style={{ margin: '0 0 20px 0', color: '#1a1a2e' }}>My Deliveries</h2>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Loading...</div>
            ) : deliveries.length > 0 ? (
              deliveries.map(renderDeliveryCard)
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No deliveries yet</div>
            )}
          </div>
        );

      case 'earnings':
        return (
          <div>
            {renderTabNavigation()}
            <h2 style={{ margin: '0 0 20px 0', color: '#1a1a2e' }}>Earnings</h2>
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '20px',
            }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Total Earnings</div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: '#1a1a2e' }}>
                ${earnings?.totalEarnings?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}>
              <div style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}>
                <div style={{ fontSize: '14px', color: '#666' }}>This Week</div>
                <div style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a2e' }}>
                  ${earnings?.thisWeekEarnings?.toFixed(2) || '0.00'}
                </div>
              </div>
              <div style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}>
                <div style={{ fontSize: '14px', color: '#666' }}>This Month</div>
                <div style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a2e' }}>
                  ${earnings?.thisMonthEarnings?.toFixed(2) || '0.00'}
                </div>
              </div>
              <div style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}>
                <div style={{ fontSize: '14px', color: '#666' }}>Last Month</div>
                <div style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a2e' }}>
                  ${earnings?.lastMonthEarnings?.toFixed(2) || '0.00'}
                </div>
              </div>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div>
            {renderTabNavigation()}
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
                  defaultValue="Mike Johnson"
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
                  defaultValue="mike@example.com"
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
                <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '8px' }}>Vehicle Number</label>
                <input
                  type="text"
                  defaultValue="NY-12345"
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
                <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '8px' }}>Vehicle Type</label>
                <select style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}>
                  <option>Bicycle</option>
                  <option>Motorcycle</option>
                  <option>Car</option>
                  <option>Van</option>
                </select>
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
      title="Rider Dashboard"
      onNavigate={handleNavigation}
    >
      {renderTabContent()}
    </DashboardLayout>
  );
}
