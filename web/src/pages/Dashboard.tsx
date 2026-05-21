import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useLanguage } from '../context/LanguageContext';
import './Dashboard.css';
import { getSocketIoOptions, getSocketIoUrl } from '../utils/socketOptions';
import { fetchAdminDashboardHttp } from '../utils/dashboardHttp';

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
  const socketRef = useRef<Socket | null>(null);
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
    const storedRole = localStorage.getItem('userRole');
    const validRoles = ['ADMIN', 'SUPER_ADMIN', 'CHEF', 'WAITER', 'RIDER', 'CUSTOMER'];
    const role = storedRole && validRoles.includes(storedRole) ? storedRole : 'CUSTOMER';
    setUserRole(role);
  }, []);

  const applyDashboardPayload = useCallback((payload: any) => {
    const d = payload?.stats || {};
    setStats({
      totalOrdersToday: d.totalOrders ?? 0,
      totalRevenue: d.totalRevenue ?? 0,
      activeRiders: d.activeRiders ?? d.totalRiders ?? 0,
      activeTables: d.activeTables ?? 0,
      totalTables: d.totalTables ?? 24,
      revenueChange: d.revenueChange ?? 0,
      ordersChange: d.ordersChange ?? 0,
      branchUsers: d.totalUsers ?? 0,
    });

    const rawOrders = Array.isArray(payload?.orders) ? payload.orders : [];
    const sorted = rawOrders
      .map((o: any) => ({
        _id: o._id || o.id,
        orderNumber: o.orderNumber || '',
        customerName: o.customerName || o.customer?.displayName || 'Guest',
        totalAmount: o.totalAmount || o.total || 0,
        status: o.status || '',
        itemCount: Array.isArray(o.items) ? o.items.length : 0,
        createdAt: o.createdAt || new Date().toISOString(),
      }))
      .sort((a: RecentOrder, b: RecentOrder) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
    setRecentOrders(sorted);
    setLoading(false);
    setError(null);
  }, []);

  const requestDashboard = useCallback(() => {
    setLoading(true);
    socketRef.current?.emit('admin_dashboard:get', { period: 'day', limit: 50 });
  }, []);

  useEffect(() => {
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      setLoading(false);
      return;
    }

    const loadHttp = async () => {
      setLoading(true);
      try {
        const payload = await fetchAdminDashboardHttp({ period: 'day', limit: 50 });
        if (payload) applyDashboardPayload(payload);
      } catch {
        setError('Failed to load dashboard data. Please check your connection.');
        setLoading(false);
      }
    };

    const socket = io(getSocketIoUrl(), getSocketIoOptions());
    socketRef.current = socket;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedRequest = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(requestDashboard, 1500);
    };

    socket.on('connect', requestDashboard);
    socket.on('admin_dashboard:data', applyDashboardPayload);
    socket.on('admin_dashboard:error', () => {
      void loadHttp();
    });
    socket.on('connect_error', () => {
      void loadHttp();
    });
    socket.on('notification', debouncedRequest);

    if (socket.connected) requestDashboard();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userRole, applyDashboardPayload, requestDashboard]);

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
              onClick={requestDashboard} 
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
