import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Grid,
  TextField,
  Typography,
  Switch,
  FormControlLabel,
  Alert,
  alpha,
  Divider,
  Stack,
} from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import ExtensionOutlinedIcon from '@mui/icons-material/ExtensionOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { SuperAdminLayout } from '../../components/superadmin/SuperAdminLayout';
import PageHeader from '../../components/superadmin/PageHeader';
import SaasCard from '../../components/superadmin/SaasCard';
import { saas } from '../../components/superadmin/superAdminTokens';
import { superAdminApi } from '../../services/superAdminApi';

const FEATURE_KEYS = [
  'dine_in', 'delivery', 'takeaway', 'kitchen_display', 'rider_app', 'analytics',
  'white_label', 'custom_domain', 'api_access', 'fbr_integration', 'loyalty_program', 'offline_mode',
] as const;

const FEATURE_LABELS: Record<string, string> = {
  dine_in: 'Dine-in',
  delivery: 'Delivery',
  takeaway: 'Takeaway',
  kitchen_display: 'Kitchen display',
  rider_app: 'Rider app',
  analytics: 'Analytics',
  white_label: 'White label',
  custom_domain: 'Custom domain',
  api_access: 'API access',
  fbr_integration: 'FBR integration',
  loyalty_program: 'Loyalty program',
  offline_mode: 'Offline mode',
};

const defaultFeatures = Object.fromEntries(FEATURE_KEYS.map((k) => [k, false])) as Record<string, boolean>;
defaultFeatures.dine_in = true;

