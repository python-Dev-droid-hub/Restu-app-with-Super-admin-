import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Button, Grid, TextField, Typography, Paper, MenuItem, Alert,
  FormControlLabel, Switch, Divider, Chip, InputLabel, FormControl, Select,
} from '@mui/material';
import { SuperAdminLayout } from '../../components/superadmin/SuperAdminLayout';
import { TenantBrandingFields } from '../../components/superadmin/TenantBrandingFields';
import { saasTextFieldSx } from '../../components/superadmin/superAdminFormStyles';
import { superAdminApi } from '../../services/superAdminApi';

const FEATURE_KEYS = [
  'dine_in', 'delivery', 'takeaway', 'kitchen_display', 'rider_app',
  'analytics', 'white_label', 'custom_domain', 'api_access',
  'fbr_integration', 'loyalty_program', 'offline_mode',
] as const;

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  TRIAL: 'Trial',
  PAST_DUE: 'Past due',
  SUSPENDED: 'Suspended',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
};

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  ACTIVE: 'success',
  TRIAL: 'info',
  PAST_DUE: 'warning',
  SUSPENDED: 'error',
  CANCELLED: 'default',
  EXPIRED: 'default',
};

const BILLING_STATUSES = ['TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'SUSPENDED', 'EXPIRED'] as const;

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SuperAdminEditTenant() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [statusError, setStatusError] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);
  const [form, setForm] = useState<any>({});
  const [featureOverrides, setFeatureOverrides] = useState<Record<string, boolean>>({});
  const [planFeatures, setPlanFeatures] = useState<Record<string, boolean>>({});
  const [tenantMeta, setTenantMeta] = useState({
    subscriptionStatus: '',
    isActive: true,
    trialEndsAt: '',
    subscriptionEndsAt: '',
    planName: '',
    ownerEmail: '',
  });
  const [billingStatus, setBillingStatus] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const loadTenant = () => {
    if (!id) return;
    superAdminApi.get(`/tenants/${id}`).then((res: any) => {
      const t = res.data?.tenant;
      setForm({
        name: t.name, legalName: t.legalName || '', ownerName: t.ownerName,
        ownerPhone: t.ownerPhone, city: t.city || '', country: t.country || 'Pakistan',
        businessType: t.businessType || 'RESTAURANT', cuisineType: t.cuisineType || '',
        primaryColor: t.primaryColor || '#FA4A0C', secondaryColor: t.secondaryColor || '#2D2D2D',
        logoUrl: t.logoUrl || '', faviconUrl: t.faviconUrl || '', slug: t.slug || '',
      });
      setFeatureOverrides(t.featureOverrides || {});
      setPlanFeatures(t.planId?.features || {});
      setTenantMeta({
        subscriptionStatus: t.subscriptionStatus || '',
        isActive: t.isActive !== false,
        trialEndsAt: t.trialEndsAt || '',
        subscriptionEndsAt: t.subscriptionEndsAt || '',
        planName: t.planId?.name || '—',
        ownerEmail: t.ownerEmail || '',
      });
      setBillingStatus(t.subscriptionStatus || '');
    });
  };

  useEffect(() => {
    loadTenant();
  }, [id]);

  const set = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }));

  const toggleFeature = (key: string, value: boolean) => {
    setFeatureOverrides((prev) => ({ ...prev, [key]: value }));
  };

  const uploadImage = async (file: File, field: 'logoUrl' | 'faviconUrl') => {
    const reader = new FileReader();
    reader.onload = async () => {
      const res: any = await superAdminApi.post('/upload/image', { image: reader.result, filename: file.name });
      if (res.data?.url) set(field, res.data.url);
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setError('');
    try {
      await superAdminApi.patch(`/tenants/${id}`, { ...form, featureOverrides });
      navigate(`/superadmin/tenants/${id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Save failed');
    }
  };

  const deleteTenant = async () => {
    if (!confirm('Permanently soft-delete this tenant?')) return;
    const password = prompt('Enter your password to confirm:');
    if (!password) return;
    await superAdminApi.delete(`/tenants/${id}`, { password });
    navigate('/superadmin/tenants');
  };

  const updateBillingStatus = async () => {
    setStatusError('');
    if (billingStatus === tenantMeta.subscriptionStatus) {
      setStatusError('Status is already set to this value.');
      return;
    }
    if (billingStatus === 'SUSPENDED' && !suspendReason.trim()) {
      setStatusError('Suspension reason is required.');
      return;
    }
    if (billingStatus === 'SUSPENDED' && !confirmPassword.trim()) {
      setStatusError('Your super admin password is required to suspend.');
      return;
    }
    setStatusSaving(true);
    try {
      await superAdminApi.post(`/tenants/${id}/status`, {
        subscriptionStatus: billingStatus,
        reason: billingStatus === 'SUSPENDED' ? suspendReason : undefined,
        password: billingStatus === 'SUSPENDED' ? confirmPassword : undefined,
      });
      setSuspendReason('');
      setConfirmPassword('');
      loadTenant();
    } catch (err: any) {
      setStatusError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setStatusSaving(false);
    }
  };

  return (
    <SuperAdminLayout>
      <Typography variant="h5" fontWeight={700} mb={3}>Edit Tenant</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Restaurant Name" value={form.name || ''} onChange={(e) => set('name', e.target.value)} /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Legal Name" value={form.legalName || ''} onChange={(e) => set('legalName', e.target.value)} /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Owner Name" value={form.ownerName || ''} onChange={(e) => set('ownerName', e.target.value)} /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Owner Phone" value={form.ownerPhone || ''} onChange={(e) => set('ownerPhone', e.target.value)} /></Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth select label="Business Type" value={form.businessType || 'RESTAURANT'} onChange={(e) => set('businessType', e.target.value)}>
              {['RESTAURANT', 'CAFE', 'BAKERY', 'CLOUD_KITCHEN', 'FOOD_TRUCK'].map((b) => (
                <MenuItem key={b} value={b}>{b.replace('_', ' ')}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Cuisine Type" value={form.cuisineType || ''} onChange={(e) => set('cuisineType', e.target.value)} /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="City" value={form.city || ''} onChange={(e) => set('city', e.target.value)} /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Country" value={form.country || ''} onChange={(e) => set('country', e.target.value)} /></Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" mb={2}>Branding</Typography>
        <TenantBrandingFields
          values={{
            primaryColor: form.primaryColor || '#FA4A0C',
            secondaryColor: form.secondaryColor || '#2D2D2D',
            logoUrl: form.logoUrl,
            faviconUrl: form.faviconUrl,
            name: form.name,
            slug: form.slug,
          }}
          onChange={(field, value) => set(field, value)}
          onUpload={(file, field) => uploadImage(file, field)}
        />
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" mb={1}>Account &amp; Billing</Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Change subscription or account access status. Suspending blocks the restaurant from logging in.
        </Typography>
        {statusError && <Alert severity="error" sx={{ mb: 2 }}>{statusError}</Alert>}
        <Box display="flex" flexWrap="wrap" gap={1} alignItems="center" mb={2}>
          <Chip
            label={STATUS_LABELS[tenantMeta.subscriptionStatus] || tenantMeta.subscriptionStatus || '—'}
            color={STATUS_COLOR[tenantMeta.subscriptionStatus] || 'default'}
            size="small"
          />
          <Chip
            label={tenantMeta.isActive ? 'Account active' : 'Account suspended'}
            color={tenantMeta.isActive ? 'success' : 'error'}
            size="small"
            variant="outlined"
          />
        </Box>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Typography variant="caption" color="text.secondary">Plan</Typography>
            <Typography variant="body2">{tenantMeta.planName}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Typography variant="caption" color="text.secondary">Trial ends</Typography>
            <Typography variant="body2">{formatDate(tenantMeta.trialEndsAt)}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Typography variant="caption" color="text.secondary">Subscription ends</Typography>
            <Typography variant="body2">{formatDate(tenantMeta.subscriptionEndsAt)}</Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth size="small" sx={saasTextFieldSx}>
              <InputLabel shrink>Billing status</InputLabel>
              <Select
                notched
                label="Billing status"
                value={billingStatus}
                onChange={(e) => setBillingStatus(e.target.value)}
              >
                {BILLING_STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>{STATUS_LABELS[s]}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {billingStatus === 'SUSPENDED' && (
            <>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Suspension reason"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  sx={saasTextFieldSx}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="password"
                  label="Your super admin password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  sx={saasTextFieldSx}
                />
              </Grid>
            </>
          )}
          <Grid size={{ xs: 12 }}>
            <Button
              variant="outlined"
              onClick={updateBillingStatus}
              disabled={statusSaving || billingStatus === tenantMeta.subscriptionStatus}
            >
              {statusSaving ? 'Updating…' : 'Update billing status'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" mb={1}>Feature Overrides</Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Override plan defaults for this tenant. Plan default shown in label.
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={1}>
          {FEATURE_KEYS.map((key) => {
            const planDefault = planFeatures[key] ?? false;
            const value = featureOverrides[key] ?? planDefault;
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={key}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!value}
                      onChange={(e) => toggleFeature(key, e.target.checked)}
                    />
                  }
                  label={`${key.replace(/_/g, ' ')} (plan: ${planDefault ? 'on' : 'off'})`}
                />
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      <Box display="flex" gap={2}>
        <Button variant="outlined" onClick={() => navigate(-1)}>Cancel</Button>
        <Button variant="contained" color="primary" onClick={save}>Save</Button>
        <Button color="error" onClick={deleteTenant}>Delete tenant</Button>
      </Box>
    </SuperAdminLayout>
  );
}
