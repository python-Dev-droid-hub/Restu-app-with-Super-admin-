import { useEffect, useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Paper, Select, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Typography, Tab, Tabs,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { SuperAdminLayout } from '../../components/superadmin/SuperAdminLayout';
import { superAdminApi } from '../../services/superAdminApi';

export default function SuperAdminTeam() {
  const [tab, setTab] = useState(0);
  const [members, setMembers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id: '', displayName: '', role: 'SUPPORT_AGENT', password: '' });
  const [form, setForm] = useState({ email: '', password: '', displayName: '', role: 'SUPPORT_AGENT' });

  const load = () => {
    superAdminApi.get('/settings/team').then((r: any) => setMembers(r.data?.members || []));
    superAdminApi.get('/settings/team/login-logs', { limit: 50 }).then((r: any) => setLogs(r.data?.logs || []));
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    await superAdminApi.post('/settings/team', form);
    setOpen(false);
    setForm({ email: '', password: '', displayName: '', role: 'SUPPORT_AGENT' });
    load();
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
    <SuperAdminLayout>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h5" fontWeight={700}>Super Admin Team</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Add Member</Button>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Team Members" />
        <Tab label="Login History" />
      </Tabs>

      {tab === 0 && (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m._id}>
                  <TableCell>{m.displayName || '—'}</TableCell>
                  <TableCell>{m.email}</TableCell>
                  <TableCell><Chip size="small" label={m.role} /></TableCell>
                  <TableCell><Chip size="small" color={m.isActive ? 'success' : 'default'} label={m.isActive ? 'Active' : 'Inactive'} /></TableCell>
                  <TableCell>{m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleString() : '—'}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => startEdit(m)} sx={{ mr: 1 }}>Edit</Button>
                    <Button size="small" onClick={() => toggleActive(m._id, m.isActive)}>
                      {m.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {tab === 1 && (
        <Paper>
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
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Team Member</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Email" sx={{ mt: 1, mb: 2 }} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <TextField fullWidth label="Display Name" sx={{ mb: 2 }} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          <TextField fullWidth type="password" label="Password" sx={{ mb: 2 }} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {['SUPER_ADMIN', 'SUPPORT_AGENT', 'BILLING_MANAGER', 'ONBOARDING_AGENT'].map((r) => (
                <MenuItem key={r} value={r}>{r.replace('_', ' ')}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={create} disabled={!form.email || !form.password}>Create</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Team Member</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Display Name" sx={{ mt: 1, mb: 2 }} value={editForm.displayName}
            onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })} />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Role</InputLabel>
            <Select label="Role" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
              {['SUPER_ADMIN', 'SUPPORT_AGENT', 'BILLING_MANAGER', 'ONBOARDING_AGENT'].map((r) => (
                <MenuItem key={r} value={r}>{r.replace('_', ' ')}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField fullWidth type="password" label="New Password (optional)" value={editForm.password}
            onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveEdit}>Save</Button>
        </DialogActions>
      </Dialog>
    </SuperAdminLayout>
  );
}
