import { useEffect, useState } from 'react';
import { api } from '../../api/client';

interface Order {
  _id: string;
  orderNumber: string;
  customer: {
    _id: string;
    displayName: string;
    email: string;
  };
  branch: {
    _id: string;
    branchName: string;
  };
  items: Array<{
    product: {
      name: string;
    };
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  orderType: 'DINE_IN' | 'DELIVERY' | 'TAKEAWAY';
  createdAt: string;
}

interface OrdersResponse {
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await api.get<OrdersResponse>(`/orders?${params.toString()}`);
      
      if (response.success && response.data) {
        setOrders(response.data.orders);
      } else {
        setError(response.message || 'Failed to fetch orders');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: '#ff9800',
      CONFIRMED: '#2196f3',
      PREPARING: '#9c27b0',
      READY: '#4caf50',
      OUT_FOR_DELIVERY: '#ff5722',
      DELIVERED: '#4caf50',
      CANCELLED: '#f44336',
    };
    return colors[status] || '#757575';
  };

  const filteredOrders = orders.filter(order => 
    statusFilter === 'all' || order.status === statusFilter
  );

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
        <div>Loading orders...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#dc3545' }}>
        <div>Error: {error}</div>
        <button onClick={fetchOrders} style={{ marginTop: '16px', padding: '8px 16px' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, color: '#1a1a2e' }}>Order Management ({orders.length})</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '10px 16px', border: '1px solid #ddd', borderRadius: '6px', minWidth: '150px' }}
        >
          <option value="all">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PREPARING">Preparing</option>
          <option value="READY">Ready</option>
          <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#666' }}>Order #</th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#666' }}>Customer</th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#666' }}>Branch</th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#666' }}>Items</th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#666' }}>Total</th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#666' }}>Status</th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#666' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order._id} style={{ borderTop: '1px solid #eee' }}>
                <td style={{ padding: '16px', fontSize: '14px', fontWeight: 500 }}>{order.orderNumber}</td>
                <td style={{ padding: '16px' }}>
                  <div style={{ fontWeight: 500 }}>{order.customer?.displayName || 'Unknown'}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{order.customer?.email}</div>
                </td>
                <td style={{ padding: '16px', fontSize: '14px', color: '#666' }}>
                  {order.branch?.branchName || 'N/A'}
                </td>
                <td style={{ padding: '16px', fontSize: '14px', color: '#666' }}>
                  {order.items?.length || 0} items
                </td>
                <td style={{ padding: '16px', fontSize: '14px', fontWeight: 500 }}>
                  ${order.totalAmount?.toFixed(2) || '0.00'}
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    backgroundColor: getStatusColor(order.status) + '20',
                    color: getStatusColor(order.status),
                    textTransform: 'capitalize',
                  }}>
                    {order.status?.toLowerCase().replace('_', ' ')}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>
                  <button style={{ padding: '6px 12px', backgroundColor: '#f5f5f5', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredOrders.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            No orders found.
          </div>
        )}
      </div>
    </div>
  );
}
