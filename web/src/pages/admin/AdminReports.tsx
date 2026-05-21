import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Button,
  Alert,
} from '@mui/material';
import {
  AttachMoney,
  Receipt,
  People,
  Restaurant,
  CalendarMonth,
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { useLocation } from 'react-router-dom';
import { api } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { ReportExportPanel } from '../../components/reports/ReportExportPanel';
import { mapApiToAnalyticsReport, getPeriodLabel } from '../../utils/mapAnalyticsToReport';
import type { AnalyticsReportData } from '../../types/analyticsReport';
import { dummyAnalyticsReport } from '../../data/dummyAnalyticsReport';

interface ReportStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  averageOrderValue: number;
  topProducts: { name: string; count: number; revenue: number }[];
  revenueByBranch: { branchName: string; revenue: number; orders?: number }[];
}

const STAT_CARD_THEME = {
  revenue: { bg: '#2E7D52', iconBg: 'rgba(255,255,255,0.28)' },
  orders: { bg: '#E87E35', iconBg: 'rgba(255,255,255,0.28)' },
  customers: { bg: '#1565C0', iconBg: 'rgba(255,255,255,0.28)' },
  avgOrder: { bg: '#6A4C9C', iconBg: 'rgba(255,255,255,0.28)' },
} as const;

const cardTextSx = {
  color: '#FFFFFF',
};

const mapDateRangeToApi = (range: string): string => {
  const map: Record<string, string> = {
    today: '1d',
    week: '7d',
    month: '30d',
    quarter: '90d',
    year: '1y',
  };
  return map[range] || range;
};

