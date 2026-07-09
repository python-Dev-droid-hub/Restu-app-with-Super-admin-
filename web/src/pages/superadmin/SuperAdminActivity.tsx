import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  FormControl,
  Grid,
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
  CircularProgress,
  alpha,
} from '@mui/material';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import FilterListIcon from '@mui/icons-material/FilterList';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { SuperAdminLayout } from '../../components/superadmin/SuperAdminLayout';
import PageHeader from '../../components/superadmin/PageHeader';
import SaasCard from '../../components/superadmin/SaasCard';
import SaasHeroBanner from '../../components/superadmin/SaasHeroBanner';
import { saasTextFieldSx } from '../../components/superadmin/superAdminFormStyles';
import { saas } from '../../components/superadmin/superAdminTokens';
import { superAdminApi } from '../../services/superAdminApi';

const ACTION_LABELS: Record<string, string> = {
  TENANT_LAUNCHED: 'Tenant launched',
  TENANT_UPDATED: 'Tenant updated',
  TENANT_SUSPENDED: 'Tenant suspended',
  TENANT_REACTIVATED: 'Tenant reactivated',
  TENANT_DELETED: 'Tenant deleted',
  BRANCH_CREATED: 'Branch created',
  PLAN_CHANGED: 'Plan changed',
  SUBSCRIPTION_MARKED_PAID: 'Subscription paid',
  SUBSCRIPTION_EXTENDED: 'Subscription extended',
  SUBSCRIPTION_CANCELLED: 'Subscription cancelled',
  SUBSCRIPTION_PAST_DUE: 'Marked past due',
  SUBSCRIPTION_CREDIT_APPLIED: 'Credit applied',
  IMPERSONATION_STARTED: 'Impersonation started',
  IMPERSONATION_ENDED: 'Impersonation ended',
  SUPPORT_TICKET_CREATED: 'Support ticket created',
  SUPPORT_TICKET_ASSIGNED: 'Support ticket assigned',
};

const ACTION_COLORS: Record<string, string> = {
  TENANT_LAUNCHED: '#4CAF50',
  TENANT_UPDATED: '#2196F3',
  TENANT_SUSPENDED: '#F44336',
  TENANT_REACTIVATED: '#4CAF50',
  TENANT_DELETED: '#9E9E9E',
  BRANCH_CREATED: '#2196F3',
  PLAN_CHANGED: '#FF9800',
  SUBSCRIPTION_MARKED_PAID: '#4CAF50',
  SUBSCRIPTION_EXTENDED: '#2196F3',
  SUBSCRIPTION_CANCELLED: '#F44336',
  SUBSCRIPTION_PAST_DUE: '#FF9800',
  SUBSCRIPTION_CREDIT_APPLIED: '#9C27B0',
  IMPERSONATION_STARTED: '#E91E63',
  IMPERSONATION_ENDED: '#E91E63',
  SUPPORT_TICKET_CREATED: '#00BCD4',
  SUPPORT_TICKET_ASSIGNED: '#00BCD4',
};

const QUICK_ACTIONS = [
  '',
  'TENANT_LAUNCHED',
  'TENANT_SUSPENDED',
  'PLAN_CHANGED',
  'IMPERSONATION_STARTED',
  'SUPPORT_TICKET_CREATED',
] as const;

const TRACKED_EVENTS = [
  'Restaurant launches, updates, suspensions, and reactivations',
  'Subscription changes, payments, extensions, and credits',
  'Super admin impersonation sessions',
  'Support ticket creation and assignment',
];

