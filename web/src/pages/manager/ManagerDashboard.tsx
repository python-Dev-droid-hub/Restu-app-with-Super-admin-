import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Card, CardContent, Chip, Container, Grid, Paper, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { AccountBalanceWallet, People, ReceiptLong, RestaurantMenu } from '@mui/icons-material';
import { useLocation } from 'react-router-dom';
import { api } from '../../services/api';
import { io, type Socket } from 'socket.io-client';

type ManagerStats = {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalUsers: number;
};

type ManagerOrder = {
  _id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  total: number;
  customerName: string;
};

type WaiterPerformanceRow = {
  waiterId: string;
  name: string;
  servedOrders: number;
  revenue: number;
};

type RiderPerformanceRow = {
  riderId: string;
  name: string;
  deliveredOrders: number;
  revenue: number;
};

const getBranchContext = (): { branchId: string; branchName: string } => {
  try {
    const raw = localStorage.getItem('userData');
    if (!raw) return { branchId: '', branchName: '' };
    const parsed = JSON.parse(raw);
    const branch = parsed.assignedBranch || parsed.branch || null;
    const branchId =
      branch?._id ||
      parsed.assigned_branch_id ||
      parsed.branchId ||
      '';
    const branchName = branch?.branchName || branch?.name || '';
    return { branchId: String(branchId || ''), branchName: String(branchName || '') };
  } catch {
    return { branchId: '', branchName: '' };
  }
};

const statusChip = (status: string): { label: string; color: 'default' | 'warning' | 'success' | 'error' | 'info' } => {
  const value = (status || '').toLowerCase();
  if (value === 'pending' || value === 'confirmed') return { label: 'Pending', color: 'warning' };
  if (value === 'preparing' || value === 'cooking') return { label: 'Preparing', color: 'info' };
  if (value === 'ready' || value === 'on_the_way') return { label: 'In progress', color: 'info' };
  if (value === 'delivered' || value === 'completed') return { label: 'Delivered', color: 'success' };
  if (value === 'cancelled') return { label: 'Cancelled', color: 'error' };
  return { label: status || 'Unknown', color: 'default' };
};

const StatCard = ({
  icon,
  value,
  label,
  sublabel,
  loading,
  bgcolor,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  sublabel: string;
  loading: boolean;
  bgcolor: string;
}) => (
  <Card sx={{
    borderRadius: 4,
    backgroundColor: bgcolor,
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    color: 'white',
    position: 'relative',
    overflow: 'hidden',
    height: 140,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
    },
  }}>
    <CardContent sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{
          bgcolor: 'rgba(255,255,255,0.2)',
          borderRadius: 2,
          p: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {icon}
        </Box>
      </Box>
      <Box>
        <Typography sx={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: 'white' }}>
          {loading ? <Skeleton width={80} sx={{ bgcolor: 'rgba(255,255,255,0.4)' }} /> : value}
        </Typography>
      </Box>
      <Box>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'white', opacity: 0.95 }}>{label}</Typography>
        <Typography sx={{ fontSize: 11, color: 'white', opacity: 0.8 }}>{sublabel}</Typography>
      </Box>
    </CardContent>
  </Card>
);

