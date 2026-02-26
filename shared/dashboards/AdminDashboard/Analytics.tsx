import { useEffect, useState } from 'react';
import { StatCard } from '../../dashboards/components/StatCard';
import { api } from '../../api/client';
import { AdminStats } from '../../api/dashboard';

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  topRestaurants: Array<{
    name: string;
    revenue: number;
    orders: number;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    orders: number;
  }>;
  userGrowth: Array<{
    month: string;
    users: number;
  }>;
  orderStatusDistribution: {
    pending: number;
    confirmed: number;
    preparing: number;
    ready: number;
    out_for_delivery: number;
    delivered: number;
    cancelled: number;
  };
}

export function Analytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Call the admin analytics API
      const response = await api.get<AnalyticsData>(`/dashboard/admin/analytics?range=${timeRange}`);
      
      if (response.success && response.data) {
        setAnalyticsData(response.data);
      } else {
        // If API not ready, show admin stats as fallback
        const statsResponse = await api.get<AdminStats>(`/dashboard/admin/stats`);
        if (statsResponse.success && statsResponse.data) {
          const stats = statsResponse.data;
          // Build minimal analytics from stats
          setAnalyticsData({
            totalRevenue: stats.totalRevenue,
            totalOrders: stats.totalOrders,
            averageOrderValue: stats.totalOrders > 0 
              ? Math.round(stats.totalRevenue / stats.totalOrders) 
              : 0,
            topRestaurants: [],
            revenueByMonth: [],
            userGrowth: [],
            orderStatusDistribution: {
              pending: 0,
              confirmed: 0,
              preparing: 0,
              ready: 0,
              out_for_delivery: 0,
              delivered: 0,
              cancelled: 0,
            },
          });
        } else {
          setError('Failed to fetch analytics');
        }
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div>Loading analytics...</div>
      </div>
    );
  }

  if (error || !analyticsData) {
    return (
      <div style={{
        padding: '20px',
        backgroundColor: '#ffebee',
        color: '#c62828',
        borderRadius: '8px',
        textAlign: 'center',
      }}>
        {error || 'Failed to load analytics data'}
      </div>
    );
  }

  // Calculate max values for dynamic scaling
  const maxRevenue = Math.max(...analyticsData.revenueByMonth.map(d => d.revenue));
  const maxOrderCount = Math.max(...Object.values(analyticsData.orderStatusDistribution));
  const maxUsers = Math.max(...analyticsData.userGrowth.map(d => d.users));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header with time range selector */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <h2 style={{ margin: 0, color: '#1a1a2e' }}>Analytics Dashboard</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['7d', '30d', '90d', '1y'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              style={{
                padding: '8px 16px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                backgroundColor: timeRange === range ? '#1976d2' : '#fff',
                color: timeRange === range ? '#fff' : '#666',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
      }}>
        <StatCard
          title="Total Revenue"
          value={`$${analyticsData.totalRevenue.toLocaleString()}`}
          change={23}
          icon="💰"
          color="success"
        />
        <StatCard
          title="Total Orders"
          value={analyticsData.totalOrders.toLocaleString()}
          change={18}
          icon="📦"
          color="primary"
        />
        <StatCard
          title="Average Order Value"
          value={`$${analyticsData.averageOrderValue.toFixed(2)}`}
          change={8}
          icon="📊"
          color="warning"
        />
        <StatCard
          title="Active Users"
          value="1,247"
          change={15}
          icon="👥"
          color="info"
        />
      </div>

      {/* Charts Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '24px',
      }}>
        {/* Revenue Chart Placeholder */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#1a1a2e' }}>Revenue Trend</h3>
          <div style={{
            height: '200px',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '8px',
            padding: '20px 0',
          }}>
            {analyticsData.revenueByMonth.map((data, _index) => (
              <div key={data.month} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div
                  style={{
                    width: '100%',
                    height: `${(data.revenue / maxRevenue) * 150}px`,
                    backgroundColor: '#1976d2',
                    borderRadius: '4px 4px 0 0',
                    marginBottom: '8px',
                    transition: 'all 0.3s ease',
                  }}
                />
                <span style={{ fontSize: '12px', color: '#666', fontWeight: 500 }}>{data.month}</span>
                <span style={{ fontSize: '10px', color: '#999' }}>${(data.revenue / 1000).toFixed(0)}k</span>
              </div>
            ))}
          </div>
          <p style={{ margin: '16px 0 0 0', fontSize: '14px', color: '#666', textAlign: 'center' }}>
            Monthly revenue for the last 3 months
          </p>
        </div>

        {/* Top Restaurants */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#1a1a2e' }}>Top Performing Restaurants</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {analyticsData.topRestaurants.map((restaurant, index) => (
              <div key={restaurant.name} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#1976d2',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}>
                    {index + 1}
                  </span>
                  <div>
                    <div style={{ fontWeight: 500, color: '#1a1a2e' }}>{restaurant.name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{restaurant.orders} orders</div>
                  </div>
                </div>
                <div style={{ fontWeight: 600, color: '#1976d2' }}>
                  ${restaurant.revenue.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Analytics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
      }}>
        {/* Order Status Distribution */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#1a1a2e' }}>Order Status Distribution</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(analyticsData.orderStatusDistribution).map(([status, count]) => (
              <div key={status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  textTransform: 'capitalize',
                  fontSize: '14px',
                  color: '#666',
                  fontWeight: 500,
                }}>
                  {status.replace('_', ' ')}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: `${(count / maxOrderCount) * 150}px`,
                    height: '8px',
                    backgroundColor: status === 'delivered' ? '#4caf50' :
                                   status === 'confirmed' ? '#2196f3' :
                                   status === 'preparing' ? '#ff9800' :
                                   status === 'pending' ? '#9c27b0' : '#757575',
                    borderRadius: '4px',
                  }} />
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Growth */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#1a1a2e' }}>User Growth</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {analyticsData.userGrowth.map((data, _index) => (
              <div key={data.month} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#666' }}>{data.month}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: `${(data.users / maxUsers) * 150}px`,
                    height: '6px',
                    backgroundColor: '#4caf50',
                    borderRadius: '3px',
                  }} />
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>
                    {data.users}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p style={{ margin: '16px 0 0 0', fontSize: '12px', color: '#999', textAlign: 'center' }}>
            New user registrations over time
          </p>
        </div>
      </div>
    </div>
  );
}
