import { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Chip, Paper, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Typography, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, CircularProgress, Alert,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { api } from '../../services/api';
import { useAdminPageStyles } from '../../utils/adminResponsive';

const statusColor: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  OPEN: 'info', IN_PROGRESS: 'warning', WAITING_REPLY: 'default',
  RESOLVED: 'success', CLOSED: 'default',
};

function readApiError(res: any, fallback: string): string {
  return String(res?.error || res?.message || fallback);
}

export default function AdminSupport() {
  const theme = useTheme();
  const { page, header, headerActions, titleSx, primaryBtn } = useAdminPageStyles();
  const primary = theme.palette.primary.main;
  const primaryDark = theme.palette.primary.dark;

  const [tickets, setTickets] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState('');
  const [form, setForm] = useState({ subject: '', description: '', priority: 'NORMAL', category: '' });
  const [noTenant, setNoTenant] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    setNoTenant(false);

    api.get('/tenant/support').then((res: any) => {
      if (res?.success === false) {
        const msg = readApiError(res, 'Failed to load support tickets.');
        if (res?.statusCode === 403 && msg.toLowerCase().includes('tenant')) {
          setNoTenant(true);
          return;
        }
        if (msg.toLowerCase().includes('network error') || msg.toLowerCase().includes('server is running')) {
          setError('Cannot reach the API server. Start the backend on port 3101, then retry.');
          return;
        }
        setError(msg);
        return;
      }
      setTickets(res?.data?.tickets || []);
    }).catch((err: any) => {
      const msg = readApiError(err, 'Failed to load support tickets.');
      if (msg.toLowerCase().includes('tenant')) {
        setNoTenant(true);
      } else {
        setError(msg);
      }
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openTicket = async (id: string) => {
    const res: any = await api.get(`/tenant/support/${id}`);
    if (res?.success === false) {
      setError(readApiError(res, 'Failed to load ticket.'));
      return;
    }
    setSelected(res?.data?.ticket);
    setMessages(res?.data?.messages || []);
  };

  const createTicket = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res: any = await api.post('/tenant/support', form);
      if (res?.success === false) {
        setError(readApiError(res, 'Failed to create ticket.'));
        return;
      }
      setOpen(false);
      setForm({ subject: '', description: '', priority: 'NORMAL', category: '' });
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    const res: any = await api.post(`/tenant/support/${selected._id}/reply`, { body: reply });
    if (res?.success === false) {
      setError(readApiError(res, 'Failed to send reply.'));
      return;
    }
    setReply('');
    openTicket(selected._id);
    load();
  };

  if (loading) {
    return (
      <Box sx={{ ...page, display: 'flex', alignItems: 'center', gap: 2 }}>
        <CircularProgress size={24} sx={{ color: primary }} />
        <Typography color="text.secondary">Loading support tickets…</Typography>
      </Box>
    );
  }

  if (noTenant) {
    return (
      <Box sx={page}>
        <Alert severity="info">
          Platform support is available for SaaS tenant accounts. This account has no tenant linked.
        </Alert>
      </Box>
    );
  }

  if (error && !selected && tickets.length === 0) {
    return (
      <Box sx={page}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button variant="contained" onClick={load} sx={primaryBtn}>
          Retry
        </Button>
      </Box>
    );
  }

  if (selected) {
    return (
      <Box sx={page}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => { setSelected(null); setMessages([]); setError(null); }} sx={{ mb: 2 }}>
          Back to tickets
        </Button>
        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" fontWeight={700}>{selected.subject}</Typography>
          <Chip label={selected.status} color={statusColor[selected.status] || 'default'} />
        </Box>
        <Paper sx={{ p: 2, mb: 2 }}><Typography>{selected.description}</Typography></Paper>
        {messages.map((m) => (
          <Paper key={m._id} sx={{ p: 2, mb: 1 }}>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="subtitle2">{m.authorName || m.authorType}</Typography>
              <Typography variant="caption">{new Date(m.createdAt).toLocaleString()}</Typography>
            </Box>
            <Typography sx={{ mt: 1 }}>{m.body}</Typography>
          </Paper>
        ))}
        {!['RESOLVED', 'CLOSED'].includes(selected.status) && (
          <Box mt={2}>
            <TextField fullWidth multiline rows={3} label="Your reply" value={reply} onChange={(e) => setReply(e.target.value)} sx={{ mb: 1 }} />
            <Button variant="contained" onClick={sendReply} sx={primaryBtn}>Send Reply</Button>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ ...page, bgcolor: theme.palette.background.default, minHeight: '100vh' }}>
      <Box sx={header}>
        <Typography variant="h5" sx={titleSx}>Platform Support</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={primaryBtn}>
          New Ticket
        </Button>
      </Box>
      {error ? <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert> : null}
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Subject</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Updated</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tickets.map((t) => (
              <TableRow key={t._id} hover sx={{ cursor: 'pointer' }} onClick={() => openTicket(t._id)}>
                <TableCell>{t.subject}</TableCell>
                <TableCell><Chip size="small" label={t.status} color={statusColor[t.status] || 'default'} /></TableCell>
                <TableCell>{t.priority}</TableCell>
                <TableCell>{new Date(t.updatedAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
            {!tickets.length && <TableRow><TableCell colSpan={4} align="center">No support tickets yet — click &quot;New Ticket&quot; to contact platform support.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Contact Platform Support</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Subject" sx={{ mt: 1, mb: 2 }} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <TextField fullWidth multiline rows={4} label="Description" sx={{ mb: 2 }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Priority</InputLabel>
            <Select label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={createTicket}
            disabled={!form.subject || !form.description || submitting}
            sx={primaryBtn}
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
