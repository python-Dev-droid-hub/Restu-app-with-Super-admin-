import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import { SuperAdminLayout } from '../../components/superadmin/SuperAdminLayout';
import PageHeader from '../../components/superadmin/PageHeader';
import SaasCard from '../../components/superadmin/SaasCard';
import SaasHeroBanner from '../../components/superadmin/SaasHeroBanner';
import { saas } from '../../components/superadmin/superAdminTokens';
import { saasTextFieldSx } from '../../components/superadmin/superAdminFormStyles';
import { superAdminApi } from '../../services/superAdminApi';
import { useSuperAdminPlans } from '../../hooks/useSuperAdminPlans';

const emptyForm = {
  title: '',
  body: '',
  type: 'INFO',
  targetType: 'ALL',
  targetPlanId: '',
  targetTenantIds: [] as string[],
  targetCities: '',
  sendNow: true,
  scheduledAt: '',
  channels: { inApp: true, email: false },
};

const TYPE_LABELS: Record<string, string> = {
  INFO: 'Information',
  WARNING: 'Warning',
  MAINTENANCE: 'Maintenance',
  NEW_FEATURE: 'New feature',
};

const TYPE_COLORS: Record<string, 'info' | 'warning' | 'error' | 'success' | 'default'> = {
  INFO: 'info',
  WARNING: 'warning',
  MAINTENANCE: 'error',
  NEW_FEATURE: 'success',
};

const STATUS_LABELS: Record<string, string> = {
  SENT: 'Sent',
  SCHEDULED: 'Scheduled',
  DRAFT: 'Draft',
};

const STATUS_COLORS: Record<string, 'success' | 'info' | 'default'> = {
  SENT: 'success',
  SCHEDULED: 'info',
  DRAFT: 'default',
};

const TARGET_LABELS: Record<string, string> = {
  ALL: 'All tenants',
  PLAN: 'By plan',
  TENANTS: 'Specific tenants',
  CITIES: 'By city',
};

const QUICK_STATUS = ['', 'DRAFT', 'SCHEDULED', 'SENT'] as const;

