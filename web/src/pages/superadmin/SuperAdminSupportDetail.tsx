import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Button, Chip, FormControl, InputLabel, MenuItem, Paper, Select,
  TextField, Typography, Divider, Checkbox, FormControlLabel,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { SuperAdminLayout } from '../../components/superadmin/SuperAdminLayout';
import { superAdminApi } from '../../services/superAdminApi';

export default function SuperAdminSupportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [reply, setReply] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [form, setForm] = useState({ tenantId: '', subject: '', description: '', priority: 'NORMAL', category: '' });
  const [admins, setAdmins] = useState<any[]>([]);

  const load = () => {
    if (!id || isNew) return;
    superAdminApi.get(`/support/${id}`).then((res: any) => {
      const d = res.data || res;
      setTicket(d.ticket);
      setMessages(d.messages || []);
    });
  };

  useEffect(() => {
    if (isNew) {
      superAdminApi.get('/tenants', { limit: 200 }).then((r: any) => setTenants(r.data?.data || []));
    } else {
      load();
      superAdminApi.get('/support/admins').then((r: any) => setAdmins(r.data?.admins || []));
    }
  }, [id, isNew]);

  const createTicket = async () => {
    await superAdminApi.post('/support', form);
    navigate('/superadmin/support');
  };

  const updateTicket = async (patch: Record<string, unknown>) => {
    await superAdminApi.patch(`/support/${id}`, patch);
    load();
  };

  const sendReply = async () => {
    if (!reply.trim()) return;
    await superAdminApi.post(`/support/${id}/reply`, { body: reply, isInternal });
    setReply('');
    load();
  };

  if (isNew) {
    return (
      <SuperAdminLayout>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/superadmin/support')} sx={{ mb: 2 }}>Back</Button>
        <Typography variant="h5" fontWeight={700} mb={3}>Create Support Ticket</Typography>
        <Paper sx={{ p: 3, maxWidth: 600 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Tenant</InputLabel>
            <Select label="Tenant" value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value })}>
              {tenants.map((t) => <MenuItem key={t._id} value={t._id}>{t.name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField fullWidth label="Subject" sx={{ mb: 2 }} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <TextField fullWidth multiline rows={4} label="Description" sx={{ mb: 2 }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Priority</InputLabel>
            <Select label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="contained" onClick={createTicket} disabled={!form.tenantId || !form.subject || !form.description}>Create</Button>
        </Paper>
      </SuperAdminLayout>
    );
  }

  if (!ticket) return <SuperAdminLayout><Typography>Loading...</Typography></SuperAdminLayout>;

  return (
    <SuperAdminLayout>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/superadmin/support')} sx={{ mb: 2 }}>Back</Button>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>{ticket.subject}</Typography>
          <Typography color="text.secondary">{ticket.tenantId?.name} · {ticket.tenantId?.ownerEmail}</Typography>
        </Box>
        <Box display="flex" gap={1} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={ticket.status} onChange={(e) => updateTicket({ status: e.target.value })}>
              {['OPEN', 'IN_PROGRESS', 'WAITING_REPLY', 'RESOLVED', 'CLOSED'].map((s) => (
                <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Assigned to</InputLabel>
            <Select
              label="Assigned to"
              value={ticket.assignedTo?._id || ticket.assignedTo || ''}
              onChange={(e) => updateTicket({ assignedTo: e.target.value || null })}
            >
              <MenuItem value="">Unassigned</MenuItem>
              {admins.map((a) => <MenuItem key={a._id} value={a._id}>{a.displayName || a.email}</MenuItem>)}
            </Select>
          </FormControl>
          <Chip label={ticket.priority} color={ticket.priority === 'URGENT' ? 'error' : 'default'} />
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>Original request</Typography>
        <Typography>{ticket.description}</Typography>
      </Paper>

      <Typography variant="h6" mb={1}>Conversation</Typography>
      {messages.map((m) => (
        <Paper key={m._id} sx={{ p: 2, mb: 1, bgcolor: m.isInternal ? '#fff8e1' : '#fff' }}>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="subtitle2">{m.authorName || m.authorType}{m.isInternal ? ' (internal)' : ''}</Typography>
            <Typography variant="caption">{new Date(m.createdAt).toLocaleString()}</Typography>
          </Box>
          <Typography sx={{ mt: 1 }}>{m.body}</Typography>
        </Paper>
      ))}

      <Divider sx={{ my: 2 }} />
      <TextField fullWidth multiline rows={3} label="Reply" value={reply} onChange={(e) => setReply(e.target.value)} sx={{ mb: 1 }} />
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <FormControlLabel control={<Checkbox checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />} label="Internal note" />
        <Button variant="contained" onClick={sendReply}>Send Reply</Button>
      </Box>
    </SuperAdminLayout>
  );
}
