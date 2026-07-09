import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  LinearProgress,
  Link,
  MenuItem,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  alpha,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { SuperAdminLayout } from '../../components/superadmin/SuperAdminLayout';
import PageHeader from '../../components/superadmin/PageHeader';
import SaasCard from '../../components/superadmin/SaasCard';
import { saas } from '../../components/superadmin/superAdminTokens';
import { saasTextFieldSx } from '../../components/superadmin/superAdminFormStyles';
import { superAdminApi, superAdminApiErrorMessage } from '../../services/superAdminApi';
import { api } from '../../services/api';
import { clearAuthSession, setAuthSession, setUserProfile } from '../../utils/authStorage';

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  TRIAL: 'Trial',
  PAST_DUE: 'Past due',
  SUSPENDED: 'Suspended',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
};

const STATUS_STYLES: Record<string, { bg: string; color: string; dot: string }> = {
  ACTIVE: { bg: alpha('#16A34A', 0.1), color: '#15803D', dot: '#16A34A' },
  TRIAL: { bg: alpha('#2563EB', 0.1), color: '#1D4ED8', dot: '#2563EB' },
  PAST_DUE: { bg: alpha('#EA580C', 0.1), color: '#C2410C', dot: '#EA580C' },
  SUSPENDED: { bg: alpha('#DC2626', 0.1), color: '#B91C1C', dot: '#DC2626' },
  CANCELLED: { bg: alpha('#6B7280', 0.12), color: '#4B5563', dot: '#9CA3AF' },
  EXPIRED: { bg: alpha('#6B7280', 0.12), color: '#4B5563', dot: '#9CA3AF' },
};

const ONBOARDING_STEPS = [
  { key: 'stepProfileComplete', label: 'Profile complete' },
  { key: 'stepBranchCreated', label: 'Branch created' },
  { key: 'stepMenuAdded', label: 'Menu added' },
  { key: 'stepStaffAdded', label: 'Staff added' },
  { key: 'stepTableAdded', label: 'Tables configured' },
  { key: 'stepTestOrder', label: 'Test order placed' },
  { key: 'stepPaymentSetup', label: 'Payment setup' },
] as const;

function formatDate(d?: string | Date | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(d?: string | Date | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatusPill({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.CANCELLED;
  const label = STATUS_LABELS[status] || status;
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.5, borderRadius: 99, bgcolor: style.bg }}>
      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: style.dot }} />
      <Typography variant="caption" fontWeight={700} sx={{ color: style.color, lineHeight: 1.2 }}>{label}</Typography>
    </Box>
  );
}

function InfoRow({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 2,
        py: 1.25,
        borderBottom: `1px solid ${saas.colors.cardBorder}`,
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0, minWidth: 120 }}>{label}</Typography>
      <Box textAlign="right" minWidth={0}>
        <Typography variant="body2" component="div" fontWeight={600} sx={{ color: saas.colors.textDark }}>{value}</Typography>
        {sub && <Typography variant="caption" color="text.secondary" display="block">{sub}</Typography>}
      </Box>
    </Box>
  );
}

function StatTile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: `${saas.radius.md}px`,
        border: `1px solid ${saas.colors.cardBorder}`,
        bgcolor: '#fff',
        height: '100%',
      }}
    >
      <Typography variant="caption" fontWeight={700} sx={{ color: saas.colors.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {label}
      </Typography>
      <Typography variant="h6" fontWeight={800} sx={{ color: accent || saas.colors.textDark, mt: 0.5, lineHeight: 1.2 }}>
        {value}
      </Typography>
      {sub && <Typography variant="caption" color="text.secondary" display="block" mt={0.25}>{sub}</Typography>}
    </Box>
  );
}

