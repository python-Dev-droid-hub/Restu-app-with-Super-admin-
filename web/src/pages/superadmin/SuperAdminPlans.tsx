import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Grid,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Tooltip,
  alpha,
  CircularProgress,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import { SuperAdminLayout } from '../../components/superadmin/SuperAdminLayout';
import PageHeader from '../../components/superadmin/PageHeader';
import SaasCard from '../../components/superadmin/SaasCard';
import SaasHeroBanner from '../../components/superadmin/SaasHeroBanner';
import MetricCard from '../../components/superadmin/MetricCard';
import { saas, chartColors } from '../../components/superadmin/superAdminTokens';
import { superAdminApi } from '../../services/superAdminApi';

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

const LIMIT_ROWS: { key: string; label: string; format: (v: number) => string }[] = [
  { key: 'priceMonthly', label: 'Monthly price', format: (v) => `PKR ${Number(v || 0).toLocaleString()}` },
  { key: 'priceYearly', label: 'Yearly price', format: (v) => (v ? `PKR ${Number(v).toLocaleString()}` : '—') },
  { key: 'maxBranches', label: 'Max branches', format: (v) => (v >= 999 ? 'Unlimited' : String(v)) },
  { key: 'maxStaffAccounts', label: 'Staff accounts', format: (v) => (v >= 999 ? 'Unlimited' : String(v)) },
  { key: 'maxMenuItems', label: 'Menu items', format: (v) => (v >= 9999 ? 'Unlimited' : String(v)) },
  { key: 'maxOrdersPerMonth', label: 'Orders / month', format: (v) => (v >= 99999 ? 'Unlimited' : Number(v).toLocaleString()) },
];

function formatPkr(value?: number) {
  if (value === undefined || value === null) return '—';
  return `PKR ${Number(value).toLocaleString()}`;
}

function formatLimit(value: number, unlimitedAt: number) {
  if (value >= unlimitedAt) return 'Unlimited';
  return Number(value).toLocaleString();
}

