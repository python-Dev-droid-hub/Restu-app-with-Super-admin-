import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Avatar,
  LinearProgress,
  Tooltip,
  alpha,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AddIcon from '@mui/icons-material/Add';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import RocketLaunchOutlinedIcon from '@mui/icons-material/RocketLaunchOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import { SuperAdminLayout } from '../../components/superadmin/SuperAdminLayout';
import PageHeader from '../../components/superadmin/PageHeader';
import SaasCard from '../../components/superadmin/SaasCard';
import SaasHeroBanner from '../../components/superadmin/SaasHeroBanner';
import { saas } from '../../components/superadmin/superAdminTokens';
import { saasTextFieldSx } from '../../components/superadmin/superAdminFormStyles';
import { superAdminApi } from '../../services/superAdminApi';
import { getSuperAdminToken } from '../../utils/superAdminAuthStorage';
import { resolveApiBaseUrl } from '../../utils/resolveApiBaseUrl';

const STATUS_STYLES: Record<string, { bg: string; color: string; dot: string }> = {
  ACTIVE: { bg: alpha('#16A34A', 0.1), color: '#15803D', dot: '#16A34A' },
  TRIAL: { bg: alpha('#2563EB', 0.1), color: '#1D4ED8', dot: '#2563EB' },
  PAST_DUE: { bg: alpha('#EA580C', 0.1), color: '#C2410C', dot: '#EA580C' },
  SUSPENDED: { bg: alpha('#DC2626', 0.1), color: '#B91C1C', dot: '#DC2626' },
  CANCELLED: { bg: alpha('#6B7280', 0.12), color: '#4B5563', dot: '#9CA3AF' },
  EXPIRED: { bg: alpha('#6B7280', 0.12), color: '#4B5563', dot: '#9CA3AF' },
};

const tableSx = {
  width: '100%',
  tableLayout: 'fixed' as const,
  borderCollapse: 'separate' as const,
  borderSpacing: 0,
  '& .MuiTableCell-root': {
    borderBottom: `1px solid ${saas.colors.cardBorder}`,
    verticalAlign: 'middle',
  },
  '& .MuiTableHead-root .MuiTableCell-root': {
    bgcolor: '#F7F8FA',
    borderBottom: `1px solid ${saas.colors.cardBorder}`,
    py: 1.5,
    px: 2,
    fontSize: '0.6875rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    color: saas.colors.textMuted,
    whiteSpace: 'nowrap' as const,
  },
  '& .MuiTableBody-root .MuiTableCell-root': {
    py: 1.75,
    px: 2,
  },
  '& .MuiTableBody-root .MuiTableRow-root:last-child .MuiTableCell-root': {
    borderBottom: 'none',
  },
  '& .MuiTableBody-root .MuiTableRow-root:hover': {
    bgcolor: alpha(saas.colors.primary, 0.02),
  },
  '& .MuiTableBody-root .MuiTableRow-root.Mui-selected': {
    bgcolor: alpha(saas.colors.primary, 0.05),
  },
};

function StatusPill({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.CANCELLED;
  const label = STATUS_LABELS[status] || status;
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.25,
        py: 0.5,
        borderRadius: 99,
        bgcolor: style.bg,
        maxWidth: '100%',
      }}
    >
      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: style.dot, flexShrink: 0 }} />
      <Typography variant="caption" fontWeight={700} noWrap sx={{ color: style.color, lineHeight: 1.2 }}>
        {label}
      </Typography>
    </Box>
  );
}

function PlanPill({ label }: { label: string }) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        px: 1.25,
        py: 0.5,
        borderRadius: 99,
        bgcolor: alpha(saas.colors.primary, 0.08),
        border: `1px solid ${alpha(saas.colors.primary, 0.16)}`,
        maxWidth: '100%',
      }}
    >
      <Typography variant="caption" fontWeight={700} noWrap sx={{ color: saas.colors.primaryDark, lineHeight: 1.2 }}>
        {label}
      </Typography>
    </Box>
  );
}

