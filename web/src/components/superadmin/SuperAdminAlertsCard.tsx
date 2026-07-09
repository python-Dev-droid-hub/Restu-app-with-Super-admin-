import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Chip,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  alpha,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SaasCard from './SaasCard';
import { saas } from './superAdminTokens';

type AlertSeverity = 'error' | 'warning' | 'info' | 'success';

interface DashboardAlert {
  id: string;
  label: string;
  detail?: string;
  severity: AlertSeverity;
  href?: string;
}

interface AlertsPayload {
  trialExpiringSoon?: Array<{ _id: string; name: string; trialEndsAt?: string }>;
  pastDueTenants?: Array<{ _id: string; name: string }>;
  suspendedTenants?: Array<{ _id: string; name: string }>;
  urgentTickets?: Array<{ _id: string; subject?: string; tenantId?: { name?: string; _id?: string } }>;
  orderLimitAlerts?: Array<{ _id: string; name: string; usage: number; limit: number; exceeded?: boolean }>;
  newSignupsLast24h?: Array<{ _id: string; name: string; createdAt?: string }>;
}

function buildAlerts(alerts?: AlertsPayload): DashboardAlert[] {
  if (!alerts) return [];

  const items: DashboardAlert[] = [];

  (alerts.pastDueTenants || []).forEach((t) => {
    items.push({
      id: `past-due-${t._id}`,
      label: `Past due: ${t.name}`,
      detail: 'Payment overdue — follow up on billing',
      severity: 'error',
      href: `/superadmin/tenants/${t._id}`,
    });
  });

  (alerts.suspendedTenants || []).forEach((t) => {
    items.push({
      id: `suspended-${t._id}`,
      label: `Suspended: ${t.name}`,
      detail: 'Tenant account is suspended',
      severity: 'error',
      href: `/superadmin/tenants/${t._id}`,
    });
  });

  (alerts.orderLimitAlerts || []).forEach((t) => {
    items.push({
      id: `orders-${t._id}`,
      label: t.exceeded ? `Order limit hit: ${t.name}` : `Near order limit: ${t.name}`,
      detail: `${t.usage} / ${t.limit} orders this month`,
      severity: t.exceeded ? 'error' : 'warning',
      href: `/superadmin/tenants/${t._id}`,
    });
  });

  (alerts.trialExpiringSoon || []).forEach((t) => {
    const ends = t.trialEndsAt ? new Date(t.trialEndsAt).toLocaleDateString() : 'soon';
    items.push({
      id: `trial-${t._id}`,
      label: `Trial ending: ${t.name}`,
      detail: `Expires ${ends}`,
      severity: 'warning',
      href: `/superadmin/tenants/${t._id}`,
    });
  });

  (alerts.urgentTickets || []).forEach((t) => {
    const tenantName = t.tenantId?.name || 'Tenant';
    items.push({
      id: `ticket-${t._id}`,
      label: `Support: ${t.subject || 'Urgent ticket'}`,
      detail: tenantName,
      severity: 'warning',
      href: `/superadmin/support/${t._id}`,
    });
  });

  (alerts.newSignupsLast24h || []).forEach((t) => {
    items.push({
      id: `signup-${t._id}`,
      label: `New signup: ${t.name}`,
      detail: t.createdAt ? new Date(t.createdAt).toLocaleString() : 'Last 24 hours',
      severity: 'info',
      href: `/superadmin/tenants/${t._id}`,
    });
  });

  const severityRank: Record<AlertSeverity, number> = { error: 0, warning: 1, info: 2, success: 3 };
  return items.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}

export default function SuperAdminAlertsCard({ alerts }: { alerts?: AlertsPayload }) {
  const navigate = useNavigate();
  const items = useMemo(() => buildAlerts(alerts), [alerts]);
  const hasAlerts = items.length > 0;

  return (
    <SaasCard
      title="Alerts"
      subtitle={hasAlerts ? `${items.length} item${items.length === 1 ? '' : 's'} needing attention` : 'Platform health'}
      action={
        hasAlerts ? (
          <Chip label={String(items.length)} size="small" color="warning" sx={{ fontWeight: 700, minWidth: 28 }} />
        ) : (
          <Chip label="All clear" size="small" color="success" variant="outlined" />
        )
      }
    >
      {hasAlerts ? (
        <List dense disablePadding sx={{ mx: -0.5 }}>
          {items.map((alert) => (
            <ListItemButton
              key={alert.id}
              onClick={() => alert.href && navigate(alert.href)}
              sx={{
                borderRadius: 1.5,
                mb: 0.5,
                border: `1px solid ${saas.colors.cardBorder}`,
                bgcolor: alpha(
                  alert.severity === 'error' ? '#F44336' : alert.severity === 'warning' ? '#FF9800' : '#2196F3',
                  0.04
                ),
              }}
            >
              <ListItemText
                primary={alert.label}
                secondary={alert.detail}
                primaryTypographyProps={{ fontWeight: 600, fontSize: 13 }}
                secondaryTypographyProps={{ fontSize: 12 }}
              />
              <Chip
                label={alert.severity === 'error' ? 'Urgent' : alert.severity === 'warning' ? 'Review' : 'New'}
                size="small"
                color={alert.severity === 'error' ? 'error' : alert.severity === 'warning' ? 'warning' : 'info'}
                variant="outlined"
                sx={{ ml: 1, flexShrink: 0 }}
              />
            </ListItemButton>
          ))}
        </List>
      ) : (
        <Box
          sx={{
            py: 3.5,
            px: 2,
            textAlign: 'center',
            borderRadius: 1.5,
            bgcolor: alpha('#4CAF50', 0.06),
            border: `1px dashed ${alpha('#4CAF50', 0.35)}`,
          }}
        >
          <CheckCircleOutlineIcon sx={{ fontSize: 36, color: '#4CAF50', mb: 1 }} />
          <Typography variant="body2" fontWeight={600} color={saas.colors.textDark}>
            All clear
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
            No trials expiring, billing issues, or limits need attention.
          </Typography>
        </Box>
      )}
    </SaasCard>
  );
}