const ManagerDashboard: React.FC = () => {
  const location = useLocation();
  const globalQuery = useMemo(() => (new URLSearchParams(location.search).get('q') || '').trim().toLowerCase(), [location.search]);
  const [{ branchId, branchName }, setBranch] = useState(getBranchContext());
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ManagerStats>({ totalOrders: 0, totalRevenue: 0, totalProducts: 0, totalUsers: 0 });
  const [recentOrders, setRecentOrders] = useState<ManagerOrder[]>([]);
  const [waitersPerformance, setWaitersPerformance] = useState<WaiterPerformanceRow[]>([]);
  const [ridersPerformance, setRidersPerformance] = useState<RiderPerformanceRow[]>([]);
  const [ridersCount, setRidersCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  const recentOrdersVisible = useMemo(() => {
    if (!globalQuery) return recentOrders;
    return (recentOrders || []).filter((o) => {
      const hay = `${o.orderNumber || ''} ${o.customerName || ''} ${o.status || ''}`.toLowerCase();
      return hay.includes(globalQuery);
    });
  }, [globalQuery, recentOrders]);

  const waitersPerformanceVisible = useMemo(() => {
    if (!globalQuery) return waitersPerformance;
    return (waitersPerformance || []).filter((w) => `${w.name || ''}`.toLowerCase().includes(globalQuery));
  }, [globalQuery, waitersPerformance]);

  const ridersPerformanceVisible = useMemo(() => {
    if (!globalQuery) return ridersPerformance;
    return (ridersPerformance || []).filter((r) => `${r.name || ''}`.toLowerCase().includes(globalQuery));
  }, [globalQuery, ridersPerformance]);

  useEffect(() => {
    const ctx = getBranchContext();
    setBranch(ctx);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [statsRes, ordersRes] = await Promise.all([
          api.getAdminDashboardStats({ period: 'all', branchId }),
          api.getAdminOrders({ limit: 10, period: 'all', branchId }),
        ]);

        if (statsRes.success && statsRes.data) {
          const data: any = statsRes.data;
          setStats({
            totalOrders: Number(data.totalOrders || 0),
            totalRevenue: Number(data.totalRevenue || 0),
            totalProducts: Number(data.totalProducts || data.products || 0),
            totalUsers: Number(data.totalUsers || data.users || data.totalCustomers || 0),
          });
        }

        if (ordersRes.success && ordersRes.data) {
          const raw: any = ordersRes.data;
          const list = Array.isArray(raw.orders) ? raw.orders : Array.isArray(raw) ? raw : [];
          const normalized = list.map((o: any): ManagerOrder => ({
            _id: String(o._id || o.id || ''),
            orderNumber: String(o.orderNumber || o.orderNo || o._id || ''),
            status: String(o.status || ''),
            createdAt: String(o.createdAt || o.created_at || ''),
            total: Number(o.totalAmount ?? o.total ?? 0),
            customerName: String(o.customerName || o.customer?.name || ''),
          }));
          setRecentOrders(normalized);
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [branchId]);

  useEffect(() => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('authToken') || '';
    const rawApiUrl = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
    const rawProxyTarget = (import.meta as any)?.env?.VITE_PROXY_TARGET as string | undefined;

    const normalizeHost = (value?: string): string => {
      const v = (value || '').trim();
      if (!v) return '';
      return v.replace(/\/?api\/?$/, '').replace(/\/$/, '');
    };

    const socketUrl = normalizeHost(rawProxyTarget) || normalizeHost(rawApiUrl) || 'http://localhost:3101';

    if (!socketRef.current) {
      const socket = io(socketUrl, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        auth: token ? { token } : undefined,
      });
      socketRef.current = socket;

      socket.on('admin_dashboard:data', (payload: any) => {
        const waitersPerf = payload?.waitersPerformance;
        setWaitersPerformance(Array.isArray(waitersPerf?.waiters) ? waitersPerf.waiters : []);

        const ridersPerf = payload?.ridersPerformance;
        setRidersCount(typeof ridersPerf?.ridersCount === 'number' ? ridersPerf.ridersCount : 0);
        setRidersPerformance(Array.isArray(ridersPerf?.riders) ? ridersPerf.riders : []);
      });
    }

    if (branchId && socketRef.current?.connected) {
      socketRef.current.emit('admin_dashboard:get', { period: 'all', branchId, limit: 50 });
    }

    const socket = socketRef.current;
    const onConnect = () => {
      if (branchId) {
        socket.emit('admin_dashboard:get', { period: 'all', branchId, limit: 50 });
      }
    };

    socket?.on('connect', onConnect);

    return () => {
      socket?.off('connect', onConnect);
    };
  }, [branchId]);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const title = useMemo(() => {
    if (branchName) return `Manager Dashboard — ${branchName}`;
    return 'Manager Dashboard';
  }, [branchName]);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 900, fontSize: { xs: 22, sm: 28 }, color: '#111' }}>
          {title}
        </Typography>
        <Typography sx={{ color: '#666', mt: 0.25 }}>
          Today’s overview
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<AccountBalanceWallet sx={{ fontSize: 24, color: 'white' }} />}
            value={loading ? '' : `Rs. ${stats.totalRevenue.toFixed(0)}`}
            label="Total Revenue"
            sublabel=""
            loading={loading}
            bgcolor="#2E7D52"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<ReceiptLong sx={{ fontSize: 24, color: 'white' }} />}
            value={loading ? '' : stats.totalOrders.toString()}
            label="Total Orders"
            sublabel=""
            loading={loading}
            bgcolor="#E87E35"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<RestaurantMenu sx={{ fontSize: 24, color: 'white' }} />}
            value={loading ? '' : stats.totalProducts.toLocaleString()}
            label="Menu Items"
            sublabel=""
            loading={loading}
            bgcolor="#1E5AA8"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<People sx={{ fontSize: 24, color: 'white' }} />}
            value={loading ? '' : stats.totalUsers.toLocaleString()}
            label="Branch Users"
            sublabel=""
            loading={loading}
            bgcolor="#7B5CB8"
          />
        </Grid>
      </Grid>

      <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography sx={{ fontWeight: 600, color: '#1a1a2e', fontSize: 18 }}>
              Recent Orders
            </Typography>
          </Box>

          <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: '#666', borderBottom: '2px solid #f0f0f0' }}>Order</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#666', borderBottom: '2px solid #f0f0f0' }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#666', borderBottom: '2px solid #f0f0f0' }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: '#666', borderBottom: '2px solid #f0f0f0' }}>Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell colSpan={4}><Skeleton height={28} /></TableCell>
                    </TableRow>
                  ))
                ) : recentOrdersVisible.length ? (
                  recentOrdersVisible.map((o) => {
                    const chip = statusChip(o.status);
                    return (
                      <TableRow key={o._id} hover>
                        <TableCell sx={{ fontWeight: 700, color: '#111' }}>{o.orderNumber}</TableCell>
                        <TableCell sx={{ color: '#444' }}>{o.customerName || '-'}</TableCell>
                        <TableCell>
                          <Chip size="small" label={chip.label} color={chip.color} />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: '#111' }}>
                          Rs. {Number(o.total || 0).toFixed(0)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Box sx={{ py: 4, textAlign: 'center' }}>
                        <Typography sx={{ color: '#666' }}>{globalQuery ? 'No matching orders.' : 'No orders found for today.'}</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', mt: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography sx={{ fontWeight: 600, color: '#1a1a2e', fontSize: 18 }}>
              Waiters Performance
            </Typography>
          </Box>

          <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: '#666', borderBottom: '2px solid #f0f0f0' }}>Waiter</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#666', borderBottom: '2px solid #f0f0f0' }} align="center">Served Orders</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#666', borderBottom: '2px solid #f0f0f0' }} align="right">Revenue</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <TableRow key={`waiter-skel-${idx}`}>
                      <TableCell sx={{ py: 2, borderBottom: '1px solid #f5f5f5' }}>
                        <Skeleton width="60%" />
                      </TableCell>
                      <TableCell align="center" sx={{ py: 2, borderBottom: '1px solid #f5f5f5' }}>
                        <Skeleton width={60} sx={{ mx: 'auto' }} />
                      </TableCell>
                      <TableCell align="right" sx={{ py: 2, borderBottom: '1px solid #f5f5f5' }}>
                        <Skeleton width={90} sx={{ ml: 'auto' }} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : waitersPerformanceVisible.length ? (
                  waitersPerformanceVisible.map((w) => (
                    <TableRow key={w.waiterId} sx={{ '&:hover': { bgcolor: '#fafafa' } }}>
                      <TableCell sx={{ fontWeight: 500, color: '#1a1a2e', py: 2, borderBottom: '1px solid #f5f5f5' }}>
                        {w.name || 'Unknown'}
                      </TableCell>
                      <TableCell align="center" sx={{ color: '#666', py: 2, borderBottom: '1px solid #f5f5f5' }}>
                        {(w.servedOrders ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500, color: '#1a1a2e', py: 2, borderBottom: '1px solid #f5f5f5' }}>
                        Rs. {Number(w.revenue || 0).toFixed(0)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} sx={{ py: 3, color: '#666', textAlign: 'center', borderBottom: '1px solid #f5f5f5' }}>
                      {globalQuery ? 'No matching waiter performance.' : 'No waiter performance data for this branch.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', mt: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography sx={{ fontWeight: 600, color: '#1a1a2e', fontSize: 18 }}>
              Riders Performance
            </Typography>
            <Typography sx={{ color: '#666', fontSize: 13, fontWeight: 600 }}>
              Riders in branch: {loading ? '-' : ridersCount.toLocaleString()}
            </Typography>
          </Box>

          <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: '#666', borderBottom: '2px solid #f0f0f0' }}>Rider</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#666', borderBottom: '2px solid #f0f0f0' }} align="center">Delivered Orders</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#666', borderBottom: '2px solid #f0f0f0' }} align="right">Revenue</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <TableRow key={`rider-skel-${idx}`}>
                      <TableCell sx={{ py: 2, borderBottom: '1px solid #f5f5f5' }}>
                        <Skeleton width="60%" />
                      </TableCell>
                      <TableCell align="center" sx={{ py: 2, borderBottom: '1px solid #f5f5f5' }}>
                        <Skeleton width={60} sx={{ mx: 'auto' }} />
                      </TableCell>
                      <TableCell align="right" sx={{ py: 2, borderBottom: '1px solid #f5f5f5' }}>
                        <Skeleton width={90} sx={{ ml: 'auto' }} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : ridersPerformanceVisible.length ? (
                  ridersPerformanceVisible.map((r) => (
                    <TableRow key={r.riderId} sx={{ '&:hover': { bgcolor: '#fafafa' } }}>
                      <TableCell sx={{ fontWeight: 500, color: '#1a1a2e', py: 2, borderBottom: '1px solid #f5f5f5' }}>
                        {r.name || 'Unknown'}
                      </TableCell>
                      <TableCell align="center" sx={{ color: '#666', py: 2, borderBottom: '1px solid #f5f5f5' }}>
                        {(r.deliveredOrders ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500, color: '#1a1a2e', py: 2, borderBottom: '1px solid #f5f5f5' }}>
                        Rs. {Number(r.revenue || 0).toFixed(0)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} sx={{ py: 3, color: '#666', textAlign: 'center', borderBottom: '1px solid #f5f5f5' }}>
                      {globalQuery ? 'No matching rider performance.' : 'No rider performance data for this branch.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Container>
  );
};

export default ManagerDashboard;
