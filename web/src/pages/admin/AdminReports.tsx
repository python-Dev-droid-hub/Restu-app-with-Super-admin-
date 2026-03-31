import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  Skeleton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Receipt,
  People,
  Restaurant,
} from '@mui/icons-material';
import { api } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';

interface ReportStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  averageOrderValue: number;
  topProducts: { name: string; count: number; revenue: number }[];
  ordersByStatus: { status: string; count: number }[];
  revenueByBranch: { branchName: string; revenue: number }[];
}

const AdminReports: React.FC = () => {
  const { formatPrice, defaultCurrency } = useSettings();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [dateRange, setDateRange] = useState('week');
  const [branchId, setBranchId] = useState('all');
  const [branches, setBranches] = useState<{ _id: string; branchName: string }[]>([]);

  useEffect(() => {
    loadBranches();
    loadReportData();
  }, [dateRange, branchId]);

  const loadBranches = async () => {
    try {
      const response: any = await api.getAllBranches();
      if (response?.success) {
        const rawBranches = response.data?.branches || response.data || [];
        setBranches(rawBranches.map((b: any) => ({ _id: b._id, branchName: b.branchName || b.name })));
      }
    } catch (err) {
      console.error('Error loading branches:', err);
    }
  };

  const loadReportData = async () => {
    try {
      setLoading(true);
      const params: any = { range: dateRange };
      if (branchId !== 'all') params.branchId = branchId;
      
      const response: any = await api.getDashboardAnalytics(params);
      if (response?.success) {
        const data = response.data || {};
        setStats({
          totalRevenue: data.totalRevenue || data.revenue?.total || 0,
          totalOrders: data.totalOrders || data.orders?.total || 0,
          totalCustomers: data.totalCustomers || data.customers?.total || 0,
          averageOrderValue: data.averageOrderValue || (data.totalRevenue && data.totalOrders ? data.totalRevenue / data.totalOrders : 0),
          topProducts: data.topProducts || data.popularItems || [],
          ordersByStatus: data.ordersByStatus || [],
          revenueByBranch: data.revenueByBranch || [],
        });
      }
    } catch (err) {
      console.error('Error loading report data:', err);
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

  const SolidStatCard = ({
    icon,
    value,
    label,
    sublabel,
    bgcolor,
  }: {
    icon: React.ReactNode;
    value: string;
    label: string;
    sublabel: string;
    bgcolor: string;
  }) => (
    <Card
      sx={{
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
      }}
    >
      <CardContent
        sx={{
          p: 2.5,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              borderRadius: 2,
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
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

  return (
    <Box sx={{ p: 3, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#333' }}>
          Reports & Analytics
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Date Range</InputLabel>
            <Select value={dateRange} label="Date Range" onChange={(e) => setDateRange(e.target.value)}>
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="week">This Week</MenuItem>
              <MenuItem value="month">This Month</MenuItem>
              <MenuItem value="quarter">This Quarter</MenuItem>
              <MenuItem value="year">This Year</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Branch</InputLabel>
            <Select value={branchId} label="Branch" onChange={(e) => setBranchId(e.target.value)}>
              <MenuItem value="all">All Branches</MenuItem>
              {branches.map((b) => (
                <MenuItem key={b._id} value={b._id}>{b.branchName}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
              <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
            </Grid>
          ))
        ) : (
          <>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SolidStatCard
                icon={<AttachMoney sx={{ fontSize: 24, color: 'white' }} />}
                value={formatCurrency(stats?.totalRevenue || 0)}
                label="Total Revenue"
                sublabel="All payments"
                bgcolor="#2E7D52"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SolidStatCard
                icon={<Receipt sx={{ fontSize: 24, color: 'white' }} />}
                value={(stats?.totalOrders || 0).toLocaleString()}
                label="Total Orders"
                sublabel="Orders placed"
                bgcolor="#E87E35"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SolidStatCard
                icon={<People sx={{ fontSize: 24, color: 'white' }} />}
                value={(stats?.totalCustomers || 0).toLocaleString()}
                label="Customers"
                sublabel="Registered customers"
                bgcolor="#1E5AA8"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SolidStatCard
                icon={<Restaurant sx={{ fontSize: 24, color: 'white' }} />}
                value={formatCurrency(stats?.averageOrderValue || 0)}
                label="Avg Order Value"
                sublabel="Revenue per order"
                bgcolor="#7B5CB8"
              />
            </Grid>
          </>
        )}
      </Grid>

      <Grid container spacing={3}>
        {/* Top Products */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
              Top Selling Products
            </Typography>
            {loading ? (
              <Skeleton variant="rectangular" height={200} />
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell align="right">Orders</TableCell>
                      <TableCell align="right">Revenue</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats?.topProducts?.slice(0, 5).map((product, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip label={i + 1} size="small" sx={{ bgcolor: '#FF6B35', color: 'white', minWidth: 24 }} />
                            {product.name}
                          </Box>
                        </TableCell>
                        <TableCell align="right">{product.count}</TableCell>
                        <TableCell align="right">{formatCurrency(product.revenue)}</TableCell>
                      </TableRow>
                    )) || (
                      <TableRow>
                        <TableCell colSpan={3} align="center">No data available</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        {/* Revenue by Branch */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
              Revenue by Branch
            </Typography>
            {loading ? (
              <Skeleton variant="rectangular" height={200} />
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Branch</TableCell>
                      <TableCell align="right">Revenue</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats?.revenueByBranch?.slice(0, 5).map((branch, i) => (
                      <TableRow key={i}>
                        <TableCell>{branch.branchName}</TableCell>
                        <TableCell align="right">{formatCurrency(branch.revenue)}</TableCell>
                      </TableRow>
                    )) || (
                      <TableRow>
                        <TableCell colSpan={2} align="center">No data available</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminReports;
