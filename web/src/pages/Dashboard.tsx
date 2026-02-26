import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import './Dashboard.css';

interface DashboardStats {
  totalOrdersToday: number;
  totalRevenue: number;
  activeRiders: number;
  activeTables: number;
  totalTables: number;
  revenueChange: number;
  ordersChange: number;
}

interface RecentOrder {
  _id: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  status: string;
  itemCount: number;
  createdAt: string;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrdersToday: 0,
    totalRevenue: 0,
    activeRiders: 0,
    activeTables: 0,
    totalTables: 24,
    revenueChange: 0,
    ordersChange: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    // Get user role from localStorage with proper validation
    const storedRole = localStorage.getItem('userRole');
    const validRoles = ['ADMIN', 'CHEF', 'WAITER', 'RIDER', 'CUSTOMER'];
    const role = (storedRole && validRoles.includes(storedRole)) ? storedRole : 'CUSTOMER';
    setUserRole(role);
    
    loadDashboardData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Only load admin-specific data for ADMIN users
      if (userRole === 'ADMIN') {
        const [statsResponse, ordersResponse] = await Promise.all([
          api.getDashboardStats(),
          api.getAllOrders(),
        ]);

        if (statsResponse.success && statsResponse.data) {
          setStats(statsResponse.data as DashboardStats);
        }

        if (ordersResponse.success && ordersResponse.data) {
          // Get recent orders (last 5)
          const ordersData = ordersResponse.data as { orders: RecentOrder[] };
          const sorted = (ordersData.orders || [])
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5);
          setRecentOrders(sorted);
        }
      } else {
        // For non-admin users, set default/empty data
        setStats({
          totalOrdersToday: 0,
          totalRevenue: 0,
          activeRiders: 0,
          activeTables: 0,
          totalTables: 24,
          revenueChange: 0,
          ordersChange: 0,
        });
        setRecentOrders([]);
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Failed to load dashboard data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60);
    
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff} min ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)} hours ago`;
    return `${Math.floor(diff / 1440)} days ago`;
  };

  const getBadgeClass = (status: string) => {
    const classes: Record<string, string> = {
      PENDING: 'badge-pending',
      CONFIRMED: 'badge-confirmed',
      PREPARING: 'badge-preparing',
      READY: 'badge-ready',
      DELIVERED: 'badge-delivered',
      CANCELLED: 'badge-cancelled',
    };
    return classes[status] || 'badge-pending';
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading">Loading dashboard data...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">
            Admin Dashboard
          </h1>
          <p className="page-subtitle">
            Overview of your restaurant operations
          </p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-outline">
            📅 Today
          </button>
          <button className="btn btn-primary">
            📊 Export
          </button>
        </div>
      </div>

      {/* Page Content */}
      <div className="page-content">
        {error && (
          <div className="alert alert-error" style={{ 
            padding: '15px 20px',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            borderRadius: '8px'
          }}>
            <div>
              <strong>⚠️ Error:</strong> {error}
            </div>
            <button 
              onClick={loadDashboardData} 
              className="btn btn-primary"
              style={{ marginLeft: '15px', whiteSpace: 'nowrap' }}
            >
              🔄 Retry
            </button>
          </div>
        )}

        {/* Role-based Content */}
        {/* Admin Dashboard - only content available since other roles use mobile apps */}
        <>
          {/* Admin Stats Grid */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-card-icon" style={{background: 'var(--primary-light)'}}>
                  📦
                </div>
              </div>
              <div className="stat-card-content">
                <p className="stat-card-label">Total Orders Today</p>
                <h3 className="stat-card-value">{stats.totalOrdersToday}</h3>
              </div>
              <div className="stat-card-footer">
                <span className={`stat-trend ${stats.ordersChange >= 0 ? 'positive' : 'negative'}`}>
                  {stats.ordersChange >= 0 ? '↑' : '↓'} {Math.abs(stats.ordersChange).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-card-icon" style={{background: '#E8F5E9'}}>
                  💰
                </div>
              </div>
              <div className="stat-card-content">
                <p className="stat-card-label">Total Revenue</p>
                <h3 className="stat-card-value">{formatCurrency(stats.totalRevenue)}</h3>
              </div>
              <div className="stat-card-footer">
                <span className={`stat-trend ${stats.revenueChange >= 0 ? 'positive' : 'negative'}`}>
                  {stats.revenueChange >= 0 ? '↑' : '↓'} {Math.abs(stats.revenueChange).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-card-icon" style={{background: '#E3F2FD'}}>
                  🏍️
                </div>
              </div>
              <div className="stat-card-content">
                <p className="stat-card-label">Active Riders</p>
                <h3 className="stat-card-value">{stats.activeRiders}</h3>
              </div>
              <div className="stat-card-footer">
                <span className="stat-trend neutral">Online now</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-card-icon" style={{background: '#F3E5F5'}}>
                  🪑
                </div>
              </div>
              <div className="stat-card-content">
                <p className="stat-card-label">Active Tables</p>
                <h3 className="stat-card-value">{stats.activeTables}/{stats.totalTables}</h3>
              </div>
              <div className="stat-card-footer">
                <span className="stat-trend neutral">Currently occupied</span>
              </div>
            </div>
          </div>

          {/* Recent Orders Card for Admin */}
          <div className="content-card">
            <div className="content-card-header">
              <h2 className="content-card-title">Recent Orders</h2>
              <div className="content-card-actions">
                <button className="btn btn-outline btn-sm" onClick={() => window.location.href = '/orders'}>
                  View All →
                </button>
              </div>
            </div>
            <div className="content-card-body no-padding">
              {recentOrders.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📦</div>
                  <h3 className="empty-state-title">No recent orders</h3>
                  <p className="empty-state-message">No orders have been placed recently</p>
                </div>
              ) : (
                <div className="orders-list">
                  {recentOrders.map((order) => (
                    <div className="order-item" key={order._id}>
                      <div className="order-info">
                        <p className="order-number">{order.orderNumber}</p>
                        <p className="order-customer">{order.customerName || 'Guest'}</p>
                      </div>
                      <div className="order-details">
                        <p className="order-price">{formatCurrency(order.totalAmount)}</p>
                        <p className="order-time">{getTimeAgo(order.createdAt)}</p>
                      </div>
                      <div className="order-meta">
                        <span className={`badge ${getBadgeClass(order.status)}`}>
                          {order.status}
                        </span>
                        <p className="order-items">{order.itemCount} items</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      </div>
    </div>
  );
};

export default Dashboard;
