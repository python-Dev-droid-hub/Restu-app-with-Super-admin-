import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Skeleton,
  Avatar,
  Button,
  Tabs,
  Tab,
  FormControl,
  Select,
  MenuItem,
  Paper,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Store,
  AccountBalanceWallet,
  AccessTime,
  TwoWheeler,
  RestaurantMenu,
  ReceiptLong,
} from '@mui/icons-material';

import { useSettings } from '../../context/SettingsContext';
import { io, type Socket } from 'socket.io-client';

// ==================== TYPES ====================
interface UserData {
  _id?: string;
  name?: string;
  displayName?: string;
  email?: string;
  image?: string;
  avatar?: string;
  profileImage?: string;
}

// ==================== TYPES ====================
interface Branch {
  _id: string;
  name: string;
  branchName?: string;
  orders?: number;
  revenue?: number;
  riders?: number;
  status?: 'active' | 'inactive';
  currency?: string;
  isActive?: boolean;
}

interface Order {
  _id: string;
  orderNumber?: string;
  status: string;
  customerName?: string;
  customerEmail?: string;
  total: number;
  totalAmount?: number;
  createdAt: string;
  branchName?: string;
  branch?: { name: string };
  branchId?: string;
  eta?: string;
  rider?: { name: string; avatar?: string };
}

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalUsers: number;
  totalProducts: number;
  activeOrders: number;
  totalBranches: number;
  activeRiders: number;
}

interface WaiterPerformanceRow {
  waiterId: string;
  name: string;
  servedOrders: number;
  revenue: number;
}

interface RiderPerformanceRow {
  riderId: string;
  name: string;
  deliveredOrders: number;
  revenue: number;
}

type StatCardProps = {
  icon: React.ReactNode;
  value: string;
  label: string;
  sublabel: string;
  bgcolor: string;
  loading: boolean;
};