function yearlySavings(plan: { priceMonthly?: number; priceYearly?: number }): number {
  if (!plan.priceMonthly || !plan.priceYearly) return 0;
  const fullYear = plan.priceMonthly * 12;
  if (fullYear <= 0) return 0;
  return Math.round((1 - plan.priceYearly / fullYear) * 100);
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <Box display="flex" alignItems="flex-start" gap={1.5} mb={2}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: `${saas.radius.md}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: alpha(saas.colors.primary, 0.1),
          color: saas.colors.primary,
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="h6" fontWeight={600} letterSpacing="-0.01em">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" mt={0.25}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function PlanCard({
  plan,
  accent,
  isPopular,
  onEdit,
  onToggle,
}: {
  plan: any;
  accent: string;
  isPopular?: boolean;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const savings = yearlySavings(plan);
  const enabledFeatures = Object.entries(plan.features || {})
    .filter(([, v]) => v)
    .map(([k]) => FEATURE_LABELS[k] || k);

  const limits = [
    { label: 'Branches', value: formatLimit(plan.maxBranches, 999) },
    { label: 'Staff', value: formatLimit(plan.maxStaffAccounts, 999) },
    { label: 'Menu items', value: formatLimit(plan.maxMenuItems, 9999) },
    { label: 'Orders / mo', value: formatLimit(plan.maxOrdersPerMonth, 99999) },
  ];

  return (
    <Box
      sx={{
        height: '100%',
        borderRadius: `${saas.radius.lg}px`,
        border: `1px solid ${plan.isActive ? alpha(accent, 0.28) : saas.colors.cardBorder}`,
        bgcolor: '#fff',
        boxShadow: plan.isActive ? saas.shadow.card : 'none',
        opacity: plan.isActive ? 1 : 0.78,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ height: 3, bgcolor: plan.isActive ? accent : saas.colors.cardBorder }} />

      <Box sx={{ p: { xs: 2, sm: 2.5 }, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1} mb={2}>
          <Box minWidth={0}>
            <Typography
              variant="caption"
              sx={{ color: saas.colors.textMuted, fontWeight: 500, letterSpacing: '0.03em', textTransform: 'uppercase' }}
            >
              {plan.slug || 'plan'}
            </Typography>
            <Typography variant="subtitle1" fontWeight={600} color={saas.colors.textDark} lineHeight={1.3} mt={0.25}>
              {plan.name}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.5} flexShrink={0}>
            {isPopular && (
              <Chip label="Popular" size="small" sx={{ bgcolor: alpha(accent, 0.1), color: accent, fontWeight: 500, height: 24 }} />
            )}
            {!plan.isActive && (
              <Chip label="Inactive" size="small" variant="outlined" sx={{ height: 24, fontWeight: 500 }} />
            )}
            {!plan.isPublic && (
              <Chip label="Private" size="small" variant="outlined" color="warning" sx={{ height: 24, fontWeight: 500 }} />
            )}
          </Stack>
        </Box>

        <Box mb={2}>
          <Box display="flex" alignItems="baseline" gap={0.5}>
            <Typography variant="h5" fontWeight={600} color={saas.colors.textDark} letterSpacing="-0.01em">
              {formatPkr(plan.priceMonthly)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              / month
            </Typography>
          </Box>
          {plan.priceYearly > 0 && (
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              {formatPkr(plan.priceYearly)} / year
            </Typography>
          )}
          {savings > 0 && (
            <Typography variant="caption" color="success.main" fontWeight={500} mt={0.5} display="block">
              {savings}% savings on annual billing
            </Typography>
          )}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 1,
            mb: 2,
            p: 1.5,
            borderRadius: `${saas.radius.sm}px`,
            bgcolor: saas.colors.pageBg,
            border: `1px solid ${saas.colors.cardBorder}`,
          }}
        >
          {limits.map((row) => (
            <Box key={row.label}>
              <Typography variant="caption" color="text.secondary" display="block">
                {row.label}
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {row.value}
              </Typography>
            </Box>
          ))}
        </Box>

        <Box display="flex" alignItems="center" gap={0.75} mb={1.5}>
          <StorefrontOutlinedIcon sx={{ fontSize: 16, color: saas.colors.textMuted }} />
          <Typography variant="body2" color="text.secondary">
            {plan.tenantCount || 0} subscribed tenant{(plan.tenantCount || 0) !== 1 ? 's' : ''}
          </Typography>
        </Box>

        {enabledFeatures.length > 0 && (
          <Box display="flex" flexWrap="wrap" gap={0.5} mb={2}>
            {enabledFeatures.slice(0, 5).map((f) => (
              <Chip
                key={f}
                label={f}
                size="small"
                sx={{ bgcolor: alpha(accent, 0.06), color: saas.colors.textDark, fontSize: 11, fontWeight: 500, height: 22 }}
              />
            ))}
            {enabledFeatures.length > 5 && (
              <Chip
                label={`+${enabledFeatures.length - 5} more`}
                size="small"
                variant="outlined"
                sx={{ fontSize: 11, height: 22 }}
              />
            )}
          </Box>
        )}

        <Box mt="auto" display="flex" gap={1} pt={1}>
          <Button fullWidth variant="outlined" size="small" startIcon={<EditOutlinedIcon />} onClick={onEdit}>
            Edit plan
          </Button>
          <Button
            fullWidth
            variant="text"
            size="small"
            onClick={onToggle}
            sx={{ color: plan.isActive ? 'text.secondary' : 'primary.main' }}
          >
            {plan.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

export default function SuperAdminPlans() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    superAdminApi
      .get('/plans')
      .then((res: any) => setPlans(res.data?.plans || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (id: string) => {
    await superAdminApi.post(`/plans/${id}/toggle`);
    load();
  };

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => (a.priceMonthly || 0) - (b.priceMonthly || 0)),
    [plans]
  );

  const comparisonPlans = useMemo(
    () => sortedPlans.filter((p) => p.isActive),
    [sortedPlans]
  );

  const metrics = useMemo(() => {
    const active = plans.filter((p) => p.isActive).length;
    const tenants = plans.reduce((s, p) => s + (p.tenantCount || 0), 0);
    const mrr = plans.reduce((s, p) => s + (p.isActive ? (p.priceMonthly || 0) * (p.tenantCount || 0) : 0), 0);
    const publicTiers = plans.filter((p) => p.isPublic && p.isActive).length;
    return { total: plans.length, active, tenants, mrr, publicTiers };
  }, [plans]);

  const popularIndex = sortedPlans.length >= 2 ? Math.floor(sortedPlans.length / 2) : -1;
  const featureKeys = Object.keys(FEATURE_LABELS);

  return (
    <SuperAdminLayout>
      <PageHeader
        title="Plans & pricing"
        subtitle="Configure subscription tiers, usage limits, and feature access for restaurants on your platform."
        breadcrumbs={[
          { label: 'Platform', to: '/superadmin/dashboard' },
          { label: 'Restaurants', to: '/superadmin/tenants' },
          { label: 'Plans & pricing' },
        ]}
        action={
          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => navigate('/superadmin/plans/new')}>
            Create plan
          </Button>
        }
      />

      <SaasHeroBanner
        badgeIcon={<LayersOutlinedIcon sx={{ fontSize: 18 }} />}
        badgeLabel="Subscription catalog"
        headline={String(metrics.total)}
        description="Pricing tiers that define billing, capacity limits, and platform features for each restaurant."
        highlight={{ label: 'Estimated plan MRR', value: formatPkr(metrics.mrr) }}
        stats={[
          { label: 'Active plans', value: metrics.active, accent: '#4CAF50' },
          { label: 'Subscribed tenants', value: metrics.tenants, accent: '#2196F3' },
          { label: 'Public tiers', value: metrics.publicTiers, accent: saas.colors.primary },
          { label: 'Inactive plans', value: metrics.total - metrics.active, accent: '#9E9E9E' },
        ]}
      />

      <Grid container spacing={2.5} mb={3.5} sx={{ width: '100%' }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard title="Total plans" value={metrics.total} accent="primary" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard title="Active tiers" value={metrics.active} accent="success" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard title="Subscribed tenants" value={metrics.tenants} accent="info" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard title="Est. plan MRR" value={formatPkr(metrics.mrr)} accent="warning" />
        </Grid>
      </Grid>

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress color="primary" />
        </Box>
      ) : sortedPlans.length === 0 ? (
        <SaasCard title="No plans yet" subtitle="Create your first subscription tier to start onboarding restaurants.">
          <Box textAlign="center" py={4}>
            <LayersOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography color="text.secondary" mb={2} maxWidth={420} mx="auto">
              Plans control monthly pricing, usage limits, and which platform features each restaurant can access.
            </Typography>
            <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => navigate('/superadmin/plans/new')}>
              Create first plan
            </Button>
          </Box>
        </SaasCard>
      ) : (
        <>
          <SectionHeader
            icon={<ViewColumnOutlinedIcon fontSize="small" />}
            title="Pricing tiers"
            subtitle="Manage individual plans — edit limits, features, and visibility"
          />
          <Grid container spacing={2.5} mb={3.5} sx={{ width: '100%' }}>
            {sortedPlans.map((p, i) => (
              <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={p._id}>
                <PlanCard
                  plan={p}
                  accent={chartColors[i % chartColors.length]}
                  isPopular={i === popularIndex && p.isActive}
                  onEdit={() => navigate(`/superadmin/plans/${p._id}/edit`)}
                  onToggle={() => toggle(p._id)}
                />
              </Grid>
            ))}
          </Grid>

          <SectionHeader
            icon={<TableChartOutlinedIcon fontSize="small" />}
            title="Feature comparison"
            subtitle="Side-by-side view of limits and capabilities across active tiers"
          />
          <SaasCard
            title="Plan matrix"
            subtitle={
              comparisonPlans.length
                ? `${comparisonPlans.length} active tier${comparisonPlans.length !== 1 ? 's' : ''} compared`
                : 'Activate a plan to populate this matrix'
            }
            action={
              comparisonPlans.length > 0 ? (
                <Chip
                  size="small"
                  icon={<PaymentsOutlinedIcon sx={{ fontSize: '16px !important' }} />}
                  label={`${comparisonPlans.length} tiers`}
                  variant="outlined"
                  sx={{ fontWeight: 500 }}
                />
              ) : undefined
            }
            noPadding
          >
            {comparisonPlans.length === 0 ? (
              <Box py={5} textAlign="center">
                <Typography color="text.secondary">Activate at least one plan to see the comparison matrix.</Typography>
              </Box>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 640 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          color: saas.colors.textMuted,
                          minWidth: 200,
                          position: 'sticky',
                          left: 0,
                          bgcolor: '#fff',
                          zIndex: 2,
                          borderBottom: `1px solid ${saas.colors.cardBorder}`,
                          py: 2,
                        }}
                      >
                        Capability
                      </TableCell>
                      {comparisonPlans.map((p, i) => (
                        <TableCell
                          key={p._id}
                          align="center"
                          sx={{
                            minWidth: 148,
                            borderBottom: `1px solid ${saas.colors.cardBorder}`,
                            py: 2,
                            bgcolor: alpha(chartColors[i % chartColors.length], 0.04),
                          }}
                        >
                          <Typography variant="subtitle2" fontWeight={600}>
                            {p.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatPkr(p.priceMonthly)}/mo
                          </Typography>
                          <Box
                            sx={{
                              height: 2,
                              width: 24,
                              mx: 'auto',
                              mt: 1,
                              borderRadius: 99,
                              bgcolor: chartColors[i % chartColors.length],
                            }}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell
                        colSpan={comparisonPlans.length + 1}
                        sx={{
                          bgcolor: saas.colors.pageBg,
                          fontWeight: 600,
                          fontSize: 11,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          color: saas.colors.textMuted,
                          py: 1.25,
                        }}
                      >
                        Pricing & limits
                      </TableCell>
                    </TableRow>
                    {LIMIT_ROWS.map((row, rowIdx) => (
                      <TableRow
                        key={row.key}
                        sx={{ bgcolor: rowIdx % 2 === 0 ? '#fff' : alpha(saas.colors.pageBg, 0.6) }}
                      >
                        <TableCell
                          sx={{
                            fontWeight: 500,
                            color: saas.colors.textDark,
                            position: 'sticky',
                            left: 0,
                            bgcolor: 'inherit',
                            zIndex: 1,
                          }}
                        >
                          {row.label}
                        </TableCell>
                        {comparisonPlans.map((p) => (
                          <TableCell key={p._id} align="center" sx={{ fontWeight: 500, color: saas.colors.textDark }}>
                            {row.format(p[row.key])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}

                    <TableRow>
                      <TableCell
                        colSpan={comparisonPlans.length + 1}
                        sx={{
                          bgcolor: saas.colors.pageBg,
                          fontWeight: 600,
                          fontSize: 11,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          color: saas.colors.textMuted,
                          py: 1.25,
                        }}
                      >
                        Platform features
                      </TableCell>
                    </TableRow>
                    {featureKeys.map((key, rowIdx) => (
                      <TableRow
                        key={key}
                        sx={{ bgcolor: rowIdx % 2 === 0 ? '#fff' : alpha(saas.colors.pageBg, 0.6) }}
                      >
                        <TableCell
                          sx={{
                            fontWeight: 500,
                            color: saas.colors.textDark,
                            position: 'sticky',
                            left: 0,
                            bgcolor: 'inherit',
                            zIndex: 1,
                          }}
                        >
                          {FEATURE_LABELS[key]}
                        </TableCell>
                        {comparisonPlans.map((p) => {
                          const enabled = !!p.features?.[key];
                          return (
                            <TableCell key={p._id} align="center">
                              {enabled ? (
                                <CheckCircleOutlineIcon sx={{ color: 'success.main', fontSize: 20 }} />
                              ) : (
                                <CancelOutlinedIcon sx={{ color: alpha(saas.colors.textMuted, 0.3), fontSize: 20 }} />
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}

                    <TableRow>
                      <TableCell
                        sx={{
                          fontWeight: 500,
                          position: 'sticky',
                          left: 0,
                          bgcolor: '#fff',
                          zIndex: 1,
                          borderTop: `1px solid ${saas.colors.cardBorder}`,
                        }}
                      >
                        Manage
                      </TableCell>
                      {comparisonPlans.map((p) => (
                        <TableCell key={p._id} align="center" sx={{ borderTop: `1px solid ${saas.colors.cardBorder}` }}>
                          <Tooltip title="Edit plan">
                            <IconButton size="small" onClick={() => navigate(`/superadmin/plans/${p._id}/edit`)}>
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </Box>
            )}
          </SaasCard>
        </>
      )}
    </SuperAdminLayout>
  );
}
