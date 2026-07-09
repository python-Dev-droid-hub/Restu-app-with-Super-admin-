import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Chip, CircularProgress, Grid, List, ListItem, ListItemText, Badge } from '@mui/material';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import { SuperAdminLayout } from '../../components/superadmin/SuperAdminLayout';
import PageHeader from '../../components/superadmin/PageHeader';
import SaasCard from '../../components/superadmin/SaasCard';
import SaasHeroBanner from '../../components/superadmin/SaasHeroBanner';
import {
  RevenueChart, TenantGrowthChart, PlanDistributionChart, OrderVolumeChart,
} from '../../components/superadmin/SuperAdminCharts';
import SuperAdminAlertsCard from '../../components/superadmin/SuperAdminAlertsCard';
import { saas } from '../../components/superadmin/superAdminTokens';
import { superAdminApi } from '../../services/superAdminApi';
import { useSuperAdminSocket } from '../../hooks/useSuperAdminSocket';

export default function SuperAdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liveBadge, setLiveBadge] = useState(0);

  const load = useCallback(() => {
    setError('');
    superAdminApi
      .get('/analytics/dashboard')
      .then((res: any) => setData(res.data))
      .catch((err: any) => {
        setError(err?.response?.data?.message || err?.message || 'Failed to load dashboard');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  useSuperAdminSocket(() => {
    load();
    setLiveBadge((n) => n + 1);
  });

  const m = data?.metrics || {};
  const charts = data?.charts || {};

  if (loading && !data) {
    return (
      <SuperAdminLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={320}>
          <CircularProgress />
        </Box>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <PageHeader
        title="Platform overview"
        subtitle="Monitor restaurant tenants, revenue, and platform activity across your network."
        action={
          liveBadge > 0 ? (
            <Badge badgeContent={liveBadge} color="error">
              <Chip label="Live updates" size="small" color="success" variant="outlined" />
            </Badge>
          ) : undefined
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={<Chip label="Retry" size="small" onClick={load} clickable />}>
          {error}
        </Alert>
      )}

      <SaasHeroBanner
        badgeIcon={<DashboardOutlinedIcon sx={{ fontSize: 18 }} />}
        badgeLabel="Platform overview"
        headline={String(m.totalTenants ?? 0)}
        description="Restaurants on your network — monitor growth, revenue, and daily order volume from one place."
        highlight={{ label: 'MRR (PKR)', value: m.mrr != null ? `PKR ${Number(m.mrr).toLocaleString()}` : '—' }}
        trend={
          m.tenantGrowthPercent != null
            ? {
                label: `${m.tenantGrowthPercent >= 0 ? '+' : ''}${m.tenantGrowthPercent}% tenant growth`,
                positive: (m.tenantGrowthPercent ?? 0) >= 0,
              }
            : undefined
        }
        stats={[
          { label: 'Active', value: m.activeTenants ?? 0, accent: '#4CAF50' },
          { label: 'On trial', value: m.trialTenants ?? 0, accent: '#FF9800' },
          { label: 'Orders today', value: m.totalOrdersToday ?? 0, accent: '#2196F3' },
          { label: 'New (7d)', value: m.newSignupsThisWeek ?? 0, accent: saas.colors.primary },
        ]}
      />

      <Grid container spacing={2.5} mb={3} sx={{ width: '100%' }}>
        <Grid size={{ xs: 12, lg: 8 }}><RevenueChart data={charts.revenueByMonth || []} /></Grid>
        <Grid size={{ xs: 12, lg: 4 }}><PlanDistributionChart data={charts.planDistribution || []} /></Grid>
        <Grid size={{ xs: 12, md: 6 }}><TenantGrowthChart data={charts.tenantGrowthChart || []} /></Grid>
        <Grid size={{ xs: 12, md: 6 }}><OrderVolumeChart data={charts.orderVolumeByDay || []} /></Grid>
      </Grid>

      <Grid container spacing={2.5} sx={{ width: '100%' }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <SaasCard title="Recent activity" subtitle="Latest actions across all restaurants">
            <List dense disablePadding>
              {(data?.recentActivity || []).map((a: any) => (
                <ListItem key={a._id} divider sx={{ px: 0 }}>
                  <ListItemText
                    primary={a.action}
                    secondary={`${a.tenantId?.name || '—'} · ${new Date(a.createdAt).toLocaleString()}`}
                    primaryTypographyProps={{ fontWeight: 500, fontSize: 14 }}
                  />
                </ListItem>
              ))}
              {!data?.recentActivity?.length && (
                <ListItem sx={{ px: 0 }}>
                  <ListItemText secondary="No recent activity" />
                </ListItem>
              )}
            </List>
          </SaasCard>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <SuperAdminAlertsCard alerts={data?.alerts} />
        </Grid>
      </Grid>
    </SuperAdminLayout>
  );
}
