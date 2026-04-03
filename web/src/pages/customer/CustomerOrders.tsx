import { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessTime, CheckCircle, DeliveryDining, LocalShipping, Restaurant } from '@mui/icons-material';
import { Box, Chip, CircularProgress, Paper, Stack, Typography, Alert } from '@mui/material';
import { api } from '../../services/api';

type Order = {
  _id: string;
  orderNumber?: string;
  totalAmount?: number;
  status?: string;
  createdAt?: string;
  orderType?: string;
  branch?: { branchName?: string };
  items?: Array<{ product?: { name?: string }; quantity?: number }>;
};

const STATUS_STEPS = [
  { id: 'PENDING', label: 'Order Placed' },
  { id: 'KITCHEN_ACCEPTED', label: 'Kitchen Accepted' },
  { id: 'PREPARING', label: 'Being Prepared' },
  { id: 'READY', label: 'Ready for Dispatch' },
  { id: 'RIDER_ASSIGNED', label: 'Rider Assigned' },
  { id: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { id: 'DELIVERED', label: 'Delivered' },
  { id: 'SERVED', label: 'Served' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' },
] as const;

const FINAL_STATUSES = new Set(['DELIVERED', 'SERVED', 'COMPLETED', 'CANCELLED']);

const formatOrderNumber = (order: Order) => {
  if (order.orderNumber) return order.orderNumber;
  return `ORD-${String(order._id).slice(-6).toUpperCase()}`;
};

const normalizeStatus = (status?: string) => String(status || 'PENDING').toUpperCase();
const normalizeOrderType = (orderType?: string) => String(orderType || 'DELIVERY').toUpperCase();

const buildVisibleSteps = (status: string, orderType: string) => {
  if (status === 'CANCELLED') {
    return [
      { id: 'PENDING', label: 'Order Placed' },
      { id: 'CANCELLED', label: 'Cancelled' },
    ];
  }
  const isDelivery = orderType === 'DELIVERY';
  return STATUS_STEPS.filter((step) => {
    if (!isDelivery && (step.id === 'OUT_FOR_DELIVERY' || step.id === 'DELIVERED')) return false;
    if (isDelivery && (step.id === 'SERVED' || step.id === 'COMPLETED')) return false;
    return true;
  });
};

const getStepIndex = (steps: Array<{ id: string }>, status: string) => {
  const idx = steps.findIndex((s) => s.id === status);
  return idx >= 0 ? idx : 0;
};

const getStatusColor = (status?: string) => {
  switch (normalizeStatus(status)) {
    case 'DELIVERED':
    case 'COMPLETED':
    case 'SERVED':
      return 'success';
    case 'CANCELLED':
      return 'error';
    case 'OUT_FOR_DELIVERY':
    case 'RIDER_ASSIGNED':
    case 'READY':
    case 'PREPARING':
    case 'KITCHEN_ACCEPTED':
      return 'warning';
    default:
      return 'default';
  }
};

export default function CustomerOrders() {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('authToken');
  const [loading, setLoading] = useState(true);
  const [apiOrders, setApiOrders] = useState<Order[]>([]);
  const [guestOrders, setGuestOrders] = useState<Order[]>([]);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);

  const sortOrders = useCallback((orders: Order[]) => {
    return [...orders].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, []);

  const refreshGuestOrderStatuses = useCallback(async (orders: Order[]) => {
    if (!Array.isArray(orders) || orders.length === 0) return orders;
    const refreshed = await Promise.all(
      orders.map(async (order) => {
        const orderId = String(order?._id || '').trim();
        if (!orderId || orderId.startsWith('LOCAL-')) return order;
        try {
          const res: any = await api.get(`/orders/guest/status/${orderId}?_=${Date.now()}`);
          if (!res?.success || !res?.data) return order;
          const next = res.data as Order;
          return {
            ...order,
            status: next.status || order.status,
            orderType: next.orderType || order.orderType,
            totalAmount: typeof next.totalAmount === 'number' ? next.totalAmount : order.totalAmount,
            createdAt: next.createdAt || order.createdAt,
            orderNumber: next.orderNumber || order.orderNumber,
            branch: next.branch || order.branch,
            items: Array.isArray(next.items) && next.items.length > 0 ? next.items : order.items,
          } as Order;
        } catch {
          return order;
        }
      })
    );
    return refreshed;
  }, []);

  const loadOrders = useCallback(async (isInitialLoad: boolean = false) => {
    if (isInitialLoad) setLoading(true);
    try {
      try {
        const msg = localStorage.getItem('order_success_msg');
        setOrderSuccessMsg(msg || null);
        if (msg) localStorage.removeItem('order_success_msg');
        const rawGuest = localStorage.getItem('customer_guest_orders');
        const parsedGuest = rawGuest ? JSON.parse(rawGuest) : [];
        const guestList = Array.isArray(parsedGuest) ? parsedGuest : [];
        const withFreshStatus = await refreshGuestOrderStatuses(guestList);
        const normalizedGuest = sortOrders(withFreshStatus);
        setGuestOrders(normalizedGuest);
        localStorage.setItem('customer_guest_orders', JSON.stringify(normalizedGuest));
      } catch {
        setGuestOrders([]);
      }
      if (!token) {
        if (isInitialLoad) setLoading(false);
        return;
      }
      try {
        const res = await api.get<{ orders: Order[] }>(`/orders/my-orders?limit=20&_=${Date.now()}`);
        const list = res.success ? (res.data?.orders || []) : [];
        const normalized = Array.isArray(list) ? sortOrders(list) : [];
        setApiOrders(normalized);
      } finally {
        if (isInitialLoad) setLoading(false);
      }
    } catch {
      if (isInitialLoad) setLoading(false);
    }
  }, [token, sortOrders, refreshGuestOrderStatuses]);

  useEffect(() => {
    loadOrders(true);
  }, [loadOrders]);

  useEffect(() => {
    const refreshFromStorage = () => {
      loadOrders(false);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'customer_guest_orders' || e.key === 'order_success_msg' || e.key === 'auth_token' || e.key === 'authToken') {
        refreshFromStorage();
      }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('customer_cart_updated', refreshFromStorage as EventListener);
    window.addEventListener('focus', refreshFromStorage);
    document.addEventListener('visibilitychange', refreshFromStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('customer_cart_updated', refreshFromStorage as EventListener);
      window.removeEventListener('focus', refreshFromStorage);
      document.removeEventListener('visibilitychange', refreshFromStorage);
    };
  }, [loadOrders]);

  useEffect(() => {
    const currentOrders = token ? apiOrders : guestOrders;
    const latest = currentOrders[0];
    const latestStatus = normalizeStatus(latest?.status);
    const isFinal = FINAL_STATUSES.has(latestStatus);
    const intervalMs = isFinal ? 10000 : 2000;
    const interval = window.setInterval(() => {
      loadOrders(false);
    }, intervalMs);
    return () => {
      window.clearInterval(interval);
    };
  }, [token, apiOrders, guestOrders, loadOrders]);

  const orders = useMemo(() => {
    if (token) return apiOrders;
    return guestOrders;
  }, [token, apiOrders, guestOrders]);

  const latestOrder = orders[0];
  const currentStatus = normalizeStatus(latestOrder?.status);
  const currentOrderType = normalizeOrderType(latestOrder?.orderType);
  const visibleSteps = useMemo(() => buildVisibleSteps(currentStatus, currentOrderType), [currentStatus, currentOrderType]);
  const currentStepIndex = useMemo(() => getStepIndex(visibleSteps, currentStatus), [visibleSteps, currentStatus]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper sx={{ p: 2, borderRadius: 3, border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
        <Typography variant="h5" sx={{ fontWeight: 900, color: 'var(--text-primary)' }}>
          Orders
        </Typography>
        <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
          {token ? 'Track your latest order in real time' : 'Track your latest order below'}
        </Typography>
      </Paper>

      {orderSuccessMsg ? (
        <Alert severity="success" sx={{ borderRadius: 2 }}>
          {orderSuccessMsg}
        </Alert>
      ) : null}

      {loading ? (
        <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid var(--border-color)' }}>
          <Stack direction="row" spacing={1.2} alignItems="center">
            <CircularProgress size={20} />
            <Typography sx={{ color: 'var(--text-secondary)', fontWeight: 700 }}>Loading orders...</Typography>
          </Stack>
        </Paper>
      ) : null}

      {!loading && latestOrder ? (
        <Paper sx={{ p: 2, borderRadius: 3, border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', bgcolor: 'var(--bg-card)' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" sx={{ mb: 1.5 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <DeliveryDining sx={{ color: 'var(--primary)' }} />
              <Typography sx={{ fontWeight: 900, color: 'var(--text-primary)' }}>{formatOrderNumber(latestOrder)}</Typography>
              <Chip size="small" label={currentStatus} color={getStatusColor(currentStatus) as any} />
            </Stack>
            <Typography sx={{ color: 'var(--primary)', fontWeight: 900 }}>₨{Number(latestOrder.totalAmount || 0).toFixed(0)}</Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            <Restaurant sx={{ color: '#666', fontSize: 18 }} />
            <Typography sx={{ color: 'var(--text-secondary)', fontWeight: 700 }}>{latestOrder.branch?.branchName || 'Restaurant'}</Typography>
            <AccessTime sx={{ color: '#888', fontSize: 16, ml: 0.5 }} />
            <Typography variant="caption" sx={{ color: 'var(--text-hint)' }}>
              {latestOrder.createdAt ? new Date(latestOrder.createdAt).toLocaleString() : ''}
            </Typography>
          </Stack>

          <Stack spacing={0.75}>
            {visibleSteps.map((step, index) => {
              const completed = currentStatus !== 'CANCELLED' && index <= currentStepIndex;
              const active = step.id === currentStatus;
              return (
                <Stack key={step.id} direction="row" spacing={1.2} alignItems="flex-start">
                  <Box sx={{ width: 22, display: 'flex', justifyContent: 'center', pt: 0.1 }}>
                    <Box
                      sx={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        bgcolor: completed ? 'var(--primary)' : active ? '#fff3ee' : '#f1f1f1',
                        border: active ? '1px solid var(--primary)' : '1px solid transparent',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      {completed ? <CheckCircle sx={{ color: '#fff', fontSize: 14 }} /> : null}
                      {!completed && active ? <LocalShipping sx={{ color: 'var(--primary)', fontSize: 12 }} /> : null}
                    </Box>
                  </Box>
                  <Stack sx={{ pb: 0.65 }}>
                    <Typography sx={{ color: active || completed ? '#1f1f1f' : '#8a8a8a', fontWeight: active ? 900 : 700, fontSize: 14 }}>
                      {step.label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: active ? 'var(--primary)' : '#9b9b9b' }}>
                      {active ? 'In progress' : completed ? 'Completed' : 'Pending'}
                    </Typography>
                  </Stack>
                </Stack>
              );
            })}
          </Stack>
        </Paper>
      ) : null}

      {!loading && orders.length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid var(--border-color)' }}>
          <Typography sx={{ color: 'var(--text-secondary)', fontWeight: 700 }}>
            No tracked orders found yet.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {orders.map((o) => {
            const items = Array.isArray(o.items) ? o.items : [];
            const firstItems = items.slice(0, 3).map((i) => i.product?.name || 'Item').join(', ');
            const moreCount = Math.max(0, items.length - 3);
            const summary = moreCount > 0 ? `${firstItems} +${moreCount} more` : firstItems;

            return (
              <Paper
                key={o._id}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-sm)',
                  bgcolor: 'var(--bg-card)',
                }}
              >
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography sx={{ fontWeight: 900, color: 'var(--text-primary)' }}>
                        {formatOrderNumber(o)}
                      </Typography>
                      <Chip size="small" label={o.status || 'PENDING'} color={getStatusColor(o.status) as any} />
                    </Stack>
                    <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }} noWrap>
                      {o.branch?.branchName || 'Restaurant'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mt: 0.25 }} noWrap>
                      {summary || 'Items'}
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                    <Typography sx={{ fontWeight: 900, color: 'var(--primary)' }}>
                      ₨{Number(o.totalAmount || 0).toFixed(0)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--text-hint)' }}>
                      {o.createdAt ? new Date(o.createdAt).toLocaleString() : ''}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
