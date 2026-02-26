import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { StatCard } from '../../dashboards/components/StatCard';
import { getNavigationItems } from '../../dashboards/components/NavigationMenu';
import { api } from '../../api/client';

type TabType = 'overview' | 'tables' | 'orders' | 'profile';

interface Table {
  id: string;
  tableNumber: string;
  seatingCapacity: number;
  section: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';
  currentOrderId?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  tableNumber: string;
  items: Array<{
    name: string;
    quantity: number;
    status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED';
  }>;
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'SERVED';
  specialInstructions?: string;
  orderTime: string;
}

interface WaiterStats {
  activeTables: number;
  ordersToServe: number;
  ordersServed: number;
  tipsEarned: number;
}

interface WaiterOrdersResponse {
  orders: Order[];
}

export function WaiterDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [stats, setStats] = useState<WaiterStats>({
    activeTables: 0,
    ordersToServe: 0,
    ordersServed: 0,
    tipsEarned: 0,
  });
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const navigationItems = getNavigationItems('WAITER');

  const handleNavigation = (path: string) => {
    const tabMapping: Record<string, TabType> = {
      '/waiter/overview': 'overview',
      '/waiter/tables': 'tables',
      '/waiter/orders': 'orders',
      '/waiter/profile': 'profile',
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

      // Fetch waiter stats
      const statsResponse = await api.get<WaiterStats>('/dashboard/waiter/stats');
      if (statsResponse.success && statsResponse.data) {
        setStats({
          activeTables: statsResponse.data.activeTables || 0,
          ordersToServe: statsResponse.data.ordersToServe || 0,
          ordersServed: statsResponse.data.activeTables || 0, // Using as placeholder
          tipsEarned: 0, // This would need a separate endpoint for tips
        });
      }

      // Fetch dine-in orders (orders that need to be served)
      const ordersResponse = await api.get<WaiterOrdersResponse>('/orders?orderType=DINE_IN&status=READY');
      if (ordersResponse.success && ordersResponse.data) {
        const formattedOrders = ordersResponse.data.orders.map((order: any) => ({
          id: order._id,
          orderNumber: order.orderNumber || `ORD-${order._id.toString().slice(-6).toUpperCase()}`,
          tableNumber: order.tableNumber || 'T-01',
          items: order.items.map((item: any) => ({
            name: item.productName || 'Unknown Item',
            quantity: item.quantity,
            status: item.status || 'PENDING'
          })),
          status: order.status || 'PENDING',
          specialInstructions: order.specialInstructions,
          orderTime: order.createdAt ? new Date(order.createdAt).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          }) : 'Unknown'
        }));
        setOrders(formattedOrders);
      }

      // Mock tables data for now (would need table management system)
      setTables([
        { id: '1', tableNumber: 'T-01', seatingCapacity: 4, section: 'Main Hall', status: 'OCCUPIED', currentOrderId: '1' },
        { id: '2', tableNumber: 'T-02', seatingCapacity: 2, section: 'Main Hall', status: 'AVAILABLE' },
        { id: '3', tableNumber: 'T-03', seatingCapacity: 6, section: 'VIP Section', status: 'RESERVED' },
        { id: '4', tableNumber: 'T-04', seatingCapacity: 4, section: 'Main Hall', status: 'OCCUPIED', currentOrderId: '2' },
        { id: '5', tableNumber: 'T-05', seatingCapacity: 2, section: 'Window Side', status: 'CLEANING' },
      ]);

    } catch (error) {
      console.error('Error fetching waiter dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTableStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      AVAILABLE: '#4caf50',
      OCCUPIED: '#f44336',
      RESERVED: '#ff9800',
      CLEANING: '#2196f3',
    };
    return colors[status] || '#757575';
  };

  const getOrderStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: '#ff9800',
      CONFIRMED: '#2196f3',
      PREPARING: '#9c27b0',
      READY: '#00bcd4',
      SERVED: '#4caf50',
    };
    return colors[status] || '#757575';
  };

  const renderTableCard = (table: Table) => (
    <div
      key={table.id}
      style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        border: `2px solid ${getTableStatusColor(table.status)}`,
        cursor: 'pointer',
        transition: 'transform 0.2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a2e' }}>{table.tableNumber}</div>
        <span
          style={{
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 500,
            backgroundColor: getTableStatusColor(table.status) + '20',
            color: getTableStatusColor(table.status),
            textTransform: 'capitalize',
          }}
        >
          {table.status.toLowerCase()}
        </span>
      </div>
      <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
        👥 Capacity: {table.seatingCapacity}
      </div>
      <div style={{ fontSize: '14px', color: '#666' }}>
        📍 {table.section}
      </div>
    </div>
  );

  const renderOrderCard = (order: Order) => (
    <div
      key={order.id}
      style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '16px',
        borderLeft: `4px solid ${getOrderStatusColor(order.status)}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>{order.orderNumber}</div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a2e' }}>
            Table {order.tableNumber}
          </div>
        </div>
        <span
          style={{
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 500,
            backgroundColor: getOrderStatusColor(order.status) + '20',
            color: getOrderStatusColor(order.status),
            textTransform: 'capitalize',
          }}
        >
          {order.status.toLowerCase()}
        </span>
      </div>

      <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>🕐 {order.orderTime}</div>

      {order.specialInstructions && (
        <div style={{
          backgroundColor: '#fff3e0',
          padding: '8px 12px',
          borderRadius: '6px',
          marginBottom: '12px',
          fontSize: '14px',
          color: '#e65100',
        }}>
          ⚠️ {order.specialInstructions}
        </div>
      )}

      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '14px', fontWeight: 500, color: '#666', marginBottom: '8px' }}>Items:</div>
        {order.items.map((item, index) => (
          <div key={index} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
            marginBottom: '4px',
          }}>
            <span style={{ fontSize: '14px', color: '#1a1a2e' }}>
              {item.quantity}x {item.name}
            </span>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                backgroundColor: getOrderStatusColor(item.status) + '20',
                color: getOrderStatusColor(item.status),
                textTransform: 'capitalize',
              }}
            >
              {item.status.toLowerCase()}
            </span>
          </div>
        ))}
      </div>

      {order.status === 'READY' && (
        <button style={{
          width: '100%',
          padding: '10px',
          backgroundColor: '#4caf50',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 500,
        }}>
          Mark as Served
        </button>
      )}
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
        { id: 'tables', label: 'Tables', icon: '🪑' },
        { id: 'orders', label: 'Orders', icon: '🍽️' },
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
                title="Tables Assigned"
                value={stats.activeTables}
                change={0}
                icon="🪑"
                color="primary"
              />
              <StatCard
                title="Active Orders"
                value={stats.ordersToServe}
                change={1}
                icon="🍽️"
                color="warning"
              />
              <StatCard
                title="Orders Served"
                value={stats.ordersServed}
                change={5}
                icon="✅"
                color="success"
              />
              <StatCard
                title="Tips Earned"
                value={`$${stats.tipsEarned.toFixed(2)}`}
                change={12}
                icon="💵"
                color="info"
              />
            </div>

            {/* Tables Overview */}
            <div>
              <h3 style={{ margin: '0 0 16px 0', color: '#1a1a2e' }}>My Tables</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '16px',
              }}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Loading...</div>
                ) : tables.map(renderTableCard)}
              </div>
            </div>

            {/* Active Orders */}
            <div>
              <h3 style={{ margin: '0 0 16px 0', color: '#1a1a2e' }}>Active Orders</h3>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Loading...</div>
              ) : orders.filter(o => o.status !== 'SERVED').length > 0 ? (
                orders.filter(o => o.status !== 'SERVED').slice(0, 3).map(renderOrderCard)
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No active orders</div>
              )}
            </div>
          </div>
        );

      case 'tables':
        return (
          <div>
            {renderTabNavigation()}
            <h2 style={{ margin: '0 0 20px 0', color: '#1a1a2e' }}>Table Management</h2>

            {/* Table Actions */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '20px',
              flexWrap: 'wrap',
            }}>
              <button style={{
                padding: '10px 16px',
                backgroundColor: '#4caf50',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}>
                + Add New Table
              </button>
              <button style={{
                padding: '10px 16px',
                backgroundColor: '#ff9800',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}>
                Assign Tables
              </button>
            </div>

            {/* Table Status Filters */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '20px',
              flexWrap: 'wrap',
            }}>
              {['ALL', 'AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING'].map((filter) => (
                <button
                  key={filter}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: filter === 'ALL' ? '#1976d2' : '#f5f5f5',
                    color: filter === 'ALL' ? '#fff' : '#666',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '16px',
            }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666', gridColumn: '1 / -1' }}>Loading tables...</div>
              ) : tables.map(renderTableCard)}
            </div>
          </div>
        );

      case 'orders':
        return (
          <div>
            {renderTabNavigation()}
            <h2 style={{ margin: '0 0 20px 0', color: '#1a1a2e' }}>Orders to Serve</h2>

            {/* Order Filters and Actions */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '20px',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={{
                  padding: '8px 16px',
                  backgroundColor: '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}>
                  All Orders
                </button>
                <button style={{
                  padding: '8px 16px',
                  backgroundColor: '#f5f5f5',
                  color: '#666',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}>
                  Ready to Serve
                </button>
                <button style={{
                  padding: '8px 16px',
                  backgroundColor: '#f5f5f5',
                  color: '#666',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}>
                  Pending
                </button>
              </div>

              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                <button style={{
                  padding: '8px 16px',
                  backgroundColor: '#4caf50',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}>
                  Mark All Served
                </button>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Loading orders...</div>
            ) : orders.length > 0 ? (
              <div style={{
                display: 'grid',
                gap: '16px',
                gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
              }}>
                {orders.map(renderOrderCard)}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: '#666',
                backgroundColor: '#f9f9f9',
                borderRadius: '12px',
                border: '2px dashed #ddd',
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍽️</div>
                <div style={{ fontSize: '18px', fontWeight: 500, marginBottom: '8px' }}>No Orders to Serve</div>
                <div>All orders have been served or there are no pending orders.</div>
              </div>
            )}
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
                  defaultValue="Sarah Wilson"
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
                  defaultValue="sarah@example.com"
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
                <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '8px' }}>Assigned Section</label>
                <input
                  type="text"
                  defaultValue="Main Hall"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px',
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
      title="Waiter Dashboard"
      onNavigate={handleNavigation}
    >
      {renderTabContent()}
    </DashboardLayout>
  );
}
