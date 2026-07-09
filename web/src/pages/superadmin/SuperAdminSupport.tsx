import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Chip, FormControl, InputLabel, MenuItem, Select,
  Table, TableBody, TableCell, TableHead, TableRow, TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined';
import { SuperAdminLayout } from '../../components/superadmin/SuperAdminLayout';
import PageHeader from '../../components/superadmin/PageHeader';
import SaasCard from '../../components/superadmin/SaasCard';
import SaasHeroBanner from '../../components/superadmin/SaasHeroBanner';
import { saas } from '../../components/superadmin/superAdminTokens';
import { saasTextFieldSx } from '../../components/superadmin/superAdminFormStyles';
import { superAdminApi } from '../../services/superAdminApi';

const statusColor: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  OPEN: 'info', IN_PROGRESS: 'warning', WAITING_REPLY: 'default',
  RESOLVED: 'success', CLOSED: 'default',
};

const priorityColor: Record<string, 'error' | 'warning' | 'default'> = {
  URGENT: 'error', HIGH: 'warning', NORMAL: 'default', LOW: 'default',
};

export default function SuperAdminSupport() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [stats, setStats] = useState({ openCount: 0, inProgressCount: 0, resolvedToday: 0 });
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const load = useCallback(() => {
    superAdminApi.get('/support', {
      status: status || undefined,
      priority: priority || undefined,
      search: search || undefined,
    }).then((res: any) => {
      const d = res.data || res;
      setTickets(d.tickets || []);
      setStats(d.stats || { openCount: 0, inProgressCount: 0, resolvedToday: 0 });
    });
  }, [status, priority, search]);

  useEffect(() => { load(); }, [load]);

  const totalOpen = stats.openCount + stats.inProgressCount;

  return (
    <SuperAdminLayout>
      <PageHeader
        title="Support tickets"
        subtitle="Manage tenant support requests, priorities, and resolution workflows."
        breadcrumbs={[{ label: 'Platform', to: '/superadmin/dashboard' }, { label: 'Support' }]}
        action={
          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => navigate('/superadmin/support/new')}>
            New ticket
          </Button>
        }
      />

      <SaasHeroBanner
        badgeIcon={<SupportAgentOutlinedIcon sx={{ fontSize: 18 }} />}
        badgeLabel="Customer support"
        headline={String(totalOpen)}
        description="Open and in-progress tickets requiring attention from your platform team."
        highlight={{ label: 'Resolved today', value: String(stats.resolvedToday) }}
        stats={[
          { label: 'Open', value: stats.openCount, accent: '#2196F3' },
          { label: 'In progress', value: stats.inProgressCount, accent: '#FF9800' },
          { label: 'Resolved today', value: stats.resolvedToday, accent: '#4CAF50' },
        ]}
      />

      <SaasCard title="Filters" subtitle="Search and narrow the ticket queue" noPadding>
        <Box sx={{ p: 2.5, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField size="small" label="Search" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ ...saasTextFieldSx, minWidth: 200 }} />
          <FormControl size="small" sx={{ minWidth: 140, ...saasTextFieldSx }}>
            <InputLabel shrink>Status</InputLabel>
            <Select label="Status" notched value={status} onChange={(e) => setStatus(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {['OPEN', 'IN_PROGRESS', 'WAITING_REPLY', 'RESOLVED', 'CLOSED'].map((s) => (
                <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140, ...saasTextFieldSx }}>
            <InputLabel shrink>Priority</InputLabel>
            <Select label="Priority" notched value={priority} onChange={(e) => setPriority(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {['URGENT', 'HIGH', 'NORMAL', 'LOW'].map((p) => (
                <MenuItem key={p} value={p}>{p}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" color="primary" onClick={load}>Apply</Button>
        </Box>
      </SaasCard>

      <Box sx={{ mt: 2.5 }}>
        <SaasCard title="Ticket queue" subtitle={`${tickets.length} ticket${tickets.length !== 1 ? 's' : ''}`} noPadding>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell>Subject</TableCell>
                  <TableCell>Tenant</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Updated</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tickets.map((t) => (
                  <TableRow key={t._id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/superadmin/support/${t._id}`)}>
                    <TableCell>{t.subject}</TableCell>
                    <TableCell>{t.tenantId?.name || '—'}</TableCell>
                    <TableCell><Chip label={t.status} size="small" color={statusColor[t.status] || 'default'} /></TableCell>
                    <TableCell><Chip label={t.priority} size="small" color={priorityColor[t.priority] || 'default'} variant="outlined" /></TableCell>
                    <TableCell>{new Date(t.updatedAt || t.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
                {!tickets.length && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No tickets match your filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </SaasCard>
      </Box>
    </SuperAdminLayout>
  );
}
