import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { StatCard } from '../../dashboards/components/StatCard';
import { getNavigationItems } from '../../dashboards/components/NavigationMenu';
import { api } from '../../api/client';

type TabType = 'overview' | 'staff' | 'orders' | 'inventory' | 'analytics';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'WAITER' | 'CHEF' | 'RIDER';
  phone: string;
  isActive: boolean;
  shift: string;
}

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  reorderLevel: number;
  unit: string;
  lastRestocked: string;
}

interface BranchAnalytics {
  weeklyRevenue: number;
  monthlyOrders: number;
  averageOrderValue: number;
  changePercentages: {
    revenue: number;
    orders: number;
    avgValue: number;
  };
}

interface BranchStats {
  totalOrders: number;
  todayOrders: number;
  revenue: number;
  activeStaff: number;
  customerRating?: number;
  tablesOccupied?: number;
  totalTables?: number;
}

interface BranchStaffResponse {
  staff: StaffMember[];
}

interface BranchInventoryResponse {
  inventory: InventoryItem[];
}

interface BranchAnalyticsResponse {
  analytics: BranchAnalytics;
}

export function BranchManagerDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [stats, setStats] = useState<BranchStats>({
    totalOrders: 0,
    todayOrders: 0,
    revenue: 0,
    activeStaff: 0,
  });
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [analytics, setAnalytics] = useState<BranchAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const navigationItems = getNavigationItems('BRANCH_MANAGER');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch branch stats
      const statsResponse = await api.get<BranchStats>('/dashboard/manager/stats');
      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }

      // Fetch staff
      const staffResponse = await api.get<BranchStaffResponse>('/dashboard/manager/staff');
      if (staffResponse.success && staffResponse.data) {
        setStaff(staffResponse.data.staff || []);
      }

      // Fetch inventory
      const inventoryResponse = await api.get<BranchInventoryResponse>('/dashboard/manager/inventory');
      if (inventoryResponse.success && inventoryResponse.data) {
        setInventory(inventoryResponse.data.inventory || []);
      }

      // Fetch analytics
      const analyticsResponse = await api.get<BranchAnalyticsResponse>('/dashboard/manager/analytics?range=30d');
      if (analyticsResponse.success && analyticsResponse.data) {
        setAnalytics(analyticsResponse.data.analytics);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      WAITER: '#9c27b0',
      CHEF: '#ff9800',
      RIDER: '#2196f3',
    };
    return colors[role] || '#757575';
  };

  const renderStaffCard = (member: StaffMember) => (
    <div
      key={member.id}
      style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          backgroundColor: getRoleColor(member.role) + '20',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
        }}>
          {member.role === 'WAITER' ? '🍽️' : member.role === 'CHEF' ? '👨‍🍳' : '🚴'}
        </div>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a2e' }}>{member.name}</div>
          <div style={{ fontSize: '14px', color: '#666' }}>{member.email}</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
            📞 {member.phone} • 🕐 {member.shift}
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <span
          style={{
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 500,
            backgroundColor: getRoleColor(member.role) + '20',
            color: getRoleColor(member.role),
            textTransform: 'capitalize',
          }}
        >
          {member.role.replace('_', ' ')}
        </span>
        <div style={{ marginTop: '8px' }}>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              backgroundColor: member.isActive ? '#e8f5e9' : '#ffebee',
              color: member.isActive ? '#2e7d32' : '#c62828',
            }}
          >
            {member.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
    </div>
  );

  const renderInventoryCard = (item: InventoryItem) => {
    const isLowStock = item.quantity <= item.reorderLevel;
    return (
      <div
        key={item.id}
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: isLowStock ? '2px solid #f44336' : 'none',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a2e' }}>{item.name}</div>
          {isLowStock && (
            <span style={{
              padding: '4px 8px',
              backgroundColor: '#ffebee',
              color: '#c62828',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
            }}>
              Low Stock!
            </span>
          )}
        </div>
        <div style={{ fontSize: '24px', fontWeight: 700, color: isLowStock ? '#f44336' : '#1a1a2e', marginBottom: '8px' }}>
          {item.quantity} <span style={{ fontSize: '14px', fontWeight: 400 }}>{item.unit}</span>
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          Reorder at: {item.reorderLevel} {item.unit}
        </div>
        <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
          Last restocked: {item.lastRestocked}
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
        { id: 'staff', label: 'Staff', icon: '👥' },
        { id: 'orders', label: 'Orders', icon: '🍽️' },
        { id: 'inventory', label: 'Inventory', icon: '📦' },
        { id: 'analytics', label: 'Analytics', icon: '📈' },
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

            {/* Branch Info */}
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}>
              <div style={{ fontSize: '20px', fontWeight: 600, color: '#1a1a2e', marginBottom: '8px' }}>
                Main Branch - Gulberg
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                📍 Main Boulevard, Gulberg III, Lahore
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                📞 +92-300-1234567 • ✉️ gulberg@restaurant.pk
              </div>
            </div>

            {/* Stats Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}>
              <StatCard
                title="Today's Orders"
                value={stats.totalOrders}
                change={15}
                icon="🍽️"
                color="primary"
              />
              <StatCard
                title="Today's Revenue"
                value={`$${stats.revenue.toFixed(2)}`}
                change={12}
                icon="💰"
                color="success"
              />
              <StatCard
                title="Active Staff"
                value={stats.activeStaff}
                change={2}
                icon="👥"
                color="info"
              />
              <StatCard
                title="Customer Rating"
                value={stats.customerRating}
                change={0.2}
                icon="⭐"
                color="warning"
              />
            </div>

            {/* Tables Status */}
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a2e', marginBottom: '16px' }}>
                Table Status
              </div>
              <div style={{ display: 'flex', gap: '24px' }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: '#f44336' }}>{stats.tablesOccupied}</div>
                  <div style={{ fontSize: '14px', color: '#666' }}>Occupied</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: '#4caf50' }}>{stats.totalTables - stats.tablesOccupied}</div>
                  <div style={{ fontSize: '14px', color: '#666' }}>Available</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: '#1a1a2e' }}>{stats.totalTables}</div>
                  <div style={{ fontSize: '14px', color: '#666' }}>Total</div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
            }}>
              {/* Staff Overview */}
              <div style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a2e', marginBottom: '16px' }}>
                  Staff on Duty
                </div>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Loading...</div>
                ) : staff.filter(s => s.isActive).slice(0, 3).map(renderStaffCard)}
              </div>

              {/* Low Stock Alert */}
              <div style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a2e', marginBottom: '16px' }}>
                  ⚠️ Low Stock Items
                </div>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Loading...</div>
                ) : inventory.filter(i => i.quantity <= i.reorderLevel).length > 0 ? (
                  inventory.filter(i => i.quantity <= i.reorderLevel).slice(0, 3).map(renderInventoryCard)
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#4caf50' }}>All items well stocked!</div>
                )}
              </div>
            </div>
          </div>
        );

      case 'staff':
        return (
          <div>
            {renderTabNavigation()}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#1a1a2e' }}>Staff Management</h2>
              <button style={{
                padding: '10px 20px',
                backgroundColor: '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}>
                + Add Staff
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Loading...</div>
              ) : staff.map(renderStaffCard)}
            </div>
          </div>
        );

      case 'orders':
        return (
          <div>
            {renderTabNavigation()}
            <h2 style={{ margin: '0 0 20px 0', color: '#1a1a2e' }}>Branch Orders</h2>
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textAlign: 'center',
              paddingTop: '60px',
              paddingBottom: '60px',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
              <div style={{ fontSize: '18px', color: '#666' }}>Order management view coming soon</div>
            </div>
          </div>
        );

      case 'inventory':
        return (
          <div>
            {renderTabNavigation()}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#1a1a2e' }}>Inventory</h2>
              <button style={{
                padding: '10px 20px',
                backgroundColor: '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}>
                + Add Item
              </button>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '16px',
            }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Loading...</div>
              ) : inventory.map(renderInventoryCard)}
            </div>
          </div>
        );

      case 'analytics':
        return (
          <div>
            {renderTabNavigation()}
            <h2 style={{ margin: '0 0 20px 0', color: '#1a1a2e' }}>Branch Analytics</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
            }}>
              <div style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Monthly Revenue</div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: '#1a1a2e' }}>${analytics?.weeklyRevenue?.toLocaleString() || '0'}</div>
                <div style={{ fontSize: '14px', color: analytics?.changePercentages?.revenue !== undefined && analytics.changePercentages.revenue >= 0 ? '#4caf50' : '#f44336' }}>
                  {analytics?.changePercentages?.revenue !== undefined && analytics.changePercentages.revenue >= 0 ? '↑' : '↓'} {Math.abs(analytics?.changePercentages?.revenue || 0)}% vs last period
                </div>
              </div>
              <div style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Monthly Orders</div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: '#1a1a2e' }}>{analytics?.monthlyOrders?.toLocaleString() || '0'}</div>
                <div style={{ fontSize: '14px', color: analytics?.changePercentages?.orders !== undefined && analytics.changePercentages.orders >= 0 ? '#4caf50' : '#f44336' }}>
                  {analytics?.changePercentages?.orders !== undefined && analytics.changePercentages.orders >= 0 ? '↑' : '↓'} {Math.abs(analytics?.changePercentages?.orders || 0)}% vs last period
                </div>
              </div>
              <div style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Average Order Value</div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: '#1a1a2e' }}>${analytics?.averageOrderValue?.toFixed(2) || '0.00'}</div>
                <div style={{ fontSize: '14px', color: analytics?.changePercentages?.avgValue !== undefined && analytics.changePercentages.avgValue >= 0 ? '#4caf50' : '#f44336' }}>
                  {analytics?.changePercentages?.avgValue !== undefined && analytics.changePercentages.avgValue >= 0 ? '↑' : '↓'} {Math.abs(analytics?.changePercentages?.avgValue || 0)}% vs last period
                </div>
              </div>
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
      title="Branch Manager Dashboard"
    >
      {renderTabContent()}
    </DashboardLayout>
  );
}
