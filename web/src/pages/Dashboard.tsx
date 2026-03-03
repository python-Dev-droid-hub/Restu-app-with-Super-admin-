import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import './Dashboard.css';

interface DashboardStats {
  totalOrdersToday: number;
  totalRevenue: number;
  activeRiders: number;
  activeTables: number;
  totalTables: number;
  revenueChange: number;
  ordersChange: number;
  branchUsers?: number;
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
  const { t } = useLanguage();
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
    const validRoles = ['ADMIN', 'SUPER_ADMIN', 'CHEF', 'WAITER', 'RIDER', 'CUSTOMER'];
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
      console.log('🖥️ [DASHBOARD] Loading dashboard data for role:', userRole);
            // Load admin-specific data for ADMIN and SUPER_ADMIN users
      if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
        console.log('🖥️ [DASHBOARD] Loading admin/super-admin dashboard data');
        
        // Use different API methods based on user role
        const statsApi = userRole === 'SUPER_ADMIN' ? api.getSuperAdminStats() : api.getDashboardStats();
        
        const [statsResponse, ordersResponse, usersResponse] = await Promise.all([
          statsApi,
          api.getAllOrders(),
          api.getAllUsers(),
        ]);

        console.log('🖥️ [DASHBOARD] Stats response:', statsResponse);
        console.log('🖥️ [DASHBOARD] Orders response:', ordersResponse);
        console.log('🖥️ [DASHBOARD] Users response:', usersResponse);

        if (statsResponse.success && statsResponse.data) {
          const statsData = statsResponse.data as DashboardStats;
          // Add branch users count from users API
          if (usersResponse.success && usersResponse.data) {
            const usersData = usersResponse.data as { users: any[]; total: number };
            statsData.branchUsers = usersData.total || usersData.users?.length || 0;
          }
          setStats(statsData);
          console.log('🖥️ [DASHBOARD] Stats loaded successfully:', statsData);
        } else {
          console.error('🖥️ [DASHBOARD] Failed to load stats:', statsResponse);
        }

        if (ordersResponse.success && ordersResponse.data) {
          // Get recent orders (last 5)
          const ordersData = ordersResponse.data as { orders: RecentOrder[] };
          const sorted = (ordersData.orders || [])
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5);
          setRecentOrders(sorted);
          console.log('🖥️ [DASHBOARD] Recent orders loaded:', sorted.length, 'orders');
        } else {
          console.error('🖥️ [DASHBOARD] Failed to load orders:', ordersResponse);
        }
      } else {
        // For non-admin users, set default/empty data
        console.log('🖥️ [DASHBOARD] Non-admin user - setting default data');
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
      console.error('🖥️ [DASHBOARD] Error loading dashboard:', err);
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
            {t('adminDashboard')}
          </h1>
          <p className="page-subtitle">
            {t('overview')}
          </p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-outline">
            📅 {t('today')}
          </button>
          <button className="btn btn-primary">
            📊 {t('export')}
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
              <strong>⚠️ {t('error')}:</strong> {error}
            </div>
            <button 
              onClick={loadDashboardData} 
              className="btn btn-primary"
              style={{ marginLeft: '15px', whiteSpace: 'nowrap' }}
            >
              🔄 {t('retry')}
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
                <p className="stat-card-label">{t('totalOrdersToday')}</p>
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
                <p className="stat-card-label">{t('totalRevenue')}</p>
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
                <p className="stat-card-label">{t('activeRiders')}</p>
                <h3 className="stat-card-value">{stats.activeRiders}</h3>
              </div>
              <div className="stat-card-footer">
                <span className="stat-trend neutral">{t('onlineNow')}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-card-icon" style={{background: '#F3E5F5'}}>
                  👥
                </div>
              </div>
              <div className="stat-card-content">
                <p className="stat-card-label">{t('branchUsers')}</p>
                <h3 className="stat-card-value">{stats.branchUsers || 0}</h3>
              </div>
              <div className="stat-card-footer">
                <span className="stat-trend neutral">{t('staffAndManagers')}</span>
              </div>
            </div>
          </div>

          {/* Recent Orders Card for Admin */}
          <div className="content-card">
            <div className="content-card-header">
              <h2 className="content-card-title">{t('recentOrders')}</h2>
              <div className="content-card-actions">
                <button className="btn btn-outline btn-sm" onClick={() => window.location.href = '/orders'}>
                  {t('viewAll')} →
                </button>
              </div>
            </div>
            <div className="content-card-body no-padding">
              {recentOrders.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📦</div>
                  <h3 className="empty-state-title">{t('noRecentOrders')}</h3>
                  <p className="empty-state-message">{t('noOrdersPlaced')}</p>
                </div>
              ) : (
                <div className="orders-list">
                  {recentOrders.map((order) => (
                    <div className="order-item" key={order._id}>
                      <div className="order-info">
                        <p className="order-number">{order.orderNumber}</p>
                        <p className="order-customer">{order.customerName || t('guest')}</p>
                      </div>
                      <div className="order-details">
                        <p className="order-price">{formatCurrency(order.totalAmount)}</p>
                        <p className="order-time">{getTimeAgo(order.createdAt)}</p>
                      </div>
                      <div className="order-meta">
                        <span className={`badge ${getBadgeClass(order.status)}`}>
                          {t(order.status.toLowerCase() as any)}
                        </span>
                        <p className="order-items">{order.itemCount} {t('items')}</p>
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
