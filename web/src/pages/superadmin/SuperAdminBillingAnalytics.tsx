import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Grid,
  Typography,
  Chip,
  LinearProgress,
  CircularProgress,
  alpha,
  Stack,
} from '@mui/material';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import ShowChartOutlinedIcon from '@mui/icons-material/ShowChartOutlined';
import PieChartOutlineOutlinedIcon from '@mui/icons-material/PieChartOutlineOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import { SuperAdminLayout } from '../../components/superadmin/SuperAdminLayout';
import PageHeader from '../../components/superadmin/PageHeader';
import SaasCard from '../../components/superadmin/SaasCard';
import SaasHeroBanner from '../../components/superadmin/SaasHeroBanner';
import MetricCard from '../../components/superadmin/MetricCard';
import {
  MrrGrowthChart,
  PlanDistributionChart,
  ChurnChart,
  RevenueByPlanChart,
} from '../../components/superadmin/SuperAdminCharts';
import { saas, chartColors } from '../../components/superadmin/superAdminTokens';
import { superAdminApi } from '../../services/superAdminApi';

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
  PAST_DUE: 'Past due',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#4CAF50',
  CANCELLED: '#9E9E9E',
  EXPIRED: '#F44336',
  PAST_DUE: '#FF9800',
};

function formatPkr(value?: number) {
  if (value === undefined || value === null) return '—';
  return `PKR ${Number(value).toLocaleString()}`;
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

function PlanTierCard({
  planName,
  tenantCount,
  mrr,
  share,
  color,
}: {
  planName: string;
  tenantCount: number;
  mrr: number;
  share: number;
  color: string;
}) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: `${saas.radius.md}px`,
        border: `1px solid ${saas.colors.cardBorder}`,
        bgcolor: alpha(color, 0.04),
        height: '100%',
        transition: 'box-shadow 0.2s, transform 0.2s',
        '&:hover': {
          boxShadow: saas.shadow.card,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
        <Typography fontWeight={600}>{planName}</Typography>
      </Box>
      <Typography variant="h5" fontWeight={600} letterSpacing="-0.01em" sx={{ fontSize: { xs: '1.15rem', sm: '1.35rem' } }}>
        {formatPkr(mrr)}
      </Typography>
      <Typography variant="body2" color="text.secondary" mt={0.5}>
        {tenantCount} tenant{tenantCount !== 1 ? 's' : ''} · {share}% of MRR
      </Typography>
      <LinearProgress
        variant="determinate"
        value={share}
        sx={{
          mt: 1.5,
          height: 6,
          borderRadius: 99,
          bgcolor: alpha(color, 0.12),
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 99 },
        }}
      />
    </Box>
  );
}