const toDateInputValue = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const defaultCustomStart = () =>
  toDateInputValue(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
const defaultCustomEnd = () => toDateInputValue(new Date());

const AdminReports: React.FC = () => {
  const { defaultCurrency, appName } = useSettings();
  const location = useLocation();
  const asManager =
    location.pathname.startsWith('/manager/') ||
    localStorage.getItem('userRole') === 'BRANCH_MANAGER';

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<AnalyticsReportData | null>(null);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [dateRange, setDateRange] = useState('week');
  const [customStart, setCustomStart] = useState(defaultCustomStart);
  const [customEnd, setCustomEnd] = useState(defaultCustomEnd);
  const [appliedCustom, setAppliedCustom] = useState({
    start: defaultCustomStart(),
    end: defaultCustomEnd(),
  });
  const [customAppliedAt, setCustomAppliedAt] = useState(0);
  const [branchId, setBranchId] = useState('all');
  const [branches, setBranches] = useState<{ _id: string; branchName: string }[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);

  const loadBranches = useCallback(async () => {
    try {
      const response: any = await api.getAllBranches();
      if (response?.success) {
        const rawBranches = response.data?.branches || response.data || [];
        setBranches(
          (Array.isArray(rawBranches) ? rawBranches : []).map((b: any) => ({
            _id: b._id,
            branchName: b.branchName || b.name || 'Branch',
          }))
        );
      }
    } catch (err) {
      console.error('Error loading branches:', err);
    }
  }, []);

  const analyticsParams = useMemo(() => {
    if (dateRange === 'custom') {
      return {
        startDate: appliedCustom.start,
        endDate: appliedCustom.end,
        branchId,
        asManager,
      };
    }
    return {
      range: mapDateRangeToApi(dateRange),
      branchId,
      asManager,
    };
  }, [dateRange, appliedCustom, branchId, asManager]);

  const loadReportData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const response: any = await api.getDashboardAnalytics(analyticsParams);

      if (response?.success) {
        const data = response.data || {};
        const topProducts = (data.topProducts || []).map((p: any) => ({
          name: p.name || p.productName || 'Unknown',
          count: Number(p.count ?? p.orders ?? p.quantity ?? 0),
          revenue: Number(p.revenue ?? 0),
        }));

        const revenueByBranch = (data.revenueByBranch || data.topRestaurants || []).map(
          (b: any) => ({
            branchName: b.branchName || b.name || 'Unknown',
            revenue: Number(b.revenue ?? 0),
            orders: Number(b.orders ?? 0),
          })
        );

        const totalRevenue = Number(data.totalRevenue ?? 0);
        const totalOrders = Number(data.totalOrders ?? 0);
        const totalCustomers = Number(
          data.totalCustomers ??
            (Array.isArray(data.userGrowth)
              ? data.userGrowth.reduce((s: number, u: { users?: number }) => s + (u.users || 0), 0)
              : 0)
        );

        const branchLabel =
          branchId === 'all'
            ? 'All Branches'
            : branches.find((b) => b._id === branchId)?.branchName || 'Selected Branch';

        const periodLabel =
          dateRange === 'custom'
            ? getPeriodLabel('custom', appliedCustom)
            : getPeriodLabel(dateRange);

        const mapped = mapApiToAnalyticsReport(data, {
          restaurantName: appName,
          periodLabel,
          branchLabel,
        });

        setReportData(mapped);
        setStats({
          totalRevenue,
          totalOrders,
          totalCustomers,
          averageOrderValue: Number(
            data.averageOrderValue ?? (totalOrders > 0 ? totalRevenue / totalOrders : 0)
          ),
          topProducts,
          revenueByBranch,
        });
      } else {
        setLoadError(response?.message || 'Failed to load reports');
        setStats(null);
        setReportData(null);
      }
    } catch (err) {
      console.error('Error loading report data:', err);
      setLoadError('Could not load report data. Check that the API server is running.');
      setStats(null);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [analyticsParams, appName, branches, dateRange, appliedCustom]);

  const periodLabelForExport = useMemo(
    () =>
      dateRange === 'custom'
        ? getPeriodLabel('custom', appliedCustom)
        : getPeriodLabel(dateRange),
    [dateRange, appliedCustom]
  );

  const branchLabelForExport = useMemo(
    () =>
      branchId === 'all'
        ? 'All Branches'
        : branches.find((b) => b._id === branchId)?.branchName || 'Selected Branch',
    [branchId, branches]
  );

  const exportReport = useMemo((): AnalyticsReportData => {
    const base = reportData ?? dummyAnalyticsReport;
    return {
      ...base,
      meta: {
        ...base.meta,
        restaurantName: appName,
        periodLabel: periodLabelForExport,
        branchLabel: branchLabelForExport,
        generatedAt: new Date().toISOString(),
      },
    };
  }, [reportData, appName, periodLabelForExport, branchLabelForExport]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    if (dateRange === 'custom') return;
    loadReportData();
  }, [dateRange, branchId, loadReportData]);

  useEffect(() => {
    if (dateRange !== 'custom' || customAppliedAt === 0) return;
    loadReportData();
  }, [customAppliedAt, appliedCustom, branchId, dateRange, loadReportData]);

  const validateCustomRange = (start: string, end: string) => {
    if (!start || !end) return 'Select both start and end dates';
    if (start > end) return 'Start date must be on or before end date';
    return null;
  };

  const handleApplyFilters = () => {
    if (dateRange === 'custom') {
      const err = validateCustomRange(customStart, customEnd);
      if (err) {
        setFilterError(err);
        return;
      }
      setFilterError(null);
      setAppliedCustom({ start: customStart, end: customEnd });
      setCustomAppliedAt((n) => n + 1);
      return;
    }
    setFilterError(null);
    loadReportData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: defaultCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const SolidStatCard = ({
    icon,
    value,
    label,
    sublabel,
    themeKey,
  }: {
    icon: React.ReactNode;
    value: string;
    label: string;
    sublabel: string;
    themeKey: keyof typeof STAT_CARD_THEME;
  }) => {
    const palette = STAT_CARD_THEME[themeKey];
    return (
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          background: palette.bg,
          backgroundColor: palette.bg,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          height: 136,
          '& .MuiCardContent-root': { color: '#FFFFFF' },
          '& .MuiTypography-root': { color: '#FFFFFF' },
        }}
      >
        <CardContent
          sx={{
            p: 2.5,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            color: '#FFFFFF',
          }}
        >
          <Box
            sx={{
              bgcolor: palette.iconBg,
              borderRadius: 2,
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
          <Typography sx={{ ...cardTextSx, fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>
            {loading ? (
              <Skeleton
                width={80}
                height={32}
                sx={{ bgcolor: 'rgba(255,255,255,0.35)', borderRadius: 1 }}
              />
            ) : (
              value
            )}
          </Typography>
          <Box>
            <Typography sx={{ ...cardTextSx, fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>
              {label}
            </Typography>
            <Typography sx={{ ...cardTextSx, fontSize: 12, fontWeight: 400, opacity: 0.92, mt: 0.25 }}>
              {sublabel}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const tableHeadSx = {
    bgcolor: '#f5f5f5',
    fontWeight: 600,
    color: '#555',
    borderBottom: '1px solid #e8e8e8',
  };

  return (
    <Box
      sx={{
        px: { xs: 2, md: 3 },
        py: { xs: 2, md: 3 },
        bgcolor: '#fff',
        minHeight: '100%',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#2d2d2d' }}>
          Reports & Analytics
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <FormControl size="small" sx={{ minWidth: 160, bgcolor: '#fff' }}>
            <InputLabel>Date Range</InputLabel>
            <Select
              value={dateRange}
              label="Date Range"
              onChange={(e) => {
                const next = e.target.value;
                setDateRange(next);
                setFilterError(null);
                if (next !== 'custom') setCustomAppliedAt(0);
              }}
            >
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="week">This Week</MenuItem>
              <MenuItem value="month">This Month</MenuItem>
              <MenuItem value="quarter">This Quarter</MenuItem>
              <MenuItem value="year">This Year</MenuItem>
              <MenuItem value="custom">Custom range</MenuItem>
            </Select>
          </FormControl>
          {dateRange === 'custom' && (
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="From"
                value={customStart ? dayjs(customStart) : null}
                onChange={(value) => setCustomStart(value ? value.format('YYYY-MM-DD') : '')}
                maxDate={customEnd ? dayjs(customEnd) : dayjs()}
                slots={{ openPickerIcon: CalendarMonth }}
                slotProps={{
                  textField: {
                    size: 'small',
                    sx: { minWidth: 168, bgcolor: '#fff' },
                  },
                  openPickerButton: { 'aria-label': 'Open start date calendar' },
                }}
              />
              <DatePicker
                label="To"
                value={customEnd ? dayjs(customEnd) : null}
                onChange={(value) => setCustomEnd(value ? value.format('YYYY-MM-DD') : '')}
                minDate={customStart ? dayjs(customStart) : undefined}
                maxDate={dayjs()}
                slots={{ openPickerIcon: CalendarMonth }}
                slotProps={{
                  textField: {
                    size: 'small',
                    sx: { minWidth: 168, bgcolor: '#fff' },
                  },
                  openPickerButton: { 'aria-label': 'Open end date calendar' },
                }}
              />
            </LocalizationProvider>
          )}
          {!asManager && (
            <FormControl size="small" sx={{ minWidth: 160, bgcolor: '#fff' }}>
              <InputLabel>Branch</InputLabel>
              <Select
                value={branchId}
                label="Branch"
                onChange={(e) => setBranchId(e.target.value)}
              >
                <MenuItem value="all">All Branches</MenuItem>
                {branches.map((b) => (
                  <MenuItem key={b._id} value={b._id}>
                    {b.branchName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <Button variant="contained" onClick={handleApplyFilters} disabled={loading}>
            Apply
          </Button>
          <ReportExportPanel
            data={exportReport}
            formatCurrency={formatCurrency}
            loading={loading}
          />
        </Box>
      </Box>

      {filterError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {filterError}
        </Alert>
      )}

      {loadError && (
        <Typography color="error" sx={{ mb: 2 }}>
          {loadError}
        </Typography>
      )}

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SolidStatCard
            themeKey="revenue"
            icon={<AttachMoney sx={{ fontSize: 24, color: '#FFFFFF' }} />}
            value={formatCurrency(stats?.totalRevenue || 0)}
            label="Total Revenue"
            sublabel="All payments"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SolidStatCard
            themeKey="orders"
            icon={<Receipt sx={{ fontSize: 24, color: '#FFFFFF' }} />}
            value={(stats?.totalOrders || 0).toLocaleString()}
            label="Total Orders"
            sublabel="Orders placed"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SolidStatCard
            themeKey="customers"
            icon={<People sx={{ fontSize: 24, color: '#FFFFFF' }} />}
            value={(stats?.totalCustomers || 0).toLocaleString()}
            label="Customers"
            sublabel="Registered customers"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SolidStatCard
            themeKey="avgOrder"
            icon={<Restaurant sx={{ fontSize: 24, color: '#FFFFFF' }} />}
            value={formatCurrency(stats?.averageOrderValue || 0)}
            label="Avg Order Value"
            sublabel="Revenue per order"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 2,
              border: '1px solid #eee',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#333' }}>
              Top Selling Products
            </Typography>
            {loading ? (
              <Skeleton variant="rectangular" height={220} />
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={tableHeadSx}>Product</TableCell>
                      <TableCell sx={tableHeadSx} align="right">
                        Orders
                      </TableCell>
                      <TableCell sx={tableHeadSx} align="right">
                        Revenue
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(stats?.topProducts?.length ? stats.topProducts : []).map((product, i) => (
                      <TableRow key={`${product.name}-${i}`} hover>
                        <TableCell>{product.name}</TableCell>
                        <TableCell align="right">{product.count}</TableCell>
                        <TableCell align="right">{formatCurrency(product.revenue)}</TableCell>
                      </TableRow>
                    ))}
                    {!stats?.topProducts?.length && (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ color: '#999', py: 3 }}>
                          No product sales in this period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 2,
              border: '1px solid #eee',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#333' }}>
              Revenue by Branch
            </Typography>
            {loading ? (
              <Skeleton variant="rectangular" height={220} />
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={tableHeadSx}>Branch</TableCell>
                      <TableCell sx={tableHeadSx} align="right">
                        Revenue
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(stats?.revenueByBranch?.length ? stats.revenueByBranch : []).map(
                      (branch, i) => (
                        <TableRow key={`${branch.branchName}-${i}`} hover>
                          <TableCell>{branch.branchName}</TableCell>
                          <TableCell align="right">{formatCurrency(branch.revenue)}</TableCell>
                        </TableRow>
                      )
                    )}
                    {!stats?.revenueByBranch?.length && (
                      <TableRow>
                        <TableCell colSpan={2} align="center" sx={{ color: '#999', py: 3 }}>
                          No branch revenue in this period
                        </TableCell>
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
