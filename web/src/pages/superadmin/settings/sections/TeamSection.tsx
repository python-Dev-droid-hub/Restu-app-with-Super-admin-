import { useEffect, useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Paper, Select, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Typography, Tab, Tabs,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { superAdminApi } from '../../../../services/superAdminApi';
import { saasTextFieldSx } from '../../../../components/superadmin/superAdminFormStyles';

const PERMISSIONS = [
  { feature: 'View all tenants', roles: [1, 1, 1, 1] },
  { feature: 'Launch new tenant', roles: [1, 0, 0, 1] },
  { feature: 'Suspend tenant', roles: [1, 1, 0, 0] },
  { feature: 'Delete tenant', roles: [1, 0, 0, 0] },
  { feature: 'Manage plans', roles: [1, 1, 0, 0] },
  { feature: 'View billing/revenue', roles: [1, 1, 0, 0] },
  { feature: 'Handle support tickets', roles: [1, 0, 1, 0] },
  { feature: 'Edit platform settings', roles: [1, 0, 0, 0] },
  { feature: 'Manage team members', roles: [1, 0, 0, 0] },
];
const ROLE_HEADERS = ['SUPER_ADMIN', 'BILLING_MANAGER', 'SUPPORT_AGENT', 'ONBOARDING_AGENT'];
const ROLES = ['SUPER_ADMIN', 'SUPPORT_AGENT', 'BILLING_MANAGER', 'ONBOARDING_AGENT'] as const;

export default function TeamSection() {
  const [tab, setTab] = useState(0);
  const [members, setMembers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', password: '', displayName: '', role: 'SUPPORT_AGENT' });
  const [editForm, setEditForm] = useState({ id: '', displayName: '', role: 'SUPPORT_AGENT', password: '' });

  const load = () => {
    superAdminApi.get('/settings/team').then((r: any) => setMembers(r.data?.members || []));
    superAdminApi.get('/settings/team/login-logs', { limit: 50 }).then((r: any) => setLogs(r.data?.logs || []));
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    setError('');
    try {
      await superAdminApi.post('/settings/team', form);
      setOpen(false);
      setForm({ email: '', password: '', displayName: '', role: 'SUPPORT_AGENT' });
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to create member');
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await superAdminApi.patch(`/settings/team/${id}`, { isActive: !isActive });
    load();
  };

  const startEdit = (m: any) => {
    setEditForm({ id: m._id, displayName: m.displayName || '', role: m.role, password: '' });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    const payload: Record<string, string> = {
      displayName: editForm.displayName,
      role: editForm.role,
    };
    if (editForm.password) payload.password = editForm.password;
    await superAdminApi.patch(`/settings/team/${editForm.id}`, payload);
    setEditOpen(false);
    setEditForm({ id: '', displayName: '', role: 'SUPPORT_AGENT', password: '' });
    load();
  };

  return (
    <>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle1" fontWeight={800}>Team members</Typography>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Add member</Button>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Members" />
        <Tab label="Login history" />
        <Tab label="Role permissions" />
      </Tabs>

      {tab === 0 && (
        <Paper variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last login</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m._id}>
                  <TableCell>{m.displayName || '—'}</TableCell>
                  <TableCell>{m.email}</TableCell>
                  <TableCell><Chip size="small" label={m.role?.replace(/_/g, ' ')} /></TableCell>
                  <TableCell><Chip size="small" color={m.isActive ? 'success' : 'default'} label={m.isActive ? 'Active' : 'Inactive'} /></TableCell>
                  <TableCell>{m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleString() : '—'}</TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => startEdit(m)} sx={{ mr: 0.5 }}>Edit</Button>
                    <Button size="small" onClick={() => void toggleActive(m._id, m.isActive)}>
                      {m.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!members.length && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>No team members yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {tab === 1 && (
        <Paper variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Result</TableCell>
                <TableCell>IP</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l._id}>
                  <TableCell>{new Date(l.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{l.email}</TableCell>
                  <TableCell><Chip size="small" color={l.success ? 'success' : 'error'} label={l.success ? 'OK' : 'Failed'} /></TableCell>
                  <TableCell>{l.ip || '—'}</TableCell>
                </TableRow>
              ))}
              {!logs.length && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>No login history</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {tab === 2 && (
        <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Feature</TableCell>
                {ROLE_HEADERS.map((r) => <TableCell key={r} align="center">{r.replace(/_/g, ' ')}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {PERMISSIONS.map((row) => (
                <TableRow key={row.feature}>
                  <TableCell>{row.feature}</TableCell>
                  {row.roles.map((ok, i) => (
                    <TableCell key={i} align="center">{ok ? '✓' : '—'}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add team member</DialogTitle>
        <DialogContent>
          {error && <Typography color="error" variant="body2" sx={{ mb: 1 }}>{error}</Typography>}
          <TextField fullWidth label="Email" sx={{ ...saasTextFieldSx, mt: 1, mb: 2 }} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <TextField fullWidth label="Display name" sx={{ ...saasTextFieldSx, mb: 2 }} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          <TextField fullWidth type="password" label="Password" sx={{ ...saasTextFieldSx, mb: 2 }} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <FormControl fullWidth sx={saasTextFieldSx}>
            <InputLabel>Role</InputLabel>
            <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => (
                <MenuItem key={r} value={r}>{r.replace(/_/g, ' ')}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void create()} disabled={!form.email || !form.password}>Create</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit team member</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Display name" sx={{ ...saasTextFieldSx, mt: 1, mb: 2 }} value={editForm.displayName}
            onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })} />
          <FormControl fullWidth sx={{ ...saasTextFieldSx, mb: 2 }}>
            <InputLabel>Role</InputLabel>
            <Select label="Role" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
              {ROLES.map((r) => (
                <MenuItem key={r} value={r}>{r.replace(/_/g, ' ')}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField fullWidth type="password" label="New password (optional)" sx={saasTextFieldSx} value={editForm.password}
            onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void saveEdit()}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