const StatCard = ({ icon, value, label, sublabel, bgcolor, loading }: StatCardProps) => (
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

// ==================== COMPONENT ====================
const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshSettings } = useSettings();
  const globalQuery = useMemo(() => (new URLSearchParams(location.search).get('q') || '').trim().toLowerCase(), [location.search]);
  const [loading, setLoading] = useState(true);
  const [activePeriod, setActivePeriod] = useState<'all' | 'day' | 'week' | 'month'>('all');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchFilter, setBranchFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currency, setCurrency] = useState<string>('PKR');
  
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalRevenue: 0,
    totalUsers: 0,
    totalProducts: 0,
    activeOrders: 0,
    totalBranches: 0,
    activeRiders: 0,
  });
  
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  const [branchPerformance, setBranchPerformance] = useState<Branch[]>([]);

  const [waitersPerformance, setWaitersPerformance] = useState<WaiterPerformanceRow[]>([]);
  const [ridersPerformance, setRidersPerformance] = useState<RiderPerformanceRow[]>([]);
  const [ridersCount, setRidersCount] = useState<number>(0);

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [profileImage, setProfileImage] = useState<string>('');
  const [userData, setUserData] = useState<UserData | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const filtersRef = useRef<{ period: 'all' | 'day' | 'week' | 'month'; branchId: string }>({
    period: 'all',
    branchId: 'all',
  });
  const branchesRef = useRef<Branch[]>([]);

  useEffect(() => {
    branchesRef.current = branches;
  }, [branches]);

  const getServerHost = (): string => {
    const rawApiUrl = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
    const rawProxyTarget = (import.meta as any)?.env?.VITE_PROXY_TARGET as string | undefined;

    const normalizeHost = (value?: string): string => {
      const v = (value || '').trim();
      if (!v) return '';
      return v.replace(/\/?api\/?$/, '').replace(/\/$/, '');
    };

    const fromEnv = normalizeHost(rawProxyTarget) || normalizeHost(rawApiUrl);
    if (fromEnv) return fromEnv;

    const protocol = window.location.protocol || 'http:';
    const hostname = window.location.hostname || 'localhost';
    return `${protocol}//${hostname}:3101`;
  };

  // Load user data including profile image
  const loadUserData = () => {
    try {
      const stored = localStorage.getItem('userData');
      if (stored) {
        const parsed: UserData = JSON.parse(stored);
        setUserData(parsed);
        // Extract profile image from various possible fields (same as mobile)
        const rawImage = parsed.profileImage || parsed.image || parsed.avatar || '';
        const normalizedImage = normalizeMediaUrl(rawImage);
        console.log('[AdminDashboard] Profile image loaded:', normalizedImage);
        setProfileImage(normalizedImage);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Normalize media URL to full URL if it's a relative path
  const normalizeMediaUrl = (uri?: string): string => {
    if (!uri) return '';
    const value = String(uri);
    const lower = value.trim().toLowerCase();
    if (lower.startsWith('file:') || lower.includes('var/mobile') || lower.includes('imagepicker')) {
      return '';
    }
    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) {
      return value;
    }
    // Some stored values may come without a leading slash (e.g. "uploads/..."), normalize them
    const normalizedPath = value.startsWith('/')
      ? value
      : (value.startsWith('uploads/') || value.startsWith('src/uploads/'))
          ? `/${value.replace(/^src\//, '')}`
          : value;

    // If it still doesn't look like a path, return as-is
    if (!normalizedPath.startsWith('/')) return normalizedPath;
    
    // Convert relative path to full URL
    return `${getServerHost()}${normalizedPath}`;
  };

  function normalizeOrders(orders: any[]): Order[] {
    return (Array.isArray(orders) ? orders : []).map((o: any) => {
      const riderData = o?.rider || o?._doc?.rider;
      const rider = riderData ? {
        name: riderData.displayName || riderData.name || 'Unknown Rider',
        avatar: riderData.avatar || riderData.image || riderData.profileImage || riderData.photo
      } : undefined;

      return {
        _id: o?._id || o?.id,
        orderNumber: o?.orderNumber || o?.orderNo || o?.number,
        status: o?.status || 'PENDING',
        customerName: o?.customerName || o?.customer?.name,
        customerEmail: o?.customerEmail || o?.customer?.email,
        total: Number(o?.total ?? o?.totalAmount ?? o?.amount ?? 0),
        totalAmount: o?.totalAmount,
        createdAt: o?.createdAt || new Date().toISOString(),
        branchName: o?.branchName || o?.branch?.branchName || o?.branch?.name,
        branch: o?.branch,
        branchId: o?.branch?._id || o?.branchId || o?.branch,
        rider,
      };
    }).filter((o: any) => !!o._id);
  }

  const statusCounts = recentOrders.reduce(
    (acc, o) => {
      const s = (o.status || '').toUpperCase();
      acc.total += 1;
      if (s === 'READY') acc.ready += 1;
      else if (s === 'COMPLETED' || s === 'DELIVERED') acc.completed += 1;
      else if (s === 'CANCELLED' || s === 'CANCEL' || s === 'CANCELED') acc.cancelled += 1;
      else if (s === 'PREPARING' || s === 'CONFIRMED' || s === 'PENDING' || s === 'COOKING_URGENT') acc.preparing += 1;
      else acc.other += 1;
      return acc;
    },
    { total: 0, ready: 0, completed: 0, cancelled: 0, preparing: 0, other: 0 }
  );

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    filtersRef.current = { period: activePeriod, branchId: selectedBranch };
    if (socketRef.current?.connected) {
      setLoading(true);
      socketRef.current.emit('admin_dashboard:get', {
        period: activePeriod,
        branchId: selectedBranch,
        limit: 50,
      });
    }
  }, [activePeriod, selectedBranch]);

  useEffect(() => {
    const branch = branches.find((b) => b._id === selectedBranch);
    if (branch?.currency) {
      setCurrency(branch.currency.trim());
    } else {
      setCurrency('PKR');
    }
  }, [selectedBranch, branches]);

  const ensureSocketConnected = useCallback(() => {
    if (socketRef.current) return;

    const token = localStorage.getItem('auth_token') || localStorage.getItem('authToken') || '';
    const rawApiUrl = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
    const rawProxyTarget = (import.meta as any)?.env?.VITE_PROXY_TARGET as string | undefined;

    const normalizeHost = (value?: string): string => {
      const v = (value || '').trim();
      if (!v) return '';
      return v.replace(/\/?api\/?$/, '').replace(/\/$/, '');
    };

    const socketUrl = normalizeHost(rawProxyTarget) || normalizeHost(rawApiUrl) || 'http://localhost:3101';

    const socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: token ? { token } : undefined,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      const { period, branchId } = filtersRef.current;
      setLoading(true);
      socket.emit('admin_branches:get');
      socket.emit('admin_dashboard:get', { period, branchId, limit: 50 });
    });

    socket.on('admin_branches:data', (payload: any) => {
      const rawList = payload?.branches || payload?.data?.branches || payload?.data || payload || [];
      const normalized = (Array.isArray(rawList) ? rawList : []).map((b: any) => ({
        _id: b?._id || b?.id,
        name: b?.name || b?.branchName || b?.restaurantName,
        currency: b?.currency,
        isActive: typeof b?.isActive === 'boolean' ? b.isActive : (typeof b?.status === 'string' ? String(b.status).toLowerCase() === 'active' : undefined),
      }));
      setBranches(normalized);

      const savedBranchId = localStorage.getItem('selectedBranchId');
      if (savedBranchId && normalized.find((b: any) => b._id === savedBranchId)) {
        setSelectedBranch(savedBranchId);
      }
    });

    socket.on('admin_dashboard:data', (payload: any) => {
      const d: any = payload?.stats || {};
      const currentBranches = branchesRef.current;
      setStats({
        totalOrders: d.totalOrders ?? 0,
        totalRevenue: d.totalRevenue ?? 0,
        totalUsers: d.totalUsers ?? 0,
        totalProducts: d.totalProducts ?? 0,
        activeOrders: d.activeOrders ?? 0,
        totalBranches: currentBranches.length,
        activeRiders: d.activeRiders ?? d.totalRiders ?? 0,
      });

      const branchesPerf = payload?.branchesPerformance;
      if (branchesPerf?.branches) {
        const list = Array.isArray(branchesPerf.branches) ? branchesPerf.branches : [];
        const perf: Branch[] = list.map((b: any, idx: number) => ({
          _id: b?.branchId || `${idx}`,
          name: b?.name,
          orders: Number(b?.orders || 0),
          revenue: Number(b?.revenue || 0),
          riders: Number(b?.riders || 0),
          status: b?.isActive ? 'active' : 'inactive',
        }));
        setBranchPerformance(perf);
      }

      const rawOrders = Array.isArray(payload?.orders) ? payload.orders : [];
      const normalizedOrders = normalizeOrders(rawOrders);
      setRecentOrders(normalizedOrders.slice(0, 10));

      const waitersPerf = payload?.waitersPerformance;
      setWaitersPerformance(Array.isArray(waitersPerf?.waiters) ? waitersPerf.waiters : []);

      const ridersPerf = payload?.ridersPerformance;
      setRidersCount(typeof ridersPerf?.ridersCount === 'number' ? ridersPerf.ridersCount : 0);
      setRidersPerformance(Array.isArray(ridersPerf?.riders) ? ridersPerf.riders : []);

      setLastUpdated(payload?.timestamp ? new Date(payload.timestamp) : new Date());
      setLoading(false);
    });

    socket.on('notification', () => {
      const { period, branchId } = filtersRef.current;
      socket.emit('admin_dashboard:get', { period, branchId, limit: 50 });
    });

    socket.on('admin_dashboard:error', () => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    ensureSocketConnected();
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [ensureSocketConnected]);

  const handlePeriodChange = (_: React.SyntheticEvent, newValue: 'all' | 'day' | 'week' | 'month') => {
    setActivePeriod(newValue);
  };

  const handleBranchChange = (event: SelectChangeEvent<string>) => {
    const branchId = event.target.value;
    setSelectedBranch(branchId);
    
    // Save to localStorage and refresh settings for other pages
    if (branchId && branchId !== 'all') {
      localStorage.setItem('selectedBranchId', branchId);
    } else {
      localStorage.removeItem('selectedBranchId');
    }
    refreshSettings();
  };


  const getStatusColor = (status: string): { bg: string; color: string; label: string } => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
      case 'DELIVERED':
        return { bg: '#dcfce7', color: '#166534', label: 'Completed' };
      case 'CANCELLED':
        return { bg: '#fee2e2', color: '#dc2626', label: 'Cancelled' };
      case 'PREPARING':
        return { bg: '#fed7aa', color: '#9a3412', label: 'Preparing' };
      case 'ON_THE_WAY':
        return { bg: '#dbeafe', color: '#1e40af', label: 'On The Way' };
      case 'COOKING_URGENT':
        return { bg: '#fecaca', color: '#991b1b', label: 'Cooking (Urgent)' };
      case 'READY':
        return { bg: '#d1fae5', color: '#065f46', label: 'Ready' };
      default:
        return { bg: '#f3f4f6', color: '#6b7280', label: status };
    }
  };

  const formatCurrency = (amount: number): string => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${amount.toLocaleString()}`;
    }
  };

  const filteredBranches = useMemo(() => {
    return (branchPerformance || []).filter((b) => {
      if (branchFilter !== 'all' && b.status !== branchFilter) return false;
      if (!globalQuery) return true;
      const hay = `${b.name || ''} ${b.status || ''}`.toLowerCase();
      return hay.includes(globalQuery);
    });
  }, [branchFilter, branchPerformance, globalQuery]);

  const waitersPerformanceVisible = useMemo(() => {
    const list = waitersPerformance || [];
    if (!globalQuery) return list;
    return list.filter((w) => `${w.name || ''}`.toLowerCase().includes(globalQuery));
  }, [globalQuery, waitersPerformance]);

  const ridersPerformanceVisible = useMemo(() => {
    const list = ridersPerformance || [];
    if (!globalQuery) return list;
    return list.filter((r) => `${r.name || ''}`.toLowerCase().includes(globalQuery));
  }, [globalQuery, ridersPerformance]);

  const recentOrdersVisible = useMemo(() => {
    const list = recentOrders || [];
    if (!globalQuery) return list;
    return list.filter((o: any) => {
      const hay = `${o?.orderNumber || ''} ${o?.branchName || ''} ${o?.status || ''} ${o?.rider?.name || ''}`.toLowerCase();
      return hay.includes(globalQuery);
    });
  }, [globalQuery, recentOrders]);

  return (
    <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh', px: 3, py: 3, width: '100%' }}>
      <Container maxWidth={false} disableGutters>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              src={profileImage || undefined}
              sx={{ width: 56, height: 56, bgcolor: '#FF6B35', fontSize: 24, fontWeight: 'bold' }}
            >
              {userData?.displayName?.charAt(0) || userData?.name?.charAt(0) || 'A'}
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a1a2e', fontSize: 28, mb: 0.5 }}>
                Welcome Back, {userData?.displayName || userData?.name || 'Admin'}!
              </Typography>
              <Typography sx={{ color: '#666', fontSize: 14 }}>
                Here's what's happening with your restaurant today
                {lastUpdated && (
                  <Typography component="span" sx={{ ml: 2, color: '#10b981', fontSize: 12 }}>
                    • Last updated: {lastUpdated.toLocaleTimeString()}
                  </Typography>
                )}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Tabs
              value={activePeriod}
              onChange={handlePeriodChange}
              sx={{
                minHeight: 36,
                '& .MuiTabs-flexContainer': { gap: 1 },
              }}
            >
              {(['all', 'day', 'week', 'month'] as const).map((p) => (
                <Tab
                  key={p}
                  value={p}
                  label={p === 'all' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
                  sx={{
                    textTransform: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                    minHeight: 36,
                    px: 2,
                    bgcolor: activePeriod === p ? '#FF6B35' : 'transparent',
                    color: activePeriod === p ? 'white !important' : '#666',
                    borderRadius: 2,
                  }}
                />
              ))}
            </Tabs>

            <FormControl size="small" sx={{ minWidth: 200 }}>
              <Select
                value={selectedBranch}
                onChange={handleBranchChange}
                sx={{
                  bgcolor: 'white',
                  borderRadius: 2,
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}
              >
                <MenuItem value="all">All Branches</MenuItem>
                {branches.map((branch) => (
                  <MenuItem key={branch._id} value={branch._id}>
                    {branch.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Stats Cards Row */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Box onClick={() => navigate('/admin/orders')} sx={{ cursor: 'pointer' }}>
              <StatCard
              icon={<AccountBalanceWallet sx={{ fontSize: 24, color: 'white' }} />}
              value={loading ? '' : formatCurrency(stats.totalRevenue)}
              label="Total Revenue"
              sublabel={loading ? '' : `${statusCounts.completed} completed • ${statusCounts.cancelled} cancelled`}
              bgcolor="#2E7D52"
              loading={loading}
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Box onClick={() => navigate('/admin/orders')} sx={{ cursor: 'pointer' }}>
              <StatCard
              icon={<ReceiptLong sx={{ fontSize: 24, color: 'white' }} />}
              value={loading ? '' : stats.totalOrders.toLocaleString()}
              label="Total Orders"
              sublabel={loading ? '' : `${statusCounts.preparing} preparing • ${statusCounts.ready} ready`}
              bgcolor="#E87E35"
              loading={loading}
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Box onClick={() => navigate('/admin/products')} sx={{ cursor: 'pointer' }}>
              <StatCard
              icon={<RestaurantMenu sx={{ fontSize: 24, color: 'white' }} />}
              value={loading ? '' : stats.totalProducts.toLocaleString()}
              label="Menu Items"
              sublabel={loading ? '' : 'Active products across selection'}
              bgcolor="#7B5CB8"
              loading={loading}
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Box onClick={() => navigate('/admin/branches')} sx={{ cursor: 'pointer' }}>
              <StatCard
              icon={<Store sx={{ fontSize: 24, color: 'white' }} />}
              value={loading ? '' : stats.totalBranches.toString()}
              label="Branches"
              sublabel={loading ? '' : 'All branches'}
              bgcolor="#1E5AA8"
              loading={loading}
              />
            </Box>
          </Grid>
        </Grid>

        {/* Main Content Grid */}
        <Grid container spacing={3}>
          {/* Left Column - Branch Performance */}
          <Grid size={{ xs: 12, lg: 12 }}>
            <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                {/* Header with Tabs */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a2e', fontSize: 18 }}>
                    Branch Performance
                  </Typography>
                </Box>

                {/* Filter Tabs */}
                <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                  {['all', 'active', 'inactive'].map((filter) => (
                    <Button
                      key={filter}
                      onClick={() => setBranchFilter(filter as any)}
                      sx={{
                        textTransform: 'none',
                        borderRadius: 2,
                        px: 2,
                        py: 0.5,
                        fontSize: 13,
                        fontWeight: 500,
                        bgcolor: branchFilter === filter ? '#FF6B35' : '#f5f5f5',
                        color: branchFilter === filter ? 'white' : '#666',
                        '&:hover': {
                          bgcolor: branchFilter === filter ? '#e55a2b' : '#e0e0e0',
                        },
                      }}
                    >
                      {filter === 'all' ? 'All Branches' : filter === 'active' ? 'Active Branches' : 'Inactive Branches'}
                    </Button>
                  ))}
                </Box>

                {/* Branch Table */}
                <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, color: '#666', borderBottom: '2px solid #f0f0f0' }}>Branch Name</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#666', borderBottom: '2px solid #f0f0f0' }} align="center">Orders</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#666', borderBottom: '2px solid #f0f0f0' }} align="right">Revenue</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#666', borderBottom: '2px solid #f0f0f0' }} align="center">Riders</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#666', borderBottom: '2px solid #f0f0f0' }} align="center">Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredBranches.length ? (
                        filteredBranches.map((branch) => (
                          <TableRow key={branch._id} sx={{ '&:hover': { bgcolor: '#fafafa' } }}>
                            <TableCell sx={{ fontWeight: 500, color: '#1a1a2e', py: 2, borderBottom: '1px solid #f5f5f5' }}>
                              {branch.name}
                            </TableCell>
                            <TableCell align="center" sx={{ color: '#666', py: 2, borderBottom: '1px solid #f5f5f5' }}>
                              {branch.orders?.toLocaleString()}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 500, color: '#1a1a2e', py: 2, borderBottom: '1px solid #f5f5f5' }}>
                              {formatCurrency(branch.revenue || 0)}
                            </TableCell>
                            <TableCell align="center" sx={{ color: '#666', py: 2, borderBottom: '1px solid #f5f5f5' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                <TwoWheeler sx={{ fontSize: 16, color: '#666' }} />
                                {branch.riders}
                              </Box>
                            </TableCell>
                            <TableCell align="center" sx={{ py: 2, borderBottom: '1px solid #f5f5f5' }}>
                              <Chip
                                label={branch.status === 'active' ? 'Active' : 'Inactive'}
                                size="small"
                                sx={{
                                  bgcolor: branch.status === 'active' ? '#dcfce7' : '#fee2e2',
                                  color: branch.status === 'active' ? '#166534' : '#dc2626',
                                  fontWeight: 500,
                                  fontSize: 12,
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} sx={{ py: 3, color: '#666', textAlign: 'center', borderBottom: '1px solid #f5f5f5' }}>
                            No matching branches.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a2e', fontSize: 18 }}>
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
                      ) : (waitersPerformanceVisible || []).length > 0 ? (
                        (waitersPerformanceVisible || []).map((w) => (
                          <TableRow key={w.waiterId} sx={{ '&:hover': { bgcolor: '#fafafa' } }}>
                            <TableCell sx={{ fontWeight: 500, color: '#1a1a2e', py: 2, borderBottom: '1px solid #f5f5f5' }}>
                              {w.name || 'Unknown'}
                            </TableCell>
                            <TableCell align="center" sx={{ color: '#666', py: 2, borderBottom: '1px solid #f5f5f5' }}>
                              {(w.servedOrders ?? 0).toLocaleString()}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 500, color: '#1a1a2e', py: 2, borderBottom: '1px solid #f5f5f5' }}>
                              {formatCurrency(Number(w.revenue || 0))}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} sx={{ py: 3, color: '#666', textAlign: 'center', borderBottom: '1px solid #f5f5f5' }}>
                            No waiter performance data for this selection.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a2e', fontSize: 18 }}>
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
                      ) : (ridersPerformanceVisible || []).length > 0 ? (
                        (ridersPerformanceVisible || []).map((r) => (
                          <TableRow key={r.riderId} sx={{ '&:hover': { bgcolor: '#fafafa' } }}>
                            <TableCell sx={{ fontWeight: 500, color: '#1a1a2e', py: 2, borderBottom: '1px solid #f5f5f5' }}>
                              {r.name || 'Unknown'}
                            </TableCell>
                            <TableCell align="center" sx={{ color: '#666', py: 2, borderBottom: '1px solid #f5f5f5' }}>
                              {(r.deliveredOrders ?? 0).toLocaleString()}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 500, color: '#1a1a2e', py: 2, borderBottom: '1px solid #f5f5f5' }}>
                              {formatCurrency(Number(r.revenue || 0))}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} sx={{ py: 3, color: '#666', textAlign: 'center', borderBottom: '1px solid #f5f5f5' }}>
                            No rider performance data for this selection.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            {/* Live Orders Section */}
            <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a2e', fontSize: 18 }}>
                    Live Orders
                  </Typography>
                </Box>

                {/* Orders Table */}
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#fafafa' }}>
                        <TableCell sx={{ fontWeight: 600, color: '#666', fontSize: 13 }}>Order ID</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#666', fontSize: 13 }}>Branch</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#666', fontSize: 13 }}>ETA</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#666', fontSize: 13 }}>Order Status</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#666', fontSize: 13 }}>Rider</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#666', fontSize: 13 }}>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentOrdersVisible.length ? (
                        recentOrdersVisible.map((order) => {
                          const statusStyle = getStatusColor(order.status);
                          return (
                            <TableRow key={order._id} sx={{ '&:hover': { bgcolor: '#fafafa' } }}>
                              <TableCell sx={{ fontWeight: 600, color: '#1a1a2e' }}>
                                #{order.orderNumber}
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                  <Typography sx={{ fontWeight: 500, color: '#1a1a2e' }}>{order.branchName}</Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#666' }}>
                                  <AccessTime sx={{ fontSize: 16 }} />
                                  {order.eta}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={statusStyle.label}
                                  size="small"
                                  sx={{
                                    bgcolor: statusStyle.bg,
                                    color: statusStyle.color,
                                    fontWeight: 600,
                                    fontSize: 11,
                                    borderRadius: 1,
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Avatar
                                    src={order.rider?.avatar ? normalizeMediaUrl(order.rider.avatar) : undefined}
                                    sx={{ width: 28, height: 28, fontSize: 12, bgcolor: '#FF6B35' }}
                                  >
                                    {order.rider?.name?.charAt(0) || 'R'}
                                  </Avatar>
                                  <Typography sx={{ fontSize: 13, color: '#666' }}>{order.rider?.name || 'Unassigned'}</Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <Button 
                                    size="small" 
                                    sx={{ 
                                      textTransform: 'none', 
                                      fontSize: 12, 
                                      color: '#666',
                                      minWidth: 'auto',
                                      px: 1.5,
                                    }}
                                  >
                                    View
                                  </Button>
                                  <Button 
                                    size="small" 
                                    variant="contained"
                                    sx={{ 
                                      textTransform: 'none', 
                                      fontSize: 12, 
                                      bgcolor: '#22c55e',
                                      '&:hover': { bgcolor: '#16a34a' },
                                      minWidth: 'auto',
                                      px: 2,
                                    }}
                                  >
                                    Track
                                  </Button>
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} sx={{ py: 3, color: '#666', textAlign: 'center' }}>
                            {globalQuery ? 'No matching orders.' : 'No orders.'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default AdminDashboard;