function SectionLabel({ icon, title, description }: { icon: React.ReactNode; title: string; description?: string }) {
  return (
    <Box display="flex" gap={1.5} mb={2}>
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: `${saas.radius.sm}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: alpha(saas.colors.primary, 0.08),
          color: saas.colors.primary,
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="subtitle2" fontWeight={600}>
          {title}
        </Typography>
        {description && (
          <Typography variant="caption" color="text.secondary">
            {description}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default function SuperAdminPlanForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    priceMonthly: 0,
    priceYearly: 0,
    maxBranches: 1,
    maxStaffAccounts: 5,
    maxMenuItems: 50,
    maxOrdersPerMonth: 500,
    features: { ...defaultFeatures },
    isActive: true,
    isPublic: true,
  });

  useEffect(() => {
    if (id) {
      superAdminApi.get(`/plans/${id}`).then((res: any) => {
        const p = res.data?.plan;
        if (p) {
          setForm({
            name: p.name,
            slug: p.slug,
            priceMonthly: p.priceMonthly,
            priceYearly: p.priceYearly || 0,
            maxBranches: p.maxBranches,
            maxStaffAccounts: p.maxStaffAccounts,
            maxMenuItems: p.maxMenuItems,
            maxOrdersPerMonth: p.maxOrdersPerMonth,
            features: { ...defaultFeatures, ...p.features },
            isActive: p.isActive,
            isPublic: p.isPublic,
          });
        }
      });
      superAdminApi.get(`/plans/${id}/warnings`).then((res: any) => {
        setWarnings(res.data?.warnings || []);
      });
    }
  }, [id]);

  const set = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }));
  const setFeature = (key: string, value: boolean) =>
    setForm((f) => ({ ...f, features: { ...f.features, [key]: value } }));

  const submit = async () => {
    setError('');
    try {
      if (isEdit) {
        const res: any = await superAdminApi.patch(`/plans/${id}`, form);
        if (res.data?.warnings?.length) {
          setWarnings(res.data.warnings);
          return;
        }
      } else {
        await superAdminApi.post('/plans', form);
      }
      navigate('/superadmin/plans');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Save failed');
    }
  };

  const yearlySavings =
    form.priceMonthly > 0 && form.priceYearly > 0
      ? Math.round((1 - form.priceYearly / (form.priceMonthly * 12)) * 100)
      : 0;

  return (
    <SuperAdminLayout>
      <PageHeader
        title={isEdit ? 'Edit plan' : 'Create plan'}
        subtitle="Set pricing, usage limits, and feature access for a subscription tier."
        breadcrumbs={[
          { label: 'Platform', to: '/superadmin/dashboard' },
          { label: 'Plans & pricing', to: '/superadmin/plans' },
          { label: isEdit ? 'Edit' : 'New plan' },
        ]}
        action={
          <Button variant="outlined" startIcon={<ArrowBackOutlinedIcon />} onClick={() => navigate('/superadmin/plans')}>
            Back to plans
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {warnings.length} tenant(s) exceed new limits: {warnings.map((w) => w.tenantName).join(', ')}
        </Alert>
      )}

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={2.5}>
            <SaasCard title="Plan details" subtitle="Name and identifier shown to admins and in billing">
              <SectionLabel
                icon={<InfoOutlinedIcon fontSize="small" />}
                title="Basic information"
                description="The slug is used internally and in URLs."
              />
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Plan name"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    required
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Slug"
                    value={form.slug}
                    onChange={(e) => set('slug', e.target.value)}
                    placeholder="e.g. starter"
                    size="small"
                  />
                </Grid>
              </Grid>
            </SaasCard>

            <SaasCard title="Pricing & limits" subtitle="Monthly billing and capacity constraints per tenant">
              <SectionLabel
                icon={<PaymentsOutlinedIcon fontSize="small" />}
                title="Billing"
                description="Set monthly and optional yearly pricing in PKR."
              />
              <Grid container spacing={2} mb={2.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Monthly price (PKR)"
                    type="number"
                    value={form.priceMonthly}
                    onChange={(e) => set('priceMonthly', Number(e.target.value))}
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Yearly price (PKR)"
                    type="number"
                    value={form.priceYearly}
                    onChange={(e) => set('priceYearly', Number(e.target.value))}
                    helperText={yearlySavings > 0 ? `${yearlySavings}% savings vs monthly` : undefined}
                    size="small"
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <SectionLabel
                icon={<TuneOutlinedIcon fontSize="small" />}
                title="Usage limits"
                description="Use 999+ for unlimited branches/staff, 9999+ for menu items."
              />
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    label="Max branches"
                    type="number"
                    value={form.maxBranches}
                    onChange={(e) => set('maxBranches', Number(e.target.value))}
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    label="Max staff"
                    type="number"
                    value={form.maxStaffAccounts}
                    onChange={(e) => set('maxStaffAccounts', Number(e.target.value))}
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    label="Max menu items"
                    type="number"
                    value={form.maxMenuItems}
                    onChange={(e) => set('maxMenuItems', Number(e.target.value))}
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    label="Max orders / month"
                    type="number"
                    value={form.maxOrdersPerMonth}
                    onChange={(e) => set('maxOrdersPerMonth', Number(e.target.value))}
                    size="small"
                  />
                </Grid>
              </Grid>
            </SaasCard>

            <SaasCard title="Platform features" subtitle="Toggle capabilities included in this tier">
              <SectionLabel
                icon={<ExtensionOutlinedIcon fontSize="small" />}
                title="Feature access"
                description="Disabled features are hidden or blocked for tenants on this plan."
              />
              <Grid container spacing={0.5}>
                {FEATURE_KEYS.map((key) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={key}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={form.features[key]}
                          onChange={(e) => setFeature(key, e.target.checked)}
                          size="small"
                        />
                      }
                      label={
                        <Typography variant="body2" fontWeight={500}>
                          {FEATURE_LABELS[key]}
                        </Typography>
                      }
                      sx={{ ml: 0, width: '100%', py: 0.5 }}
                    />
                  </Grid>
                ))}
              </Grid>
            </SaasCard>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={2.5}>
            <SaasCard title="Visibility" subtitle="Control whether this plan is offered">
              <SectionLabel
                icon={<VisibilityOutlinedIcon fontSize="small" />}
                title="Publication"
                description="Inactive or private plans won't appear in tenant onboarding."
              />
              <Stack spacing={1}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: `${saas.radius.sm}px`,
                    border: `1px solid ${saas.colors.cardBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      Active
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Plan can be assigned to tenants
                    </Typography>
                  </Box>
                  <Switch checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} size="small" />
                </Box>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: `${saas.radius.sm}px`,
                    border: `1px solid ${saas.colors.cardBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      Public
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Visible during tenant launch
                    </Typography>
                  </Box>
                  <Switch checked={form.isPublic} onChange={(e) => set('isPublic', e.target.checked)} size="small" />
                </Box>
              </Stack>
            </SaasCard>

            <SaasCard title="Summary" subtitle="Preview of this tier">
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Display name
                  </Typography>
                  <Typography fontWeight={600}>{form.name || '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Monthly price
                  </Typography>
                  <Typography fontWeight={600}>
                    {form.priceMonthly ? `PKR ${form.priceMonthly.toLocaleString()}` : '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Features enabled
                  </Typography>
                  <Typography fontWeight={600}>
                    {Object.values(form.features).filter(Boolean).length} of {FEATURE_KEYS.length}
                  </Typography>
                </Box>
                <Divider />
                <Stack direction="row" spacing={1}>
                  <Button fullWidth variant="outlined" onClick={() => navigate('/superadmin/plans')}>
                    Cancel
                  </Button>
                  <Button fullWidth variant="contained" color="primary" startIcon={<SaveOutlinedIcon />} onClick={submit}>
                    {isEdit ? 'Save changes' : 'Create plan'}
                  </Button>
                </Stack>
              </Stack>
            </SaasCard>
          </Stack>
        </Grid>
      </Grid>
    </SuperAdminLayout>
  );
}
