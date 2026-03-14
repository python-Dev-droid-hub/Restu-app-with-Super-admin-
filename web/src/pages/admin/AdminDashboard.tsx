import React, { useState, useEffect } from 'react';
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
import {
  Store,
  ShoppingCart,
  TwoWheeler,
  AccountBalanceWallet,
  TrendingUp,
  TrendingDown,
  ArrowForward,
  AccessTime,
  Person,
} from '@mui/icons-material';
import {
  XAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

import { api } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';

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

interface SalesData {
  day: string;
  revenue: number;
  orders: number;
}

// ==================== COMPONENT ====================
const AdminDashboard: React.FC = () => {
  const { currencySymbol, formatPrice, refreshSettings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [activePeriod, setActivePeriod] = useState<'day' | 'week' | 'month'>('day');
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
  
  const [salesData, setSalesData] = useState<SalesData[]>([]);

  const [branchPerformance, setBranchPerformance] = useState<Branch[]>([]);

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const statusCounts = recentOrders.reduce(
    (acc, o) => {
      const s = (o.status || '').toUpperCase();
      acc.total += 1;
      if (s === 'READY') acc.ready += 1;
      else if (s === 'COMPLETED' || s === 'DELIVERED') acc.completed += 1;
      else if (s === 'CANCELLED') acc.cancelled += 1;
      else if (s === 'PREPARING' || s === 'CONFIRMED' || s === 'PENDING' || s === 'COOKING_URGENT') acc.preparing += 1;
      else acc.other += 1;
      return acc;
    },
    { total: 0, ready: 0, completed: 0, cancelled: 0, preparing: 0, other: 0 }
  );

  useEffect(() => {
    loadBranches();
    loadCurrency();
  }, []);

  useEffect(() => {
    if (branches.length > 0) {
      loadDashboardData();
    }
  }, [activePeriod, selectedBranch, branches]);

  useEffect(() => {
    const branch = branches.find((b) => b._id === selectedBranch);
    if (branch?.currency) {
      setCurrency(branch.currency.trim());
    } else {
      // Reset to global currency when all branches or branch without currency is selected
      loadCurrency();
    }
  }, [selectedBranch, branches]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboardData();
    }, 10000); // Refresh every 10 seconds for real-time updates
    return () => clearInterval(interval);
  }, [activePeriod, selectedBranch, branches]);

  const handlePeriodChange = (_: React.SyntheticEvent, newValue: 'day' | 'week' | 'month') => {
    setActivePeriod(newValue);
  };

  const loadCurrency = async () => {
    try {
      const response: any = await api.getSettings();
      const c = response?.data?.currency;
      if (typeof c === 'string' && c.trim()) setCurrency(c.trim());
    } catch (error) {
      console.error('Error loading settings currency:', error);
    }
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

  const loadBranches = async () => {
    try {
      const response: any = await api.getAllBranches();
      if (!response?.success) return;

      const rawList = response?.data?.branches || response?.data?.data?.branches || response?.data?.data?.restaurants || response?.data || [];
      const normalized = (Array.isArray(rawList) ? rawList : []).map((b: any) => ({
        _id: b?._id || b?.id,
        name: b?.name || b?.branchName || b?.restaurantName,
        currency: b?.currency,
      }));
      setBranches(normalized);
      
      // Check if there's a saved branch selection
      const savedBranchId = localStorage.getItem('selectedBranchId');
      if (savedBranchId && normalized.find((b: any) => b._id === savedBranchId)) {
        setSelectedBranch(savedBranchId);
      }
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const normalizeOrders = (orders: any[]): Order[] => {
    return (Array.isArray(orders) ? orders : []).map((o: any) => ({
      _id: o?._id || o?.id,
      orderNumber: o?.orderNumber || o?.orderNo || o?.number,
      status: o?.status || 'PENDING',
      customerName: o?.customerName || o?.customer?.name,
      customerEmail: o?.customerEmail || o?.customer?.email,
      total: Number(o?.total ?? o?.totalAmount ?? o?.amount ?? 0),
      totalAmount: o?.totalAmount,
      createdAt: o?.createdAt || new Date().toISOString(),
      branchName: o?.branchName || o?.branch?.name,
      branch: o?.branch,
    })).filter((o: any) => !!o._id);
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [statsResponse, ordersResponse]: any[] = await Promise.all([
        api.getAdminDashboardStats({ period: activePeriod, branchId: selectedBranch }),
        api.getAdminOrders({ limit: 50, period: activePeriod, branchId: selectedBranch }),
      ]);

      if (statsResponse?.success && statsResponse?.data) {
        const d: any = statsResponse.data;
        setStats({
          totalOrders: d.totalOrders ?? 0,
          totalRevenue: d.totalRevenue ?? 0,
          totalUsers: d.totalUsers ?? 0,
          totalProducts: d.totalProducts ?? 0,
          activeOrders: d.activeOrders ?? 0,
          totalBranches: branches.length,
          activeRiders: d.activeRiders ?? d.totalRiders ?? 0,
        });
      } else {
        setStats((prev) => ({ ...prev, totalBranches: branches.length }));
      }

      if (ordersResponse?.success && ordersResponse?.data) {
        const od: any = ordersResponse.data;
        const rawOrders = od.orders || od.data?.orders || od.data || od;
        const normalizedOrders = normalizeOrders(rawOrders);
        setRecentOrders(normalizedOrders.slice(0, 10));
        setLastUpdated(new Date());

        // Build Branch Performance from orders aggregation (fallback if server doesn't provide it)
        const map = new Map<string, { name: string; orders: number; revenue: number }>();
        normalizedOrders.forEach((o) => {
          const key = o.branchName || 'Main Branch';
          const curr = map.get(key) || { name: key, orders: 0, revenue: 0 };
          curr.orders += 1;
          curr.revenue += Number(o.total || 0);
          map.set(key, curr);
        });
        const perf: Branch[] = Array.from(map.values())
          .sort((a, b) => (b.orders || 0) - (a.orders || 0))
          .slice(0, 10)
          .map((b, idx) => ({
            _id: `${idx}`,
            name: b.name,
            orders: b.orders,
            revenue: b.revenue,
            riders: undefined,
            status: 'active',
          }));
        if (perf.length > 0) setBranchPerformance(perf);
      }

      // Sales chart: use analytics endpoint if available, else derive from stats/orders
      try {
        const analyticsResponse: any = await api.getDashboardAnalytics({ range: activePeriod === 'day' ? 'today' : activePeriod === 'week' ? '7d' : '30d' });
        if (analyticsResponse?.success && analyticsResponse?.data?.sales) {
          setSalesData(analyticsResponse.data.sales);
        }
      } catch {
        // ignore, keep fallback
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
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

  // Stat Card Component with solid colors (matching mobile)
  const StatCard = ({
    icon,
    value,
    label,
    sublabel,
    trend,
    trendUp,
    bgcolor 
  }: { 
    icon: React.ReactNode;
    value: string;
    label: string;
    sublabel: string;
    trend: string;
    trendUp: boolean;
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

  const filteredBranches = branchPerformance.filter(b => {
    if (branchFilter === 'all') return true;
    return b.status === branchFilter;
  });

  return (
    <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh', px: 3, py: 3, width: '100%' }}>
      <Container maxWidth={false} disableGutters>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a1a2e', fontSize: 28, mb: 1 }}>
              Welcome Back, Admin!
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

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Tabs
              value={activePeriod}
              onChange={handlePeriodChange}
              sx={{
                minHeight: 36,
                '& .MuiTabs-flexContainer': { gap: 1 },
              }}
            >
              {(['day', 'week', 'month'] as const).map((p) => (
                <Tab
                  key={p}
                  value={p}
                  label={p.charAt(0).toUpperCase() + p.slice(1)}
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
            <StatCard
              icon={<Store sx={{ fontSize: 24, color: 'white' }} />}
              value={loading ? '' : stats.totalBranches.toString()}
              label="Total Branches"
              sublabel="↗ 3 last week"
              trend="+3"
              trendUp={true}
              bgcolor="#1E5AA8"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              icon={<ShoppingCart sx={{ fontSize: 24, color: 'white' }} />}
              value={loading ? '' : stats.totalOrders.toLocaleString()}
              label="Active Orders"
              sublabel={loading ? '' : `${statusCounts.preparing} preparing • ${statusCounts.ready} ready`}
              trend={loading ? '' : `${stats.activeOrders}`}
              trendUp={true}
              bgcolor="#E87E35"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              icon={<TwoWheeler sx={{ fontSize: 24, color: 'white' }} />}
              value={loading ? '' : stats.activeRiders.toString()}
              label="Active Riders"
              sublabel="↗ +4 new today"
              trend="+4"
              trendUp={true}
              bgcolor="#7B5CB8"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              icon={<AccountBalanceWallet sx={{ fontSize: 24, color: 'white' }} />}
              value={loading ? '' : formatCurrency(stats.totalRevenue)}
              label="Revenue Today"
              sublabel={loading ? '' : `${statusCounts.completed} completed • ${statusCounts.cancelled} cancelled`}
              trend={loading ? '' : formatCurrency(stats.totalRevenue)}
              trendUp={true}
              bgcolor="#2E7D52"
            />
          </Grid>
        </Grid>

        {/* Main Content Grid */}
        <Grid container spacing={3}>
          {/* Left Column - Branch Performance */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                {/* Header with Tabs */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a2e', fontSize: 18 }}>
                    Branch Performance
                  </Typography>
                  <Button 
                    endIcon={<ArrowForward />} 
                    sx={{ color: '#FF6B35', textTransform: 'none', fontWeight: 500 }}
                  >
                    View All
                  </Button>
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
                      {filteredBranches.map((branch) => (
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
                      ))}
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
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {['All Branches', 'Branch', 'ETA', 'Order Status'].map((filter, i) => (
                      <Button
                        key={filter}
                        size="small"
                        sx={{
                          textTransform: 'none',
                          borderRadius: 2,
                          px: 2,
                          py: 0.5,
                          fontSize: 12,
                          bgcolor: i === 0 ? '#fee2e2' : 'transparent',
                          color: i === 0 ? '#dc2626' : '#666',
                          border: i === 0 ? 'none' : '1px solid #e0e0e0',
                          fontWeight: 500,
                        }}
                      >
                        {filter}
                      </Button>
                    ))}
                  </Box>
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
                      {recentOrders.map((order) => {
                        const statusStyle = getStatusColor(order.status);
                        return (
                          <TableRow key={order._id} sx={{ '&:hover': { bgcolor: '#fafafa' } }}>
                            <TableCell sx={{ fontWeight: 600, color: '#1a1a2e' }}>
                              #{order.orderNumber}
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                <Typography sx={{ fontWeight: 500, color: '#1a1a2e' }}>{order.branchName}</Typography>
                                <Typography sx={{ fontSize: 12, color: '#999' }}>West Side</Typography>
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
                                <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: '#FF6B35' }}>
                                  {order.rider?.name?.charAt(0)}
                                </Avatar>
                                <Typography sx={{ fontSize: 13, color: '#666' }}>{order.rider?.name}</Typography>
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
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column - Sales Overview */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a2e', fontSize: 18 }}>
                    Sales Overview
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: '#999', cursor: 'pointer' }}>
                    Last 7 Days ›
                  </Typography>
                </Box>

                {/* Stats */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                  <Box>
                    <Typography sx={{ fontSize: 12, color: '#999', mb: 0.5 }}>Total Revenue</Typography>
                    <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>
                      {formatPrice(852000)}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#22c55e' }}>↗ 3,552L</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 12, color: '#999', mb: 0.5 }}>Orders Count</Typography>
                    <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>
                      3,552
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#ef4444' }}>↘ 2.4% ▼</Typography>
                  </Box>
                </Box>

                {/* Chart */}
                <Box sx={{ height: 180, mb: 2 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#999' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #f0f0f0',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(value) => [`${currencySymbol}${value}L`, 'Revenue']}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#FF6B35"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>

            {/* Right Side Live Orders Summary */}
            <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a2e', fontSize: 16, mb: 2 }}>
                  Live Orders
                </Typography>
                
                {recentOrders.slice(0, 3).map((order) => {
                  const statusStyle = getStatusColor(order.status);
                  return (
                    <Box key={order._id} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, pb: 2, borderBottom: '1px solid #f0f0f0', '&:last-child': { borderBottom: 'none', mb: 0, pb: 0 } }}>
                      <Avatar sx={{ width: 40, height: 40, bgcolor: '#f5f5f5' }}>
                        <Person sx={{ color: '#666' }} />
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography sx={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>
                            #{order.orderNumber} {order.branchName}
                          </Typography>
                          <Typography sx={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>
                            {formatPrice(order.total)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                          <Typography sx={{ fontSize: 12, color: '#666' }}>
                            <AccessTime sx={{ fontSize: 12, mr: 0.5 }} />
                            {order.eta}
                          </Typography>
                          <Chip
                            label={statusStyle.label}
                            size="small"
                            sx={{
                              bgcolor: statusStyle.bg,
                              color: statusStyle.color,
                              fontWeight: 500,
                              fontSize: 10,
                              height: 20,
                            }}
                          />
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default AdminDashboard;