export default function SuperAdminTenantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [tab, setTab] = useState(0);
  const [newPlanId, setNewPlanId] = useState('');
  const [extendDays, setExtendDays] = useState(14);
  const [branchForm, setBranchForm] = useState({ name: '', addressLine: '', city: '', area: '' });
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [editBranchForm, setEditBranchForm] = useState({ name: '', addressLine: '', city: '', area: '' });
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [impersonating, setImpersonating] = useState(false);
  const [impersonateError, setImpersonateError] = useState('');

  const load = () => {
    if (id) superAdminApi.get(`/tenants/${id}`).then((res: any) => setData(res.data));
  };

  useEffect(() => {
    load();
    superAdminApi.get('/plans').then((r: any) => setPlans(r.data?.plans || []));
  }, [id]);

  useEffect(() => {
    if (id && tab === 4) {
      superAdminApi.get(`/activity/tenant/${id}`).then((r: any) => setActivityLogs(r.data?.logs || []));
    }
  }, [id, tab]);

  const onboardingMeta = useMemo(() => {
    const onboarding = data?.onboarding || {};
    const steps = ONBOARDING_STEPS.map((s) => ({
      ...s,
      done: Boolean((onboarding as Record<string, boolean>)[s.key]),
    }));
    const completed = steps.filter((s) => s.done).length;
    return { steps, completed, total: steps.length, progress: steps.length ? Math.round((completed / steps.length) * 100) : 0 };
  }, [data?.onboarding]);

  if (!data) {
    return (
      <SuperAdminLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={320}>
          <CircularProgress />
        </Box>
      </SuperAdminLayout>
    );
  }

  const { tenant, branches, subscriptions } = data;
  const plan = tenant.planId;
  const activeSub = subscriptions?.find((s: any) => s.status === 'ACTIVE') || subscriptions?.[0];
  const subscriptionStart = tenant.subscriptionStartsAt || activeSub?.startedAt || tenant.createdAt;
  const subscriptionEnd = tenant.subscriptionStatus === 'TRIAL' && tenant.trialEndsAt
    ? tenant.trialEndsAt
    : tenant.subscriptionEndsAt || activeSub?.endsAt;
  const planPrice = tenant.billingCycle === 'YEARLY'
    ? plan?.priceYearly || (plan?.priceMonthly || 0) * 12
    : plan?.priceMonthly;
  const orderLimit = plan?.maxOrdersPerMonth || 1;
  const orderUsage = Math.min(100, Math.round((tenant.currentMonthOrders / orderLimit) * 100));

  const changePlan = async () => {
    if (!newPlanId) return;
    await superAdminApi.post(`/tenants/${id}/change-plan`, { planId: newPlanId, billingCycle: tenant.billingCycle });
    load();
  };

  const extendSub = async () => {
    await superAdminApi.post(`/tenants/${id}/extend-subscription`, { days: extendDays });
    load();
  };

  const addBranch = async () => {
    await superAdminApi.post(`/tenants/${id}/branches`, branchForm);
    setShowBranchForm(false);
    setBranchForm({ name: '', addressLine: '', city: '', area: '' });
    load();
  };

  const deactivateBranch = async (branchId: string) => {
    await superAdminApi.post(`/tenants/${id}/branches/${branchId}/deactivate`);
    load();
  };

  const startEditBranch = (b: any) => {
    setEditingBranch(b);
    setEditBranchForm({ name: b.name || '', addressLine: b.addressLine || '', city: b.city || '', area: b.area || '' });
  };

  const saveEditBranch = async () => {
    if (!editingBranch) return;
    await superAdminApi.patch(`/tenants/${id}/branches/${editingBranch._id}`, editBranchForm);
    setEditingBranch(null);
    load();
  };

  const deleteBranch = async (branchId: string) => {
    if (!confirm('Delete this branch permanently?')) return;
    await superAdminApi.delete(`/tenants/${id}/branches/${branchId}`);
    load();
  };

  const impersonate = async () => {
    setImpersonateError('');
    setImpersonating(true);
    try {
      const res: any = await superAdminApi.post(`/tenants/${id}/impersonate`);
      const token = res?.data?.impersonationToken;
      const tenantInfo = res?.data?.tenant;
      if (!token) {
        setImpersonateError(res?.message || 'Could not create impersonation session.');
        return;
      }

      clearAuthSession();
      localStorage.removeItem('tenantSlug');
      localStorage.removeItem('impersonationTenantId');

      const authRes = await api.post<{
        user: Record<string, unknown>;
        tokens: { accessToken: string; refreshToken?: string };
        tenantId?: string;
        tenant?: { slug?: string; id?: string };
      }>('/auth/impersonate', { token });

      if (!authRes.success || !authRes.data?.tokens?.accessToken) {
        setImpersonateError(authRes.error || authRes.message || 'Impersonation login failed.');
        return;
      }

      const { user, tokens, tenantId, tenant: authTenant } = authRes.data;
      setAuthSession(tokens.accessToken, tokens.refreshToken);
      setUserProfile({ ...user, tenantId: tenantId || user.tenantId }, { persist: true });
      localStorage.setItem('impersonating', 'true');
      const tid = tenantId || tenantInfo?.id || authTenant?.id;
      if (tid) localStorage.setItem('impersonationTenantId', String(tid));
      const slug = tenantInfo?.slug || authTenant?.slug;
      if (slug) localStorage.setItem('tenantSlug', slug);
      else localStorage.removeItem('tenantSlug');
      window.dispatchEvent(new Event('tenant-branding-refresh'));
      navigate('/admin/dashboard');
    } catch (err) {
      setImpersonateError(superAdminApiErrorMessage(err, 'Impersonation failed'));
    } finally {
      setImpersonating(false);
    }
  };

  const reactivate = async () => {
    if (!confirm('Reactivate this tenant?')) return;
    await superAdminApi.post(`/tenants/${id}/reactivate`);
    load();
  };

  const statusStyle = STATUS_STYLES[tenant.subscriptionStatus] || STATUS_STYLES.CANCELLED;

  return (
    <SuperAdminLayout>
      <PageHeader
        title={tenant.name}
        subtitle={`${tenant.slug}.yourapp.com${tenant.city ? ` · ${tenant.city}` : ''}`}
        breadcrumbs={[
          { label: 'Restaurants', to: '/superadmin/tenants' },
          { label: tenant.name },
        ]}
        action={
          <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
            {impersonateError && (
              <Typography variant="caption" color="error.main" sx={{ mr: 1 }}>{impersonateError}</Typography>
            )}
            <Button variant="outlined" size="small" startIcon={<EditOutlinedIcon />} onClick={() => navigate(`/superadmin/tenants/${id}/edit`)}>
              Edit tenant
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<OpenInNewOutlinedIcon />}
              onClick={impersonate}
              disabled={impersonating || !tenant.isActive}
            >
              {impersonating ? 'Signing in…' : 'Impersonate'}
            </Button>
            {!tenant.isActive && (
              <Button variant="contained" color="success" size="small" onClick={reactivate}>Reactivate</Button>
            )}
          </Box>
        }
      />

      <Box
        sx={{
          mb: 3,
          p: 2.5,
          borderRadius: `${saas.radius.md}px`,
          border: `1px solid ${saas.colors.cardBorder}`,
          bgcolor: '#fff',
          boxShadow: saas.shadow.card,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Avatar
          src={tenant.logoUrl || undefined}
          variant="rounded"
          sx={{
            width: 56,
            height: 56,
            borderRadius: `${saas.radius.md}px`,
            bgcolor: tenant.primaryColor || saas.colors.primary,
            boxShadow: `0 0 0 1px ${alpha('#000', 0.06)}`,
          }}
        >
          {!tenant.logoUrl && <StorefrontOutlinedIcon />}
        </Avatar>
        <Box flex={1} minWidth={200}>
          <Box display="flex" flexWrap="wrap" gap={1} mb={0.75}>
            <StatusPill status={tenant.subscriptionStatus} />
            <Chip
              size="small"
              label={tenant.isActive ? 'Account active' : 'Account suspended'}
              sx={{
                fontWeight: 700,
                bgcolor: tenant.isActive ? alpha('#16A34A', 0.1) : alpha('#DC2626', 0.1),
                color: tenant.isActive ? '#15803D' : '#B91C1C',
              }}
            />
            {plan?.name && (
              <Chip
                size="small"
                label={plan.name}
                sx={{ fontWeight: 700, bgcolor: alpha(saas.colors.primary, 0.08), color: saas.colors.primaryDark }}
              />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {tenant.ownerName} · {tenant.ownerEmail} · {tenant.ownerPhone}
          </Typography>
          {tenant.suspendedReason && (
            <Typography variant="caption" color="error.main" display="block" mt={0.5}>
              Suspended: {tenant.suspendedReason}
            </Typography>
          )}
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <StatTile label="Billing status" value={STATUS_LABELS[tenant.subscriptionStatus] || tenant.subscriptionStatus} accent={statusStyle.color} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <StatTile label="Plan" value={plan?.name || '—'} sub={tenant.billingCycle === 'YEARLY' ? 'Yearly billing' : 'Monthly billing'} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <StatTile label="Started" value={formatDate(subscriptionStart)} sub={`Joined ${formatDate(tenant.createdAt)}`} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <StatTile
            label={tenant.subscriptionStatus === 'TRIAL' ? 'Trial ends' : 'Renews / ends'}
            value={formatDate(subscriptionEnd)}
            sub={tenant.subscriptionStatus === 'TRIAL' ? 'Trial period' : 'Current period end'}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <StatTile
            label="Amount"
            value={planPrice ? `PKR ${Number(planPrice).toLocaleString()}` : '—'}
            sub={tenant.billingCycle === 'YEARLY' ? 'per year' : 'per month'}
          />
        </Grid>
      </Grid>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 2.5,
          borderBottom: `1px solid ${saas.colors.cardBorder}`,
          '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 48 },
        }}
      >
        <Tab label="Overview" />
        <Tab label="Branches" />
        <Tab label="Subscription & Billing" />
        <Tab label="Usage" />
        <Tab label="Activity" />
      </Tabs>

      {tab === 0 && (
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <SaasCard title="Restaurant profile" subtitle="Business and owner details">
              <InfoRow label="Restaurant" value={tenant.name} sub={tenant.legalName || undefined} />
              <InfoRow label="Domain" value={<Link href={`https://${tenant.slug}.yourapp.com`} target="_blank" rel="noopener">{tenant.slug}.yourapp.com</Link>} />
              <InfoRow label="Business type" value={(tenant.businessType || 'RESTAURANT').replace(/_/g, ' ')} sub={tenant.cuisineType || undefined} />
              <InfoRow label="Location" value={[tenant.city, tenant.country].filter(Boolean).join(', ') || '—'} />
              <InfoRow label="Owner" value={tenant.ownerName} sub={tenant.ownerEmail} />
              <InfoRow label="Phone" value={tenant.ownerPhone || '—'} />
            </SaasCard>
          </Grid>

          <Grid size={{ xs: 12, lg: 5 }}>
            <SaasCard title="Subscription" subtitle="Billing and account status">
              <InfoRow label="Status" value={<StatusPill status={tenant.subscriptionStatus} />} />
              <InfoRow label="Account access" value={tenant.isActive ? 'Active' : 'Suspended'} sub={tenant.suspendedAt ? `Since ${formatDate(tenant.suspendedAt)}` : undefined} />
              <InfoRow label="Plan" value={plan?.name || '—'} sub={`${tenant.billingCycle} · PKR ${Number(planPrice || 0).toLocaleString()}`} />
              <InfoRow label="Subscription start" value={formatDate(subscriptionStart)} />
              <InfoRow
                label={tenant.subscriptionStatus === 'TRIAL' ? 'Trial ends' : 'Current period ends'}
                value={formatDate(subscriptionEnd)}
              />
              <InfoRow label="Platform joined" value={formatDate(tenant.createdAt)} sub={formatDateTime(tenant.createdAt)} />
              <Box mt={2}>
                <Button size="small" variant="outlined" onClick={() => navigate(`/superadmin/tenants/${id}/edit`)}>
                  Change billing status
                </Button>
              </Box>
            </SaasCard>
          </Grid>

          <Grid size={{ xs: 12, lg: 7 }}>
            <SaasCard title="Onboarding progress" subtitle={`${onboardingMeta.completed} of ${onboardingMeta.total} setup steps complete`}>
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" mb={0.75}>
                  <Typography variant="body2" fontWeight={600}>{onboardingMeta.progress}% complete</Typography>
                  <Typography variant="caption" color="text.secondary">{onboardingMeta.completed}/{onboardingMeta.total} steps</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={onboardingMeta.progress}
                  sx={{
                    height: 8,
                    borderRadius: 99,
                    bgcolor: alpha(saas.colors.primary, 0.1),
                    '& .MuiLinearProgress-bar': { borderRadius: 99, bgcolor: saas.colors.primary },
                  }}
                />
              </Box>
              <Grid container spacing={1}>
                {onboardingMeta.steps.map((step) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={step.key}>
                    <Box display="flex" alignItems="center" gap={1} py={0.75}>
                      {step.done ? (
                        <CheckCircleOutlineIcon sx={{ fontSize: 18, color: '#16A34A' }} />
                      ) : (
                        <RadioButtonUncheckedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                      )}
                      <Typography variant="body2" color={step.done ? 'text.primary' : 'text.secondary'} fontWeight={step.done ? 600 : 400}>
                        {step.label}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </SaasCard>
          </Grid>

          <Grid size={{ xs: 12, lg: 5 }}>
            <SaasCard title="Quick usage" subtitle="Current month snapshot">
              <InfoRow label="Orders this month" value={`${tenant.currentMonthOrders ?? 0} / ${orderLimit.toLocaleString()}`} />
              <LinearProgress
                variant="determinate"
                value={orderUsage}
                color={orderUsage >= 90 ? 'error' : orderUsage >= 70 ? 'warning' : 'primary'}
                sx={{ height: 6, borderRadius: 99, mb: 2, bgcolor: alpha(saas.colors.primary, 0.08) }}
              />
              <InfoRow label="Branches" value={String(branches?.length || 0)} sub={plan?.maxBranches ? `Limit: ${plan.maxBranches}` : undefined} />
              <InfoRow label="Staff accounts" value="—" sub={plan?.maxStaffAccounts ? `Limit: ${plan.maxStaffAccounts}` : undefined} />
            </SaasCard>
          </Grid>
        </Grid>
      )}

      {tab === 1 && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <Button variant="outlined" onClick={() => setShowBranchForm(!showBranchForm)}>Add Branch</Button>
          </Grid>
          {showBranchForm && (
            <Grid size={{ xs: 12 }}>
              <SaasCard title="New branch">
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Name" value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} sx={saasTextFieldSx} /></Grid>
                  <Grid size={{ xs: 12 }}><TextField fullWidth label="Address" value={branchForm.addressLine} onChange={(e) => setBranchForm({ ...branchForm, addressLine: e.target.value })} sx={saasTextFieldSx} /></Grid>
                  <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="City" value={branchForm.city} onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })} sx={saasTextFieldSx} /></Grid>
                  <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Area" value={branchForm.area} onChange={(e) => setBranchForm({ ...branchForm, area: e.target.value })} sx={saasTextFieldSx} /></Grid>
                  <Grid size={{ xs: 12 }}><Button variant="contained" color="primary" onClick={addBranch}>Save Branch</Button></Grid>
                </Grid>
              </SaasCard>
            </Grid>
          )}
          {branches?.map((b: any) => (
            <Grid size={{ xs: 12, md: 6 }} key={b._id}>
              <SaasCard title={b.name}>
                <Typography variant="body2" color="text.secondary" mb={1.5}>{b.addressLine}</Typography>
                <Chip label={b.isActive ? 'Active' : 'Inactive'} size="small" color={b.isActive ? 'success' : 'default'} sx={{ mb: 1.5 }} />
                <Box display="flex" gap={1} flexWrap="wrap">
                  <Button size="small" onClick={() => startEditBranch(b)}>Edit</Button>
                  {b.isActive && <Button size="small" color="warning" onClick={() => deactivateBranch(b._id)}>Deactivate</Button>}
                  <Button size="small" color="error" onClick={() => deleteBranch(b._id)}>Delete</Button>
                </Box>
              </SaasCard>
            </Grid>
          ))}
        </Grid>
      )}

      {tab === 2 && (
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, md: 6 }}>
            <SaasCard title="Current plan" subtitle="Upgrade, downgrade, or extend">
              <InfoRow label="Plan" value={plan?.name || '—'} />
              <InfoRow label="Price" value={planPrice ? `PKR ${Number(planPrice).toLocaleString()}` : '—'} sub={tenant.billingCycle} />
              <InfoRow label="Status" value={<StatusPill status={tenant.subscriptionStatus} />} />
              <InfoRow label="Period" value={`${formatDate(subscriptionStart)} → ${formatDate(subscriptionEnd)}`} />
              <Box mt={2} display="flex" gap={1} flexWrap="wrap">
                <TextField select size="small" label="Change plan" value={newPlanId} onChange={(e) => setNewPlanId(e.target.value)} sx={{ minWidth: 200, ...saasTextFieldSx }}>
                  {plans.map((p) => <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>)}
                </TextField>
                <Button variant="contained" color="primary" onClick={changePlan}>Apply</Button>
              </Box>
              <Box mt={2} display="flex" gap={1} alignItems="center" flexWrap="wrap">
                <TextField size="small" type="number" label="Extend days" value={extendDays} onChange={(e) => setExtendDays(Number(e.target.value))} sx={{ width: 120, ...saasTextFieldSx }} />
                <Button variant="outlined" onClick={extendSub}>Extend subscription</Button>
                <Button variant="text" component={RouterLink} to="/superadmin/subscriptions">Manage payments</Button>
              </Box>
            </SaasCard>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <SaasCard title="Billing history" subtitle="Subscription records for this tenant" noPadding>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F7F8FA' }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>Plan</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>Period</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(subscriptions || []).map((s: any) => (
                    <TableRow key={s._id} hover>
                      <TableCell>{s.planId?.name || '—'}</TableCell>
                      <TableCell>PKR {s.amount?.toLocaleString()}</TableCell>
                      <TableCell>{formatDate(s.startedAt)} → {formatDate(s.endsAt)}</TableCell>
                      <TableCell><StatusPill status={s.status} /></TableCell>
                    </TableRow>
                  ))}
                  {!subscriptions?.length && (
                    <TableRow><TableCell colSpan={4} align="center">No billing records</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </SaasCard>
          </Grid>
        </Grid>
      )}

      {tab === 3 && (
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, md: 6 }}>
            <SaasCard title="Orders this month">
              <Typography variant="h4" fontWeight={800} sx={{ color: saas.colors.textDark }}>{tenant.currentMonthOrders ?? 0}</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>of {orderLimit.toLocaleString()} included in plan</Typography>
              <LinearProgress variant="determinate" value={orderUsage} color={orderUsage >= 80 ? 'warning' : 'primary'} sx={{ height: 8, borderRadius: 99 }} />
            </SaasCard>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <SaasCard title="Plan limits">
              <InfoRow label="Branches" value={`${branches?.length || 0} / ${plan?.maxBranches ?? '—'}`} />
              <InfoRow label="Staff accounts" value={`— / ${plan?.maxStaffAccounts ?? '—'}`} />
              <InfoRow label="Menu items" value={`— / ${plan?.maxMenuItems ?? '—'}`} />
              <InfoRow label="Orders / month" value={plan?.maxOrdersPerMonth?.toLocaleString() || '—'} />
            </SaasCard>
          </Grid>
        </Grid>
      )}

      {tab === 4 && (
        <SaasCard title="Activity log" subtitle="Recent actions on this tenant" noPadding>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#F7F8FA' }}>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>Time</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>Action</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>Description</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activityLogs.map((log) => (
                <TableRow key={log._id} hover>
                  <TableCell>{formatDateTime(log.createdAt)}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>{log.description || '—'}</TableCell>
                </TableRow>
              ))}
              {!activityLogs.length && <TableRow><TableCell colSpan={3} align="center">No activity yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </SaasCard>
      )}

      <Dialog open={!!editingBranch} onClose={() => setEditingBranch(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Branch</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Name" sx={{ mt: 1, mb: 2, ...saasTextFieldSx }} value={editBranchForm.name} onChange={(e) => setEditBranchForm({ ...editBranchForm, name: e.target.value })} />
          <TextField fullWidth label="Address" sx={{ mb: 2, ...saasTextFieldSx }} value={editBranchForm.addressLine} onChange={(e) => setEditBranchForm({ ...editBranchForm, addressLine: e.target.value })} />
          <TextField fullWidth label="City" sx={{ mb: 2, ...saasTextFieldSx }} value={editBranchForm.city} onChange={(e) => setEditBranchForm({ ...editBranchForm, city: e.target.value })} />
          <TextField fullWidth label="Area" sx={saasTextFieldSx} value={editBranchForm.area} onChange={(e) => setEditBranchForm({ ...editBranchForm, area: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingBranch(null)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={saveEditBranch}>Save</Button>
        </DialogActions>
      </Dialog>
    </SuperAdminLayout>
  );
}
