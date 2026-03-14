import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useSettings } from '../context/SettingsContext';

interface ReportData {
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
    PENDING: number;
    CONFIRMED: number;
    PREPARING: number;
    READY: number;
    OUT_FOR_DELIVERY: number;
    DELIVERED: number;
    CANCELLED: number;
  };
}

const Reports: React.FC = () => {
  const { defaultCurrency } = useSettings();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadReports();
  }, [dateRange]);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getReports({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      if (response.success && response.data) {
        setReportData(response.data as ReportData);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      setError('Failed to load reports. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: defaultCurrency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-content">
          <div className="loading">Loading reports...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Analytics and performance insights</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-primary" onClick={loadReports}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Page Content */}
      <div className="page-content">
        {error && (
          <div className="alert alert-error" style={{ marginBottom: '20px', padding: '15px', borderRadius: '8px', background: '#fee2e2', color: '#dc2626' }}>
            <strong>Error:</strong> {error}
            <button onClick={loadReports} className="btn btn-outline btn-sm" style={{ marginLeft: '10px' }}>
              Retry
            </button>
          </div>
        )}

        {/* Filters Bar */}
        <div className="filters-bar">
          <div className="filter-item">
            <label className="filter-label">Start Date</label>
            <input
              type="date"
              className="form-input"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            />
          </div>
          <div className="filter-item">
            <label className="filter-label">End Date</label>
            <input
              type="date"
              className="form-input"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            />
          </div>
        </div>

        {reportData ? (
          <>
            {/* Stats Grid */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-card-icon" style={{background: 'var(--primary-light)'}}>
                  �
                </div>
                <div className="stat-card-content">
                  <p className="stat-card-label">Total Orders</p>
                  <h3 className="stat-card-value">{reportData.totalOrders}</h3>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-icon" style={{background: '#E8F5E9'}}>
                  �
                </div>
                <div className="stat-card-content">
                  <p className="stat-card-label">Total Revenue</p>
                  <h3 className="stat-card-value">{formatCurrency(reportData.totalRevenue)}</h3>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-icon" style={{background: '#E3F2FD'}}>
                  �
                </div>
                <div className="stat-card-content">
                  <p className="stat-card-label">Avg Order Value</p>
                  <h3 className="stat-card-value">{formatCurrency(reportData.averageOrderValue)}</h3>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-icon" style={{background: '#F3E5F5'}}>
                  🏪
                </div>
                <div className="stat-card-content">
                  <p className="stat-card-label">Top Restaurants</p>
                  <h3 className="stat-card-value">{reportData.topRestaurants.length}</h3>
                </div>
              </div>
            </div>

            {/* Order Status Card */}
            <div className="content-card">
              <div className="content-card-header">
                <h2 className="content-card-title">📋 Order Status Breakdown</h2>
              </div>
              <div className="content-card-body">
                <div className="status-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                  {Object.entries(reportData.orderStatusDistribution).map(([status, count]) => (
                    <div key={status} className={`status-item ${status.toLowerCase()}`} style={{ 
                      padding: '16px', 
                      borderRadius: '12px', 
                      background: 'var(--bg-body)',
                      textAlign: 'center'
                    }}>
                      <div className="status-count" style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>{count}</div>
                      <div className="status-name" style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{status.replace('_', ' ')}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Products Card */}
            <div className="content-card">
              <div className="content-card-header">
                <h2 className="content-card-title">🏪 Top Performing Restaurants</h2>
              </div>
              <div className="content-card-body no-padding">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Restaurant Name</th>
                      <th>Orders</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.topRestaurants.map((restaurant, index) => (
                      <tr key={index}>
                        <td>#{index + 1}</td>
                        <td>{restaurant.name}</td>
                        <td>{restaurant.orders}</td>
                        <td>{formatCurrency(restaurant.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Daily Performance Card */}
            <div className="content-card">
              <div className="content-card-header">
                <h2 className="content-card-title">📅 Daily Performance</h2>
              </div>
              <div className="content-card-body no-padding">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Orders</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.revenueByMonth.map((month, index) => (
                      <tr key={index}>
                        <td>{month.month}</td>
                        <td>{month.orders}</td>
                        <td>{formatCurrency(month.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="content-card">
            <div className="content-card-body">
              <div className="empty-state">
                <div className="empty-state-icon">📊</div>
                <h3 className="empty-state-title">No report data available</h3>
                <p className="empty-state-message">Select a date range to view reports</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
