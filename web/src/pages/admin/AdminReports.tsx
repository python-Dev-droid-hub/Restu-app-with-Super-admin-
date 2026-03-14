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

  const StatCard = ({ title, value, icon, trend, color }: { title: string; value: string | number; icon: React.ReactNode; trend?: number; color: string }) => (
    <Card sx={{ borderRadius: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color }}>
              {value}
            </Typography>
            {trend !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {trend >= 0 ? (
                  <TrendingUp sx={{ fontSize: 16, color: '#4CAF50' }} />
                ) : (
                  <TrendingDown sx={{ fontSize: 16, color: '#F44336' }} />
                )}
                <Typography variant="caption" sx={{ color: trend >= 0 ? '#4CAF50' : '#F44336', ml: 0.5 }}>
                  {Math.abs(trend)}% vs last period
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ bgcolor: `${color}20`, borderRadius: 2, p: 1.5 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3, bgcolor: '#f8f5ff', minHeight: '100vh' }}>
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
              <StatCard
                title="Total Revenue"
                value={formatCurrency(stats?.totalRevenue || 0)}
                icon={<AttachMoney sx={{ color: '#4CAF50' }} />}
                color="#4CAF50"
                trend={12}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="Total Orders"
                value={stats?.totalOrders || 0}
                icon={<Receipt sx={{ color: '#2196F3' }} />}
                color="#2196F3"
                trend={8}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="Total Customers"
                value={stats?.totalCustomers || 0}
                icon={<People sx={{ color: '#FF9800' }} />}
                color="#FF9800"
                trend={5}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="Avg Order Value"
                value={formatCurrency(stats?.averageOrderValue || 0)}
                icon={<Restaurant sx={{ color: '#9C27B0' }} />}
                color="#9C27B0"
                trend={3}
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