function RowActionBar({
  onView,
  onEdit,
  onSuspend,
  onReactivate,
  isActive,
}: {
  onView: () => void;
  onEdit: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
  isActive: boolean;
}) {
  const btnSx = {
    borderRadius: 0,
    width: 32,
    height: 32,
    color: saas.colors.textMuted,
    '&:hover': { bgcolor: alpha(saas.colors.primary, 0.08), color: saas.colors.primary },
  };
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        border: `1px solid ${saas.colors.cardBorder}`,
        borderRadius: `${saas.radius.sm}px`,
        overflow: 'hidden',
        bgcolor: '#FAFAFA',
      }}
    >
      <Tooltip title="View details">
        <IconButton size="small" onClick={onView} sx={btnSx}>
          <VisibilityOutlinedIcon sx={{ fontSize: 17 }} />
        </IconButton>
      </Tooltip>
      <Box sx={{ width: '1px', alignSelf: 'stretch', bgcolor: saas.colors.cardBorder }} />
      <Tooltip title="Edit tenant">
        <IconButton size="small" onClick={onEdit} sx={btnSx}>
          <EditOutlinedIcon sx={{ fontSize: 17 }} />
        </IconButton>
      </Tooltip>
      <Box sx={{ width: '1px', alignSelf: 'stretch', bgcolor: saas.colors.cardBorder }} />
      {isActive ? (
        <Tooltip title="Suspend account">
          <IconButton
            size="small"
            onClick={onSuspend}
            sx={{ ...btnSx, '&:hover': { bgcolor: alpha('#DC2626', 0.08), color: '#DC2626' } }}
          >
            <BlockOutlinedIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>
      ) : (
        <Tooltip title="Reactivate account">
          <IconButton
            size="small"
            onClick={onReactivate}
            sx={{ ...btnSx, '&:hover': { bgcolor: alpha('#16A34A', 0.08), color: '#16A34A' } }}
          >
            <CheckCircleOutlineIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  TRIAL: 'Trial',
  PAST_DUE: 'Past due',
  SUSPENDED: 'Suspended',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
};

const QUICK_STATUS = ['', 'TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED'] as const;

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function orderUsagePercent(current: number, limit?: number) {
  if (!limit || limit <= 0) return 0;
  return Math.min(100, Math.round((current / limit) * 100));
}

export default function SuperAdminTenants() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planId, setPlanId] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState('');
  const [city, setCity] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({ subject: '', body: '', password: '' });
  const navigate = useNavigate();

  const load = useCallback(() => {
    setLoading(true);
    superAdminApi
      .get('/tenants', {
        search: search || undefined,
        planId: planId || undefined,
        subscriptionStatus: subscriptionStatus || undefined,
        city: city || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sortBy,
        limit: 100,
      })
      .then((res: any) => {
        setTenants(res.data?.data || []);
        setTotal(res.data?.pagination?.total ?? res.data?.data?.length ?? 0);
      })
      .finally(() => setLoading(false));
  }, [search, planId, subscriptionStatus, city, dateFrom, dateTo, sortBy]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    superAdminApi.get('/plans').then((r: any) => setPlans(r.data?.plans || []));
  }, []);

  const metrics = useMemo(() => {
    const active = tenants.filter((t) => t.subscriptionStatus === 'ACTIVE').length;
    const trial = tenants.filter((t) => t.subscriptionStatus === 'TRIAL').length;
    const suspended = tenants.filter((t) => t.subscriptionStatus === 'SUSPENDED' || !t.isActive).length;
    return { shown: tenants.length, total, active, trial, suspended };
  }, [tenants, total]);

  const suspend = async (id: string) => {
    const reason = prompt('Suspension reason:');
    if (!reason) return;
    const password = prompt('Confirm your super admin password:');
    if (!password) return;
    await superAdminApi.post(`/tenants/${id}/suspend`, { reason, password });
    load();
  };

  const reactivate = async (id: string) => {
    if (!confirm('Reactivate this tenant?')) return;
    await superAdminApi.post(`/tenants/${id}/reactivate`);
    load();
  };

  const exportCsv = async (ids?: string[]) => {
    const base = resolveApiBaseUrl().replace(/\/$/, '');
    const qs = ids?.length ? `?ids=${ids.join(',')}` : '';
    const res = await fetch(`${base}/superadmin/tenants/export/csv${qs}`, {
      headers: { Authorization: `Bearer ${getSuperAdminToken()}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tenants.csv';
    a.click();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === tenants.length) setSelected(new Set());
    else setSelected(new Set(tenants.map((t) => t._id)));
  };

  const clearFilters = () => {
    setSearch('');
    setPlanId('');
    setSubscriptionStatus('');
    setCity('');
    setDateFrom('');
    setDateTo('');
    setSortBy('createdAt');
  };

  const hasFilters = search || planId || subscriptionStatus || city || dateFrom || dateTo || sortBy !== 'createdAt';

  const bulkSuspend = async () => {
    if (!selected.size) return;
    const reason = prompt('Suspension reason for selected tenants:');
    if (!reason) return;
    const password = prompt('Confirm your password:');
    if (!password) return;
    await superAdminApi.post('/tenants/bulk-suspend', { tenantIds: [...selected], reason, password });
    setSelected(new Set());
    load();
  };

  const bulkReactivate = async () => {
    if (!selected.size) return;
    const password = prompt('Confirm your password to reactivate selected tenants:');
    if (!password) return;
    await superAdminApi.post('/tenants/bulk-reactivate', { tenantIds: [...selected], password });
    setSelected(new Set());
    load();
  };

  const bulkEmail = async () => {
    if (!selected.size || !emailForm.subject || !emailForm.body || !emailForm.password) return;
    await superAdminApi.post('/tenants/bulk-email', {
      tenantIds: [...selected],
      subject: emailForm.subject,
      body: emailForm.body,
      password: emailForm.password,
    });
    setEmailOpen(false);
    setEmailForm({ subject: '', body: '', password: '' });
    setSelected(new Set());
  };

  return (
    <SuperAdminLayout>
      <PageHeader
        title="Restaurants"
        subtitle="Manage all tenant restaurants — subscriptions, branches, and account status."
        breadcrumbs={[{ label: 'Platform', to: '/superadmin/dashboard' }, { label: 'Restaurants' }]}
        action={
          <Button
            variant="contained"
            color="primary"
            startIcon={<RocketLaunchOutlinedIcon />}
            onClick={() => navigate('/superadmin/tenants/new')}
          >
            Launch restaurant
          </Button>
        }
      />

      <SaasHeroBanner
        badgeIcon={<StorefrontOutlinedIcon sx={{ fontSize: 18 }} />}
        badgeLabel="Restaurant network"
        headline={String(metrics.total)}
        description="Tenant restaurants on your platform — manage subscriptions, branches, and account status."
        highlight={{ label: 'In current view', value: `${metrics.shown} shown` }}
        stats={[
          { label: 'Active', value: metrics.active, accent: '#4CAF50' },
          { label: 'On trial', value: metrics.trial, accent: '#2196F3' },
          { label: 'Suspended', value: metrics.suspended, accent: '#FF9800' },
          { label: 'Total', value: metrics.total, accent: saas.colors.primary },
        ]}
      />

      {selected.size > 0 && (
        <Box
          sx={{
            mb: 2,
            px: 2,
            py: 1.5,
            borderRadius: `${saas.radius.md}px`,
            bgcolor: alpha(saas.colors.primary, 0.06),
            border: `1px solid ${alpha(saas.colors.primary, 0.2)}`,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Typography variant="body2" fontWeight={700} color={saas.colors.textDark} mr={1}>
            {selected.size} selected
          </Typography>
          <Button size="small" startIcon={<EmailOutlinedIcon />} onClick={() => setEmailOpen(true)}>
            Email
          </Button>
          <Button size="small" startIcon={<DownloadOutlinedIcon />} onClick={() => exportCsv([...selected])}>
            Export
          </Button>
          <Button size="small" color="success" startIcon={<CheckCircleOutlineIcon />} onClick={bulkReactivate}>
            Reactivate
          </Button>
          <Button size="small" color="error" startIcon={<BlockOutlinedIcon />} onClick={bulkSuspend}>
            Suspend
          </Button>
          <Button size="small" sx={{ ml: 'auto' }} onClick={() => setSelected(new Set())}>
            Clear selection
          </Button>
        </Box>
      )}

      <SaasCard
        title="Filters"
        subtitle="Narrow the restaurant list by plan, status, location, or date"
        action={
          hasFilters ? (
            <Button size="small" onClick={clearFilters}>
              Clear all
            </Button>
          ) : undefined
        }
        noPadding
      >
        <Box sx={{ p: 2.5 }}>
          <Box display="flex" flexWrap="wrap" gap={1} mb={2.5}>
            {QUICK_STATUS.map((s) => (
              <Chip
                key={s || 'all'}
                label={s ? STATUS_LABELS[s] : 'All statuses'}
                size="small"
                clickable
                variant={subscriptionStatus === s ? 'filled' : 'outlined'}
                color={subscriptionStatus === s ? 'primary' : 'default'}
                onClick={() => setSubscriptionStatus(s)}
              />
            ))}
          </Box>

          <Grid container spacing={2} alignItems="flex-end">
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search name, slug, or owner email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && load()}
                sx={saasTextFieldSx}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small" sx={saasTextFieldSx}>
                <InputLabel>Plan</InputLabel>
                <Select label="Plan" value={planId} onChange={(e) => setPlanId(e.target.value)}>
                  <MenuItem value="">All plans</MenuItem>
                  {plans.map((p) => (
                    <MenuItem key={p._id} value={p._id}>
                      {p.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small" sx={saasTextFieldSx}>
                <InputLabel>Status</InputLabel>
                <Select label="Status" value={subscriptionStatus} onChange={(e) => setSubscriptionStatus(e.target.value)}>
                  <MenuItem value="">All</MenuItem>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                sx={saasTextFieldSx}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small" sx={saasTextFieldSx}>
                <InputLabel>Sort by</InputLabel>
                <Select label="Sort by" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <MenuItem value="createdAt">Newest first</MenuItem>
                  <MenuItem value="name">Name A–Z</MenuItem>
                  <MenuItem value="currentMonthOrders">Most orders</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Joined from"
                InputLabelProps={{ shrink: true }}
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                sx={saasTextFieldSx}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Joined to"
                InputLabelProps={{ shrink: true }}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                sx={saasTextFieldSx}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box display="flex" gap={1} flexWrap="wrap">
                <Button variant="contained" color="primary" startIcon={<FilterListIcon />} onClick={load}>
                  Apply filters
                </Button>
                <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={() => exportCsv()}>
                  Export all
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </SaasCard>

      <Box sx={{ mt: 2.5 }}>
      <SaasCard
        title="All restaurants"
        subtitle={total ? `${total} restaurant${total !== 1 ? 's' : ''} match your criteria` : 'No restaurants yet'}
        noPadding
      >
        {loading ? (
          <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress color="primary" />
          </Box>
        ) : tenants.length === 0 ? (
          <Box textAlign="center" py={6} px={3}>
            <StorefrontOutlinedIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" fontWeight={700} mb={1}>
              {hasFilters ? 'No restaurants match your filters' : 'No restaurants yet'}
            </Typography>
            <Typography color="text.secondary" mb={3} maxWidth={420} mx="auto">
              {hasFilters
                ? 'Try adjusting your search or filter criteria.'
                : 'Launch your first tenant restaurant to start onboarding.'}
            </Typography>
            {hasFilters ? (
              <Button variant="outlined" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => navigate('/superadmin/tenants/new')}
              >
                Launch first restaurant
              </Button>
            )}
          </Box>
        ) : (
          <Table size="small" sx={tableSx}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" sx={{ width: 48, pl: 2.5 }}>
                    <Checkbox
                      size="small"
                      indeterminate={selected.size > 0 && selected.size < tenants.length}
                      checked={tenants.length > 0 && selected.size === tenants.length}
                      onChange={toggleSelectAll}
                    />
                  </TableCell>
                  <TableCell sx={{ width: '24%' }}>Restaurant</TableCell>
                  <TableCell sx={{ width: '18%' }}>Owner</TableCell>
                  <TableCell sx={{ width: '10%' }}>Plan</TableCell>
                  <TableCell sx={{ width: '10%' }}>Status</TableCell>
                  <TableCell sx={{ width: '13%' }}>Usage</TableCell>
                  <TableCell sx={{ width: '9%' }}>Renews</TableCell>
                  <TableCell sx={{ width: '9%' }}>Joined</TableCell>
                  <TableCell align="right" sx={{ width: 116, pr: 2.5 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tenants.map((t) => {
                  const usage = orderUsagePercent(t.currentMonthOrders ?? 0, t.ordersLimit);
                  const usageColor = usage >= 90 ? 'error' : usage >= 70 ? 'warning' : 'primary';
                  return (
                    <TableRow
                      key={t._id}
                      hover
                      selected={selected.has(t._id)}
                      sx={{ opacity: t.isActive ? 1 : 0.72 }}
                    >
                      <TableCell padding="checkbox" sx={{ pl: 2.5 }}>
                        <Checkbox size="small" checked={selected.has(t._id)} onChange={() => toggleSelect(t._id)} />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1.25} minWidth={0}>
                          <Avatar
                            src={t.logoUrl || undefined}
                            variant="rounded"
                            sx={{
                              width: 36,
                              height: 36,
                              flexShrink: 0,
                              borderRadius: `${saas.radius.sm}px`,
                              bgcolor: t.primaryColor || saas.colors.primary,
                              fontWeight: 700,
                              fontSize: 14,
                              boxShadow: `0 0 0 1px ${alpha('#000', 0.06)}`,
                            }}
                          >
                            {t.logoUrl ? null : <StorefrontOutlinedIcon sx={{ fontSize: 18 }} />}
                          </Avatar>
                          <Box minWidth={0}>
                            <Typography variant="body2" fontWeight={700} noWrap title={t.name} sx={{ color: saas.colors.textDark }}>
                              {t.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap display="block" title={`${t.slug}.yourapp.com`}>
                              {t.slug}.yourapp.com
                            </Typography>
                            {t.city && (
                              <Box display="flex" alignItems="center" gap={0.25} mt={0.25} minWidth={0}>
                                <LocationOnOutlinedIcon sx={{ fontSize: 12, color: 'text.disabled', flexShrink: 0 }} />
                                <Typography variant="caption" color="text.disabled" noWrap>
                                  {t.city}{t.country ? `, ${t.country}` : ''}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} noWrap title={t.ownerName || t.ownerEmail} sx={{ color: saas.colors.textDark }}>
                          {t.ownerName || '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" noWrap title={t.ownerEmail}>
                          {t.ownerEmail}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <PlanPill label={t.planId?.name || '—'} />
                      </TableCell>
                      <TableCell>
                        <StatusPill status={t.subscriptionStatus} />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="baseline" justifyContent="space-between" gap={0.5} mb={0.75}>
                          <Typography variant="caption" fontWeight={700} sx={{ color: saas.colors.textDark }}>
                            {t.currentMonthOrders ?? 0}
                            <Typography component="span" variant="caption" color="text.secondary" fontWeight={500}>
                              {t.ordersLimit ? ` / ${t.ordersLimit.toLocaleString()}` : ''}
                            </Typography>
                          </Typography>
                          <Typography variant="caption" color="text.disabled" noWrap>
                            {t.branchesCount ?? 0} br
                          </Typography>
                        </Box>
                        {t.ordersLimit ? (
                          <LinearProgress
                            variant="determinate"
                            value={usage}
                            color={usageColor}
                            sx={{
                              height: 4,
                              borderRadius: 99,
                              bgcolor: alpha(saas.colors.primary, 0.08),
                              '& .MuiLinearProgress-bar': { borderRadius: 99 },
                            }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.disabled">No limit</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500} noWrap sx={{ color: saas.colors.textDark }}>
                          {t.subscriptionStatus === 'TRIAL' && t.trialEndsAt
                            ? formatDate(t.trialEndsAt)
                            : t.subscriptionEndsAt
                              ? formatDate(t.subscriptionEndsAt)
                              : '—'}
                        </Typography>
                        {t.subscriptionStatus === 'TRIAL' && (
                          <Typography variant="caption" sx={{ color: STATUS_STYLES.TRIAL.color, fontWeight: 600 }}>
                            Trial period
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {formatDate(t.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ pr: 2.5 }}>
                        <RowActionBar
                          isActive={t.isActive}
                          onView={() => navigate(`/superadmin/tenants/${t._id}`)}
                          onEdit={() => navigate(`/superadmin/tenants/${t._id}/edit`)}
                          onSuspend={() => suspend(t._id)}
                          onReactivate={() => reactivate(t._id)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
        )}
      </SaasCard>
      </Box>

      <Dialog open={emailOpen} onClose={() => setEmailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Email {selected.size} restaurant{selected.size !== 1 ? 's' : ''}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Subject"
            sx={{ mt: 1, mb: 2, ...saasTextFieldSx }}
            value={emailForm.subject}
            onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
          />
          <TextField
            fullWidth
            multiline
            rows={5}
            label="Message"
            sx={{ mb: 2, ...saasTextFieldSx }}
            value={emailForm.body}
            onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
          />
          <TextField
            fullWidth
            type="password"
            label="Confirm your password"
            sx={saasTextFieldSx}
            value={emailForm.password}
            onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEmailOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={bulkEmail}
            disabled={!emailForm.subject || !emailForm.body || !emailForm.password}
          >
            Send email
          </Button>
        </DialogActions>
      </Dialog>
    </SuperAdminLayout>
  );
}