function formatActionLabel(action: string) {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  return action.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  let relative = 'Just now';
  if (diffMins >= 1 && diffMins < 60) relative = `${diffMins}m ago`;
  else if (diffHours < 24) relative = `${diffHours}h ago`;
  else if (diffDays < 7) relative = `${diffDays}d ago`;
  else relative = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return {
    relative,
    full: d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

function actorLabel(log: any) {
  const type = log.performedByType || 'SYSTEM';
  if (type === 'SUPER_ADMIN') return 'Super admin';
  if (type === 'TENANT_ADMIN') return 'Tenant admin';
  return type.replace(/_/g, ' ');
}

export default function SuperAdminActivity() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<any[]>([]);
  const [action, setAction] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    superAdminApi
      .get('/activity', {
        action: action || undefined,
        tenantId: tenantId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        limit: 50,
      })
      .then((r: any) => {
        setLogs(r.data?.data || r.data?.logs || []);
        setTotal(r.data?.pagination?.total ?? r.data?.data?.length ?? 0);
      })
      .finally(() => setLoading(false));
  }, [action, tenantId, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    superAdminApi.get('/tenants', { limit: 200 }).then((r: any) => setTenants(r.data?.data || []));
  }, []);

  const uniqueTenants = useMemo(
    () => new Set(logs.map((l) => l.tenantId?._id || l.tenantId).filter(Boolean)).size,
    [logs]
  );
  const uniqueActions = useMemo(
    () => new Set(logs.map((l) => l.action).filter(Boolean)).size,
    [logs]
  );

  const hasFilters = action || tenantId || dateFrom || dateTo;

  const clearFilters = () => {
    setAction('');
    setTenantId('');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <SuperAdminLayout>
      <PageHeader
        title="Activity logs"
        subtitle="Complete audit trail of platform and tenant events — who did what, when, and on which restaurant."
        breadcrumbs={[{ label: 'Platform', to: '/superadmin/dashboard' }, { label: 'Activity' }]}
        action={
          <Button variant="outlined" startIcon={<FilterListIcon />} onClick={load} disabled={loading}>
            Refresh
          </Button>
        }
      />

      <SaasHeroBanner
        badgeIcon={<HistoryOutlinedIcon sx={{ fontSize: 18 }} />}
        badgeLabel="Platform audit trail"
        headline={String(total)}
        description="Immutable record of administrative actions across your restaurant network — filter by tenant, event type, or date."
        highlight={{ label: 'Showing', value: `${logs.length} of ${total}` }}
        stats={[
          { label: 'In this view', value: logs.length, accent: saas.colors.primary },
          { label: 'Restaurants', value: uniqueTenants, accent: '#2196F3' },
          { label: 'Event types', value: uniqueActions, accent: '#4CAF50' },
        ]}
      />

      <Grid container spacing={2.5} mb={2.5}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <SaasCard title="Filters" subtitle="Narrow the audit log by restaurant, event type, or date range" noPadding>
            <Box sx={{ p: 2.5 }}>
              <Box display="flex" flexWrap="wrap" gap={1} mb={2.5}>
                {QUICK_ACTIONS.map((a) => (
                  <Chip
                    key={a || 'all'}
                    label={a ? formatActionLabel(a) : 'All events'}
                    size="small"
                    clickable
                    variant={action === a ? 'filled' : 'outlined'}
                    color={action === a ? 'primary' : 'default'}
                    onClick={() => setAction(a)}
                  />
                ))}
              </Box>
              <Grid container spacing={2} alignItems="flex-end">
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <FormControl fullWidth size="small" sx={saasTextFieldSx}>
                    <InputLabel id="activity-tenant-label" shrink>
                      Restaurant
                    </InputLabel>
                    <Select
                      labelId="activity-tenant-label"
                      label="Restaurant"
                      notched
                      displayEmpty
                      value={tenantId}
                      onChange={(e) => setTenantId(e.target.value)}
                      renderValue={(v) => {
                        if (!v) return 'All restaurants';
                        const t = tenants.find((x) => String(x._id) === String(v));
                        return t?.name || 'Selected tenant';
                      }}
                    >
                      <MenuItem value="">All restaurants</MenuItem>
                      {tenants.map((t) => (
                        <MenuItem key={t._id} value={t._id}>
                          {t.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Event contains"
                    placeholder="e.g. SUBSCRIPTION"
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    sx={saasTextFieldSx}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="From"
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
                    label="To"
                    InputLabelProps={{ shrink: true }}
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    sx={saasTextFieldSx}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 2 }}>
                  <Box display="flex" gap={1}>
                    <Button variant="contained" color="primary" onClick={load} fullWidth>
                      Apply
                    </Button>
                    {hasFilters && (
                      <Button variant="text" onClick={clearFilters} sx={{ flexShrink: 0 }}>
                        Clear
                      </Button>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </SaasCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <SaasCard title="What we track" subtitle="Events written automatically by the platform">
            <Box component="ul" sx={{ m: 0, pl: 2.5, color: 'text.secondary' }}>
              {TRACKED_EVENTS.map((item) => (
                <Typography key={item} component="li" variant="body2" sx={{ mb: 1, lineHeight: 1.55 }}>
                  {item}
                </Typography>
              ))}
            </Box>
          </SaasCard>
        </Grid>
      </Grid>

      <SaasCard
        title="Audit log"
        subtitle={
          total
            ? `${total} event${total !== 1 ? 's' : ''} in database · showing latest ${logs.length}`
            : 'No events recorded yet'
        }
        noPadding
      >
        {loading ? (
          <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress color="primary" />
          </Box>
        ) : logs.length === 0 ? (
          <Box textAlign="center" py={6} px={3}>
            <HistoryOutlinedIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" fontWeight={700} mb={1}>
              {hasFilters ? 'No events match your filters' : 'No activity recorded yet'}
            </Typography>
            <Typography color="text.secondary" mb={2} maxWidth={480} mx="auto" lineHeight={1.6}>
              {hasFilters
                ? 'Try widening the date range or clearing filters. Activity appears when you launch tenants, change plans, suspend accounts, or handle support tickets.'
                : 'Actions will appear here as you manage restaurants — launch a tenant, update a subscription, or impersonate an admin to generate the first entries.'}
            </Typography>
            {hasFilters ? (
              <Button variant="outlined" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button variant="contained" color="primary" onClick={() => navigate('/superadmin/tenants/new')}>
                Launch first restaurant
              </Button>
            )}
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 880 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(saas.colors.primary, 0.04) }}>
                  <TableCell sx={{ fontWeight: 700, color: saas.colors.textMuted, minWidth: 120 }}>When</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: saas.colors.textMuted }}>Restaurant</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: saas.colors.textMuted }}>Event</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: saas.colors.textMuted, minWidth: 240 }}>Details</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: saas.colors.textMuted }}>Actor</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => {
                  const when = formatWhen(log.createdAt);
                  const accent = ACTION_COLORS[log.action] || saas.colors.textMuted;
                  const tid = log.tenantId?._id || log.tenantId;
                  return (
                    <TableRow key={log._id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {when.relative}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {when.full}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {log.tenantId?.name ? (
                          <Box
                            sx={{ cursor: tid ? 'pointer' : 'default' }}
                            onClick={() => tid && navigate(`/superadmin/tenants/${tid}`)}
                          >
                            <Typography fontWeight={700} color={tid ? 'primary.main' : 'text.primary'}>
                              {log.tenantId.name}
                            </Typography>
                            {log.tenantId.slug && (
                              <Typography variant="caption" color="text.secondary">
                                {log.tenantId.slug}.yourapp.com
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={formatActionLabel(log.action)}
                          sx={{
                            fontWeight: 600,
                            bgcolor: alpha(accent, 0.12),
                            color: accent,
                            border: `1px solid ${alpha(accent, 0.28)}`,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" lineHeight={1.5}>
                          {log.description || 'No additional details recorded.'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={0.75}>
                          <PersonOutlineIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2">{actorLabel(log)}</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </SaasCard>
    </SuperAdminLayout>
  );
}