function formatWhen(a: { sentAt?: string; scheduledAt?: string }) {
  const d = a.sentAt || a.scheduledAt;
  if (!d) return '—';
  return new Date(d).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SuperAdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const { plans } = useSuperAdminPlans();
  const [tenants, setTenants] = useState<any[]>([]);

  const load = () => {
    superAdminApi.get('/announcements').then((r: any) => setAnnouncements(r.data?.announcements || []));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    superAdminApi.get('/tenants', { limit: 200 }).then((r: any) => setTenants(r.data?.data || []));
  }, []);

  const metrics = useMemo(() => {
    const sent = announcements.filter((a) => a.status === 'SENT').length;
    const scheduled = announcements.filter((a) => a.status === 'SCHEDULED').length;
    const draft = announcements.filter((a) => a.status === 'DRAFT').length;
    return { total: announcements.length, sent, scheduled, draft };
  }, [announcements]);

  const filtered = useMemo(
    () => (statusFilter ? announcements.filter((a) => a.status === statusFilter) : announcements),
    [announcements, statusFilter]
  );

  const submit = async () => {
    const payload: Record<string, unknown> = {
      title: form.title,
      body: form.body,
      type: form.type,
      targetType: form.targetType,
      channels: form.channels,
      sendNow: form.sendNow && !form.scheduledAt,
    };
    if (form.targetType === 'PLAN') payload.targetPlanId = form.targetPlanId;
    if (form.targetType === 'TENANTS') payload.targetTenantIds = form.targetTenantIds;
    if (form.targetType === 'CITIES') {
      payload.targetCities = form.targetCities.split(',').map((c) => c.trim()).filter(Boolean);
    }
    if (form.scheduledAt && !form.sendNow) payload.scheduledAt = new Date(form.scheduledAt).toISOString();
    await superAdminApi.post('/announcements', payload);
    setOpen(false);
    setForm(emptyForm);
    load();
  };

  const sendDraft = async (id: string) => {
    await superAdminApi.post(`/announcements/${id}/send`);
    load();
  };

  const targetSummary = (a: any) => {
    if (a.targetType === 'PLAN' && a.targetPlanId) {
      const plan = plans.find((p) => String(p._id) === String(a.targetPlanId?.name ? a.targetPlanId : a.targetPlanId));
      return plan?.name ? `Plan: ${plan.name}` : TARGET_LABELS.PLAN;
    }
    if (a.targetType === 'TENANTS') return `Tenants (${a.targetTenantIds?.length || 0})`;
    if (a.targetType === 'CITIES' && a.targetCities?.length) return a.targetCities.join(', ');
    return TARGET_LABELS[a.targetType] || a.targetType;
  };

  return (
    <SuperAdminLayout>
      <PageHeader
        title="Announcements"
        subtitle="Broadcast platform updates, maintenance notices, and feature releases to restaurant tenants."
        breadcrumbs={[{ label: 'Platform', to: '/superadmin/dashboard' }, { label: 'Announcements' }]}
        action={
          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            New announcement
          </Button>
        }
      />

      <SaasHeroBanner
        badgeIcon={<CampaignOutlinedIcon sx={{ fontSize: 18 }} />}
        badgeLabel="Platform communications"
        headline={String(metrics.total)}
        description="Reach tenants via in-app notifications and email — schedule broadcasts or send immediately."
        highlight={{ label: 'Scheduled', value: String(metrics.scheduled) }}
        stats={[
          { label: 'Sent', value: metrics.sent, accent: '#4CAF50' },
          { label: 'Scheduled', value: metrics.scheduled, accent: '#2196F3' },
          { label: 'Drafts', value: metrics.draft, accent: '#FF9800' },
          { label: 'Total', value: metrics.total, accent: saas.colors.primary },
        ]}
      />

      <SaasCard
        title="All announcements"
        subtitle={`${filtered.length} item${filtered.length !== 1 ? 's' : ''}${statusFilter ? ` · ${STATUS_LABELS[statusFilter]}` : ''}`}
        action={
          statusFilter ? (
            <Button size="small" onClick={() => setStatusFilter('')}>Clear filter</Button>
          ) : undefined
        }
        noPadding
      >
        <Box sx={{ px: 2.5, pt: 2, pb: 1.5, borderBottom: `1px solid ${saas.colors.cardBorder}` }}>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {QUICK_STATUS.map((s) => (
              <Chip
                key={s || 'all'}
                label={s ? STATUS_LABELS[s] : 'All'}
                size="small"
                clickable
                variant={statusFilter === s ? 'filled' : 'outlined'}
                color={statusFilter === s ? 'primary' : 'default'}
                onClick={() => setStatusFilter(s)}
              />
            ))}
          </Box>
        </Box>

        {filtered.length === 0 ? (
          <Box textAlign="center" py={6} px={3}>
            <NotificationsActiveOutlinedIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" fontWeight={700} mb={1}>
              {statusFilter ? 'No announcements in this status' : 'No announcements yet'}
            </Typography>
            <Typography color="text.secondary" mb={3} maxWidth={400} mx="auto">
              {statusFilter
                ? 'Try another filter or create a new broadcast.'
                : 'Create your first announcement to notify tenants about updates, maintenance, or new features.'}
            </Typography>
            <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
              Create announcement
            </Button>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(saas.colors.primary, 0.04) }}>
                  <TableCell sx={{ fontWeight: 700, color: saas.colors.textMuted }}>Title</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: saas.colors.textMuted }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: saas.colors.textMuted }}>Audience</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: saas.colors.textMuted }}>Channels</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: saas.colors.textMuted }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: saas.colors.textMuted }}>Scheduled / sent</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: saas.colors.textMuted }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a._id} hover>
                    <TableCell>
                      <Typography fontWeight={700}>{a.title}</Typography>
                      {a.body && (
                        <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ maxWidth: 280 }}>
                          {a.body}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={TYPE_LABELS[a.type] || a.type}
                        color={TYPE_COLORS[a.type] || 'default'}
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{targetSummary(a)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={0.5} flexWrap="wrap">
                        {a.channels?.inApp !== false && <Chip label="In-app" size="small" variant="outlined" />}
                        {a.channels?.email && <Chip label="Email" size="small" variant="outlined" color="primary" />}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={STATUS_LABELS[a.status] || a.status}
                        color={STATUS_COLORS[a.status] || 'default'}
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatWhen(a)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      {a.status !== 'SENT' && (
                        <Tooltip title="Send now">
                          <IconButton size="small" color="primary" onClick={() => sendDraft(a._id)}>
                            <SendOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </SaasCard>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>New announcement</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" color="text.secondary" mt={1} mb={1.5}>
            Message content
          </Typography>
          <TextField
            fullWidth
            label="Title"
            sx={{ mb: 2, ...saasTextFieldSx }}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Body"
            sx={{ mb: 2, ...saasTextFieldSx }}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
          <FormControl fullWidth sx={{ mb: 2, ...saasTextFieldSx }}>
            <InputLabel shrink>Type</InputLabel>
            <Select label="Type" notched value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" color="text.secondary" mb={1.5}>
            Audience
          </Typography>
          <FormControl fullWidth sx={{ mb: 2, ...saasTextFieldSx }}>
            <InputLabel shrink>Target</InputLabel>
            <Select label="Target" notched value={form.targetType} onChange={(e) => setForm({ ...form, targetType: e.target.value })}>
              {Object.entries(TARGET_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {form.targetType === 'PLAN' && (
            <FormControl fullWidth sx={{ mb: 2, ...saasTextFieldSx }}>
              <InputLabel shrink>Plan</InputLabel>
              <Select label="Plan" notched value={form.targetPlanId} onChange={(e) => setForm({ ...form, targetPlanId: e.target.value })}>
                {plans.map((p) => (
                  <MenuItem key={String(p._id)} value={String(p._id)}>{p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {form.targetType === 'TENANTS' && (
            <FormControl fullWidth sx={{ mb: 2, ...saasTextFieldSx }}>
              <InputLabel shrink>Tenants</InputLabel>
              <Select
                multiple
                label="Tenants"
                notched
                value={form.targetTenantIds}
                onChange={(e) => setForm({ ...form, targetTenantIds: e.target.value as string[] })}
                renderValue={(selected) =>
                  tenants.filter((t) => selected.includes(t._id)).map((t) => t.name).join(', ') || 'Select tenants'
                }
              >
                {tenants.map((t) => (
                  <MenuItem key={t._id} value={t._id}>{t.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {form.targetType === 'CITIES' && (
            <TextField
              fullWidth
              label="Cities (comma-separated)"
              sx={{ mb: 2, ...saasTextFieldSx }}
              value={form.targetCities}
              onChange={(e) => setForm({ ...form, targetCities: e.target.value })}
            />
          )}

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" color="text.secondary" mb={1.5}>
            Delivery
          </Typography>
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid size={12}>
              <TextField
                fullWidth
                type="datetime-local"
                label="Schedule for later"
                InputLabelProps={{ shrink: true }}
                sx={saasTextFieldSx}
                value={form.scheduledAt}
                onChange={(e) => setForm({ ...form, scheduledAt: e.target.value, sendNow: !e.target.value })}
              />
            </Grid>
          </Grid>
          <FormControlLabel
            control={<Switch checked={form.channels.inApp} onChange={(e) => setForm({ ...form, channels: { ...form.channels, inApp: e.target.checked } })} />}
            label="In-app notification"
          />
          <FormControlLabel
            control={<Switch checked={form.channels.email} onChange={(e) => setForm({ ...form, channels: { ...form.channels, email: e.target.checked } })} />}
            label="Email notification"
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.sendNow && !form.scheduledAt}
                onChange={(e) => setForm({ ...form, sendNow: e.target.checked, scheduledAt: e.target.checked ? '' : form.scheduledAt })}
              />
            }
            label="Send immediately on save"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={submit} disabled={!form.title || !form.body}>
            {form.sendNow && !form.scheduledAt ? 'Save & send' : 'Save announcement'}
          </Button>
        </DialogActions>
      </Dialog>
    </SuperAdminLayout>
  );
}
