import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Order {
  _id: string;
  orderNumber: string;
  customer: {
    displayName: string;
    phoneNumber?: string;
  };
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';
  orderType: 'DINE_IN' | 'DELIVERY' | 'TAKEAWAY';
  createdAt: string;
  branch?: {
    branchName: string;
  };
}

interface OrdersResponse {
  orders: Order[];
  total?: number;
  page?: number;
  limit?: number;
}

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await api.getAllOrders();

      if (response.success && response.data) {
        const ordersData = response.data as OrdersResponse;
        setOrders(ordersData.orders || []);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await api.updateOrderStatus(orderId, newStatus);
      await loadOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'badge-pending',
      CONFIRMED: 'badge-confirmed',
      PREPARING: 'badge-preparing',
      READY: 'badge-ready',
      DELIVERED: 'badge-delivered',
      CANCELLED: 'badge-cancelled',
    };
    return colors[status] || 'badge-pending';
  };

  const getOrderTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      DINE_IN: '🪑',
      DELIVERY: '🚚',
      TAKEAWAY: '🥡',
    };
    return icons[type] || '📦';
  };

  const filteredOrders = orders.filter((order) => {
    const matchesStatus = selectedStatus === 'ALL' || order.status === selectedStatus;
    const matchesType = selectedType === 'ALL' || order.orderType === selectedType;
    return matchesStatus && matchesType;
  });

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Orders</h1>
          <p className="page-subtitle">Manage all restaurant orders</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-primary" onClick={loadOrders}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Page Content */}
      <div className="page-content">
        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-icon" style={{background: 'var(--primary-light)'}}>
                📦
              </div>
            </div>
            <div className="stat-card-content">
              <p className="stat-card-label">Total Orders</p>
              <h3 className="stat-card-value">{orders.length}</h3>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-icon" style={{background: '#FFF3E0'}}>
                ⏳
              </div>
            </div>
            <div className="stat-card-content">
              <p className="stat-card-label">Pending</p>
              <h3 className="stat-card-value">{orders.filter(o => o.status === 'PENDING').length}</h3>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-icon" style={{background: '#E3F2FD'}}>
                👨‍🍳
              </div>
            </div>
            <div className="stat-card-content">
              <p className="stat-card-label">Preparing</p>
              <h3 className="stat-card-value">{orders.filter(o => o.status === 'PREPARING').length}</h3>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-icon" style={{background: '#E8F5E9'}}>
                ✅
              </div>
            </div>
            <div className="stat-card-content">
              <p className="stat-card-label">Ready/Delivered</p>
              <h3 className="stat-card-value">
                {orders.filter(o => o.status === 'READY' || o.status === 'DELIVERED').length}
              </h3>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="filters-bar">
          <div className="filter-item">
            <label className="filter-label">Status</label>
            <select
              className="form-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ minWidth: '140px' }}
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PREPARING">Preparing</option>
              <option value="READY">Ready</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="filter-item">
            <label className="filter-label">Order Type</label>
            <select
              className="form-select"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              style={{ minWidth: '140px' }}
            >
              <option value="ALL">All Types</option>
              <option value="DINE_IN">Dine-in</option>
              <option value="DELIVERY">Delivery</option>
              <option value="TAKEAWAY">Takeaway</option>
            </select>
          </div>
        </div>

        {/* Orders Table Card */}
        <div className="content-card">
          <div className="content-card-header">
            <h2 className="content-card-title">All Orders</h2>
            <div className="content-card-actions">
              <span className="text-secondary">{filteredOrders.length} orders</span>
            </div>
          </div>
          <div className="content-card-body no-padding">
            {filteredOrders.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📦</div>
                <h3 className="empty-state-title">No orders found</h3>
                <p className="empty-state-message">
                  {selectedStatus !== 'ALL' || selectedType !== 'ALL'
                    ? 'Try adjusting your filters'
                    : 'No orders have been placed yet'
                  }
                </p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Type</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Time</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order._id}>
                      <td>
                        <div className="order-info">
                          <div className="order-number">#{order.orderNumber}</div>
                          {order.branch && (
                            <div className="order-branch">{order.branch.branchName}</div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="customer-info">
                          <div className="customer-name">{order.customer.displayName}</div>
                          {order.customer.phoneNumber && (
                            <div className="customer-phone">📞 {order.customer.phoneNumber}</div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="order-type">
                          <span className="type-icon">{getOrderTypeIcon(order.orderType)}</span>
                          <span className="type-text">{order.orderType.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td>
                        <div className="order-items">
                          {order.items.slice(0, 2).map((item, index) => (
                            <div key={index} className="item-summary">
                              {item.quantity}x {item.productName}
                            </div>
                          ))}
                          {order.items.length > 2 && (
                            <div className="more-items">+{order.items.length - 2} more</div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="order-total">PKR {order.totalAmount.toFixed(2)}</div>
                      </td>
                      <td>
                        <span className={`badge ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td>
                        <div className="order-time">
                          {new Date(order.createdAt).toLocaleDateString()}
                          <br />
                          <small>{new Date(order.createdAt).toLocaleTimeString()}</small>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          {order.status === 'PENDING' && (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => handleStatusChange(order._id, 'CONFIRMED')}
                            >
                              Confirm
                            </button>
                          )}
                          {order.status === 'CONFIRMED' && (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => handleStatusChange(order._id, 'PREPARING')}
                            >
                              Start Prep
                            </button>
                          )}
                          {order.status === 'PREPARING' && (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => handleStatusChange(order._id, 'READY')}
                            >
                              Mark Ready
                            </button>
                          )}
                          {order.status === 'READY' && (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => handleStatusChange(order._id, 'DELIVERED')}
                            >
                              Delivered
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Orders;
