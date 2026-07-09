import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Grid,
  Avatar,
  LinearProgress,
  Tooltip,
  alpha,
  CircularProgress,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import AutorenewOutlinedIcon from '@mui/icons-material/AutorenewOutlined';
import SubscriptionsOutlinedIcon from '@mui/icons-material/SubscriptionsOutlined';
import FilterListIcon from '@mui/icons-material/FilterList';
import { SuperAdminLayout } from '../../components/superadmin/SuperAdminLayout';
import PageHeader from '../../components/superadmin/PageHeader';
import SaasCard from '../../components/superadmin/SaasCard';
import SaasHeroBanner from '../../components/superadmin/SaasHeroBanner';
import { saas } from '../../components/superadmin/superAdminTokens';
import { saasTextFieldSx } from '../../components/superadmin/superAdminFormStyles';
import { superAdminApi } from '../../services/superAdminApi';
import { useSuperAdminPlans } from '../../hooks/useSuperAdminPlans';

const statusColor: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  ACTIVE: 'success',
  CANCELLED: 'default',
  EXPIRED: 'error',
  PAST_DUE: 'warning',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
  PAST_DUE: 'Past due',
};

const QUICK_STATUS = ['', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED'] as const;

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function periodProgress(start?: string, end?: string) {
  if (!start || !end) return 0;
  const now = Date.now();
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (e <= s) return 100;
  return Math.min(100, Math.max(0, ((now - s) / (e - s)) * 100));
}

function daysUntil(end?: string) {
  if (!end) return null;
  return Math.ceil((new Date(end).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

type RowActionsProps = {
  sub: any;
  tenantId: string;
  onMarkPaid: (id: string) => void;
  onExtend: (tenantId: string) => void;
  onPastDue: (tenantId: string) => void;
  onCredit: (tenantId: string) => void;
  onCancel: (tenantId: string) => void;
  onInvoice: (id: string) => void;
};

function RowActions({ sub, tenantId, onMarkPaid, onExtend, onPastDue, onCredit, onCancel, onInvoice }: RowActionsProps) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const open = Boolean(anchor);

  return (
    <>
      <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={open} onClose={() => setAnchor(null)} transformOrigin={{ horizontal: 'right', vertical: 'top' }} anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
        {sub.status !== 'ACTIVE' && (
          <MenuItem onClick={() => { setAnchor(null); onMarkPaid(sub._id); }}>
            <ListItemIcon><CheckCircleOutlineIcon fontSize="small" color="success" /></ListItemIcon>
            <ListItemText>Mark paid</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => { setAnchor(null); onExtend(tenantId); }}>
          <ListItemIcon><ScheduleOutlinedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Extend period</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setAnchor(null); onInvoice(sub._id); }}>
          <ListItemIcon><ReceiptLongOutlinedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>View invoice</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setAnchor(null); onCredit(tenantId); }}>
          <ListItemIcon><CreditCardOutlinedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Apply credit</ListItemText>
        </MenuItem>
        {sub.status === 'ACTIVE' && (
          <MenuItem onClick={() => { setAnchor(null); onPastDue(tenantId); }}>
            <ListItemIcon><WarningAmberOutlinedIcon fontSize="small" color="warning" /></ListItemIcon>
            <ListItemText>Mark past due</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => { setAnchor(null); onCancel(tenantId); }} sx={{ color: 'error.main' }}>
          <ListItemIcon><BlockOutlinedIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Cancel subscription</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

export default function SuperAdminSubscriptions() {
  const [subs, setSubs] = useState<any[]>([]);
  const { plans, loading: plansLoading, refresh: refreshPlans } = useSuperAdminPlans();
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [planId, setPlanId] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(() => {
    setLoading(true);
    superAdminApi
      .get('/subscriptions', {
        status: status || undefined,
        planId: planId || undefined,
        overdueOnly: overdueOnly ? 'true' : undefined,
        limit: 100,
      })
      .then((res: any) => {
        setSubs(res.data?.subscriptions || []);
        setTotal(res.data?.total ?? res.data?.subscriptions?.length ?? 0);
      })
      .finally(() => setLoading(false));
  }, [status, planId, overdueOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = useMemo(() => {
    const active = subs.filter((s) => s.status === 'ACTIVE').length;
    const pastDue = subs.filter((s) => s.status === 'PAST_DUE').length;
    const mrr = subs
      .filter((s) => s.status === 'ACTIVE')
      .reduce((sum, s) => sum + (s.billingCycle === 'YEARLY' ? (s.amount || 0) / 12 : s.amount || 0), 0);
    return { shown: subs.length, total, active, pastDue, mrr: Math.round(mrr) };
  }, [subs, total]);

  const markPaid = async (id: string) => {
    const ref = prompt('Transaction reference (optional):') || undefined;
    await superAdminApi.post(`/subscriptions/${id}/mark-paid`, { transactionRef: ref, paymentMethod: 'MANUAL' });
    load();
  };

  const extend = async (tenantId: string) => {
    const days = parseInt(prompt('Extend by how many days?') || '0', 10);
    if (!days) return;
    await superAdminApi.post('/subscriptions/extend', { tenantId, days });
    load();
  };

  const cancel = async (tenantId: string) => {
    const reason = prompt('Cancellation reason:');
    if (!reason) return;
    await superAdminApi.post('/subscriptions/cancel', { tenantId, reason });
    load();
  };

  const markPastDue = async (tenantId: string) => {
    await superAdminApi.post('/subscriptions/mark-past-due', { tenantId });
    load();
  };

  const applyCredit = async (tenantId: string) => {
    const amount = parseFloat(prompt('Credit amount (PKR):') || '0');
    if (!amount) return;
    await superAdminApi.post('/subscriptions/apply-credit', { tenantId, amount });
    load();
  };

  const viewInvoice = async (id: string) => {
    const res: any = await superAdminApi.get(`/subscriptions/${id}/invoice`);
    const inv = res.data?.invoice;
    if (inv) {
      alert(
        `Invoice ${inv.invoiceNumber}\n${inv.tenant?.name || 'Tenant'} — ${inv.plan?.name || 'Plan'}\nPKR ${inv.amount?.toLocaleString()} (${inv.billingCycle})\n${formatDate(inv.periodStart)} → ${formatDate(inv.periodEnd)}`
      );
    }
  };

  const clearFilters = () => {
    setStatus('');
    setPlanId('');
    setOverdueOnly(false);
  };

  const hasFilters = status || planId || overdueOnly;

  return (
    <SuperAdminLayout>
      <PageHeader
        title="Subscriptions"
        subtitle="Track billing cycles, renewals, and payment status across all restaurant tenants."
        breadcrumbs={[{ label: 'Platform', to: '/superadmin/dashboard' }, { label: 'Subscriptions' }]}
        action={
          <Chip
            icon={<AutorenewOutlinedIcon sx={{ fontSize: '16px !important' }} />}
            label="Billing management"
            variant="outlined"
            size="small"
          />
        }
      />

      <SaasHeroBanner
        badgeIcon={<SubscriptionsOutlinedIcon sx={{ fontSize: 18 }} />}
        badgeLabel="Billing & subscriptions"
        headline={String(metrics.total)}
        description="Track billing cycles, renewals, and payment status across all restaurant tenants."
        highlight={{ label: 'Est. MRR (view)', value: `PKR ${metrics.mrr.toLocaleString()}` }}
        stats={[
          { label: 'Active', value: metrics.active, accent: '#4CAF50' },
          { label: 'Past due', value: metrics.pastDue, accent: '#FF9800' },
          { label: 'In view', value: metrics.shown, accent: '#2196F3' },
          { label: 'Total', value: metrics.total, accent: saas.colors.primary },
        ]}
      />

      <SaasCard
        title="Filters"
        subtitle="Filter by status, plan, or show overdue renewals only"
        action={hasFilters ? <Button size="small" onClick={clearFilters}>Clear all</Button> : undefined}
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
                variant={status === s && !overdueOnly ? 'filled' : 'outlined'}
                color={status === s && !overdueOnly ? 'primary' : 'default'}
                onClick={() => {
                  setOverdueOnly(false);
                  setStatus(s);
                }}
              />
            ))}
            <Chip
              label="Overdue only"
              size="small"
              clickable
              icon={<WarningAmberOutlinedIcon sx={{ fontSize: '16px !important' }} />}
              variant={overdueOnly ? 'filled' : 'outlined'}
              color={overdueOnly ? 'warning' : 'default'}
              onClick={() => setOverdueOnly((v) => !v)}
            />
          </Box>

          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small" sx={saasTextFieldSx}>
                <InputLabel id="subscriptions-status-filter-label" shrink>
                  Status
                </InputLabel>
                <Select
                  labelId="subscriptions-status-filter-label"
                  label="Status"
                  notched
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <MenuItem value="">All statuses</MenuItem>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>{v}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small" sx={saasTextFieldSx} disabled={plansLoading}>
                <InputLabel id="subscriptions-plan-filter-label" shrink>
                  Plan
                </InputLabel>
                <Select
                  labelId="subscriptions-plan-filter-label"
                  label="Plan"
                  notched
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  onOpen={() => {
                    if (!plans.length && !plansLoading) void refreshPlans();
                  }}
                >
                  <MenuItem value="">All plans</MenuItem>
                  {plansLoading && (
                    <MenuItem disabled value="__loading">
                      Loading plans…
                    </MenuItem>
                  )}
                  {!plansLoading && plans.length === 0 && (
                    <MenuItem disabled value="__empty">
                      No plans found — create one in Plans
                    </MenuItem>
                  )}
                  {plans.map((p) => (
                    <MenuItem key={String(p._id)} value={String(p._id)}>
                      {p.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControlLabel
                control={<Switch checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} color="warning" />}
                label="Overdue renewals only"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Button variant="contained" color="primary" startIcon={<FilterListIcon />} onClick={load}>
                Apply filters
              </Button>
            </Grid>
          </Grid>
        </Box>
      </SaasCard>

      <Box sx={{ mt: 2.5 }}>
        <SaasCard
          title="Billing records"
          subtitle={total ? `${total} subscription${total !== 1 ? 's' : ''} match your criteria` : 'No billing records yet'}
          noPadding
        >
          {loading ? (
            <Box display="flex" justifyContent="center" py={8}>
              <CircularProgress color="primary" />
            </Box>
          ) : subs.length === 0 ? (
            <Box textAlign="center" py={6} px={3}>
              <SubscriptionsOutlinedIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" fontWeight={700} mb={1}>
                {hasFilters ? 'No subscriptions match your filters' : 'No subscriptions yet'}
              </Typography>
              <Typography color="text.secondary" mb={3} maxWidth={420} mx="auto">
                {hasFilters
                  ? 'Try adjusting status or plan filters.'
                  : 'Subscriptions are created when restaurants are launched or change plans.'}
              </Typography>
              {hasFilters && (
                <Button variant="outlined" onClick={clearFilters}>Clear filters</Button>
              )}
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 900 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha(saas.colors.primary, 0.04) }}>
                    <TableCell sx={{ fontWeight: 700, color: saas.colors.textMuted }}>Restaurant</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: saas.colors.textMuted }}>Plan</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: saas.colors.textMuted }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: saas.colors.textMuted, minWidth: 180 }}>Billing period</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: saas.colors.textMuted }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: saas.colors.textMuted }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {subs.map((s) => {
                    const tid = s.tenantId?._id || s.tenantId;
                    const progress = periodProgress(s.startedAt, s.endsAt);
                    const daysLeft = daysUntil(s.endsAt);
                    const isOverdue = s.status === 'PAST_DUE' || (daysLeft !== null && daysLeft < 0);
                    const progressColor = isOverdue ? 'error' : progress >= 85 ? 'warning' : 'primary';

                    return (
                      <TableRow
                        key={s._id}
                        hover
                        sx={{
                          bgcolor: isOverdue ? alpha('#FF9800', 0.04) : undefined,
                        }}
                      >
                        <TableCell>
                          <Box
                            display="flex"
                            alignItems="center"
                            gap={1.5}
                            sx={{ cursor: tid ? 'pointer' : 'default' }}
                            onClick={() => tid && navigate(`/superadmin/tenants/${tid}`)}
                          >
                            <Avatar sx={{ width: 36, height: 36, bgcolor: saas.colors.primary, fontSize: 14, fontWeight: 700 }}>
                              {s.tenantId?.name?.charAt(0)?.toUpperCase() || '?'}
                            </Avatar>
                            <Box minWidth={0}>
                              <Typography fontWeight={700} noWrap>
                                {s.tenantId?.name || '—'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap display="block">
                                {s.tenantId?.slug ? `${s.tenantId.slug}.yourapp.com` : s.tenantId?.ownerEmail || ''}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={s.planId?.name || '—'} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <PaymentsOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" fontWeight={700}>
                              PKR {s.amount?.toLocaleString()}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {s.billingCycle === 'YEARLY' ? 'Yearly' : 'Monthly'} · {s.currency || 'PKR'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" fontWeight={600} display="block" mb={0.5}>
                            {formatDate(s.startedAt)} → {formatDate(s.endsAt)}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={progress}
                            color={progressColor}
                            sx={{ height: 5, borderRadius: 99, mb: 0.5, bgcolor: alpha(saas.colors.primary, 0.08) }}
                          />
                          <Typography variant="caption" color={isOverdue ? 'error.main' : 'text.secondary'}>
                            {daysLeft === null
                              ? '—'
                              : daysLeft < 0
                                ? `${Math.abs(daysLeft)} days overdue`
                                : daysLeft === 0
                                  ? 'Renews today'
                                  : `${daysLeft} days left`}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={STATUS_LABELS[s.status] || s.status}
                            size="small"
                            color={statusColor[s.status] || 'default'}
                            sx={{ fontWeight: 600 }}
                          />
                          {s.transactionRef && (
                            <Typography variant="caption" color="text.disabled" display="block" mt={0.5} noWrap>
                              Ref: {s.transactionRef}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Manage subscription">
                            <span>
                              <RowActions
                                sub={s}
                                tenantId={tid}
                                onMarkPaid={markPaid}
                                onExtend={extend}
                                onPastDue={markPastDue}
                                onCredit={applyCredit}
                                onCancel={cancel}
                                onInvoice={viewInvoice}
                              />
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          )}
        </SaasCard>
      </Box>
    </SuperAdminLayout>
  );
}