export default function SuperAdminBillingAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    superAdminApi
      .get('/analytics/billing')
      .then((res: any) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const m = data?.metrics || {};
  const charts = data?.charts || {};

  const planPieData = useMemo(
    () =>
      (charts.planBreakdown || [])
        .filter((p: any) => p.tenantCount > 0)
        .map((p: any) => ({ planName: p.planName, count: p.tenantCount })),
    [charts.planBreakdown]
  );

  const statusRows = useMemo(() => {
    const rows = charts.subscriptionStatusCounts || [];
    const total = rows.reduce((s: number, r: any) => s + (r.count || 0), 0);
    return { rows, total };
  }, [charts.subscriptionStatusCounts]);

  const mrrTrend = useMemo(() => {
    const series = charts.mrrGrowth || [];
    if (series.length < 2) return null;
    const last = series[series.length - 1]?.mrr || 0;
    const prev = series[series.length - 2]?.mrr || 0;
    if (prev === 0) return last > 0 ? 100 : 0;
    return Math.round(((last - prev) / prev) * 1000) / 10;
  }, [charts.mrrGrowth]);

  if (loading && !data) {
    return (
      <SuperAdminLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={360}>
          <CircularProgress color="primary" />
        </Box>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <PageHeader
        title="Revenue analytics"
        subtitle="Track MRR, churn, plan mix, and subscription health across your restaurant platform."
        breadcrumbs={[
          { label: 'Platform', to: '/superadmin/dashboard' },
          { label: 'Billing', to: '/superadmin/subscriptions' },
          { label: 'Analytics' },
        ]}
        action={
          <Button variant="outlined" startIcon={<RefreshOutlinedIcon />} onClick={load} disabled={loading}>
            Refresh
          </Button>
        }
      />

      <SaasHeroBanner
        badgeIcon={<AccountBalanceWalletOutlinedIcon sx={{ fontSize: 18 }} />}
        badgeLabel="Platform recurring revenue"
        headline={formatPkr(m.mrr)}
        description="Monthly recurring revenue across all active restaurant subscriptions."
        highlight={{ label: 'Annual run rate', value: formatPkr(m.arr) }}
        trend={
          mrrTrend !== null
            ? {
                label: `${mrrTrend >= 0 ? '+' : ''}${mrrTrend}% vs last month`,
                positive: mrrTrend >= 0,
              }
            : undefined
        }
        stats={[
          { label: 'Active subs', value: m.totalActiveSubscriptions ?? 0, accent: saas.colors.primary },
          { label: 'Payment success', value: `${m.paymentSuccessRate ?? 100}%`, accent: '#4CAF50' },
          { label: 'ARPU', value: formatPkr(m.arpu), accent: '#2196F3' },
          { label: 'Churn rate', value: `${m.churnRate ?? 0}%`, accent: '#FF9800' },
        ]}
      />

      <Grid container spacing={2.5} mb={3.5} sx={{ width: '100%' }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard title="MRR" value={formatPkr(m.mrr)} accent="primary" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard title="ARR" value={formatPkr(m.arr)} accent="info" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard title="New MRR (month)" value={formatPkr(m.newMrrThisMonth)} accent="success" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard title="Churned MRR" value={formatPkr(m.churnedMrr)} accent="warning" />
        </Grid>
      </Grid>

      <SectionHeader
        icon={<ShowChartOutlinedIcon fontSize="small" />}
        title="Revenue trends"
        subtitle="MRR trajectory and plan mix over time"
      />
      <Grid container spacing={2.5} mb={3.5} sx={{ width: '100%' }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <MrrGrowthChart data={charts.mrrGrowth || []} />
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <PlanDistributionChart data={planPieData} />
        </Grid>
      </Grid>

      <Grid container spacing={2.5} mb={3.5} sx={{ width: '100%' }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <RevenueByPlanChart data={charts.revenueByPlan || []} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ChurnChart data={charts.churnByMonth || []} />
        </Grid>
      </Grid>

      <SectionHeader
        icon={<InsightsOutlinedIcon fontSize="small" />}
        title="Plan & subscription insights"
        subtitle="Tier performance and billing health at a glance"
      />
      <Grid container spacing={2.5} sx={{ width: '100%' }}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <SaasCard
            title="Plan breakdown"
            subtitle="Tenants and MRR share by subscription tier"
            action={<PieChartOutlineOutlinedIcon sx={{ color: saas.colors.textMuted }} />}
          >
            {(charts.planBreakdown || []).length === 0 ? (
              <Typography color="text.secondary" py={3} textAlign="center">
                No plan data yet — launch tenants to see breakdown.
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {(charts.planBreakdown || []).map((p: any, i: number) => {
                  const share = m.mrr > 0 ? Math.round((p.mrr / m.mrr) * 100) : 0;
                  return (
                    <Grid key={p.planName} size={{ xs: 12, sm: 6 }}>
                      <PlanTierCard
                        planName={p.planName}
                        tenantCount={p.tenantCount}
                        mrr={p.mrr}
                        share={share}
                        color={chartColors[i % chartColors.length]}
                      />
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </SaasCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <SaasCard title="Subscription health" subtitle="Billing records by status">
            {statusRows.total === 0 ? (
              <Typography color="text.secondary" py={3} textAlign="center">
                No subscription records yet.
              </Typography>
            ) : (
              <Stack spacing={2.5}>
                {statusRows.rows.map((s: any) => {
                  const pct = Math.round((s.count / statusRows.total) * 100);
                  const color = STATUS_COLORS[s.status] || saas.colors.textMuted;
                  return (
                    <Box key={s.status}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.75}>
                        <Chip
                          label={STATUS_LABELS[s.status] || s.status}
                          size="small"
                          sx={{ bgcolor: alpha(color, 0.12), color, fontWeight: 600 }}
                        />
                        <Typography variant="body2" fontWeight={600}>
                          {s.count}{' '}
                          <Typography component="span" variant="caption" color="text.secondary">
                            ({pct}%)
                          </Typography>
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{
                          height: 8,
                          borderRadius: 99,
                          bgcolor: alpha(color, 0.1),
                          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 99 },
                        }}
                      />
                    </Box>
                  );
                })}
                <Box
                  sx={{
                    mt: 1,
                    p: 2,
                    borderRadius: `${saas.radius.md}px`,
                    bgcolor: alpha(saas.colors.primary, 0.06),
                    border: `1px solid ${alpha(saas.colors.primary, 0.12)}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 2,
                    flexWrap: 'wrap',
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={500} textTransform="uppercase">
                      New subscriptions
                    </Typography>
                    <Typography fontWeight={600} mt={0.25}>
                      {m.expansionMrr ?? 0} this month
                    </Typography>
                  </Box>
                  <Box textAlign={{ xs: 'left', sm: 'right' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={500} textTransform="uppercase">
                      New MRR added
                    </Typography>
                    <Typography fontWeight={600} mt={0.25} color="success.main">
                      {formatPkr(m.newMrrThisMonth)}
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            )}
          </SaasCard>
        </Grid>
      </Grid>
    </SuperAdminLayout>
  );
}
