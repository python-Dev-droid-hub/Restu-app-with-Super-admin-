import { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Chip, FormControl, InputLabel, MenuItem, Select,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, alpha,
} from '@mui/material';
import { superAdminApi } from '../../../../services/superAdminApi';
import { saasTextFieldSx } from '../../../../components/superadmin/superAdminFormStyles';
import { saas } from '../../../../components/superadmin/superAdminTokens';

const ACTION_COLORS: Record<string, string> = {
  TENANT_LAUNCHED: '#4CAF50',
  TENANT_SUSPENDED: '#F44336',
  IMPERSONATION_STARTED: '#E91E63',
  PLAN_CHANGED: '#FF9800',
};

export default function AuditSection() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(() => {
    superAdminApi.get('/activity', {
      search: search || undefined,
      action: action || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      limit: 50,
    }).then((r: any) => {
      setLogs(r.data?.data || r.data?.logs || []);
      setTotal(r.data?.pagination?.total ?? 0);
    });
  }, [search, action, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <Typography variant="subtitle1" fontWeight={800} mb={0.5}>Audit log</Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        {total} events in database · showing latest {logs.length}
      </Typography>

      <Box display="flex" flexWrap="wrap" gap={1.5} mb={2}>
        <TextField size="small" label="Search" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ ...saasTextFieldSx, minWidth: 180 }} />
        <TextField size="small" label="Action type" value={action} onChange={(e) => setAction(e.target.value)} sx={{ ...saasTextFieldSx, minWidth: 160 }} />
        <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} sx={saasTextFieldSx} />
        <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} sx={saasTextFieldSx} />
        <Button variant="contained" onClick={load}>Apply</Button>
      </Box>

      <Box sx={{ overflowX: 'auto', border: `1px solid ${saas.colors.cardBorder}`, borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(saas.colors.primary, 0.04) }}>
              <TableCell>Timestamp</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Tenant</TableCell>
              <TableCell>Actor</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log._id} hover>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleString()}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={log.action?.replace(/_/g, ' ')}
                    sx={{
                      fontWeight: 600,
                      bgcolor: alpha(ACTION_COLORS[log.action] || saas.colors.textMuted, 0.12),
                      color: ACTION_COLORS[log.action] || saas.colors.textMuted,
                    }}
                  />
                </TableCell>
                <TableCell>{log.description || '—'}</TableCell>
                <TableCell>{log.tenantId?.name || '—'}</TableCell>
                <TableCell>{log.performedByType?.replace(/_/g, ' ') || '—'}</TableCell>
              </TableRow>
            ))}
            {!logs.length && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No activity found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
    </>
  );
}
