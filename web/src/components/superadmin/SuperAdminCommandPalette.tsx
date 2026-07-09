import { useCallback, useEffect, useState } from 'react';
import {
  Dialog, DialogContent, TextField, List, ListItemButton, ListItemText,
  Typography, Box, Chip, InputAdornment, alpha,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { superAdminApi } from '../../services/superAdminApi';
import { saas } from './superAdminTokens';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SuperAdminCommandPalette({ open, onClose }: Props) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any>(null);
  const navigate = useNavigate();

  const search = useCallback(() => {
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }
    superAdminApi.get('/search', { q: q.trim() }).then((res: any) => setResults(res.data));
  }, [q]);

  useEffect(() => {
    const t = setTimeout(search, 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!open) setQ('');
  }, [open]);

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  const hasResults = results && (
    results.tenants?.length || results.tickets?.length ||
    results.subscriptions?.length || results.admins?.length
  );

  const section = (title: string, items: { label: string; sub?: string; path: string }[]) =>
    items?.length ? (
      <Box key={title}>
        <Typography variant="overline" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary', fontWeight: 700 }}>
          {title}
        </Typography>
        <List dense disablePadding>
          {items.map((item) => (
            <ListItemButton key={item.path + item.label} onClick={() => go(item.path)} sx={{ py: 1.25 }}>
              <ListItemText primary={item.label} secondary={item.sub} primaryTypographyProps={{ fontWeight: 500 }} />
            </ListItemButton>
          ))}
        </List>
      </Box>
    ) : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          mt: 8,
          alignSelf: 'flex-start',
          borderRadius: `${saas.radius.lg}px`,
          border: `1px solid ${saas.colors.cardBorder}`,
          overflow: 'hidden',
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <TextField
          fullWidth
          autoFocus
          placeholder="Search restaurants, tickets, subscriptions…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: q.length > 0 ? (
              <InputAdornment position="end">
                <Chip label="↵" size="small" variant="outlined" sx={{ height: 22 }} />
              </InputAdornment>
            ) : undefined,
            sx: { px: 2, py: 1.5, fontSize: 16 },
          }}
          variant="standard"
          InputLabelProps={{ shrink: true }}
          sx={{ '& .MuiInput-underline:before': { borderBottom: `1px solid ${saas.colors.cardBorder}` } }}
        />
        <Box sx={{ maxHeight: 360, overflow: 'auto', py: 1 }}>
          {!q.trim() && (
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="body2" color="text.secondary" mb={1.5}>
                Quick jump
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={0.75}>
                {[
                  { label: 'Dashboard', path: '/superadmin/dashboard' },
                  { label: 'Tenants', path: '/superadmin/tenants' },
                  { label: 'Support', path: '/superadmin/support' },
                  { label: 'Settings', path: '/superadmin/settings' },
                ].map((item) => (
                  <Chip
                    key={item.path}
                    label={item.label}
                    size="small"
                    clickable
                    onClick={() => go(item.path)}
                    sx={{ fontWeight: 600 }}
                  />
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary" display="block" mt={2}>
                Or type 2+ characters to search tenants, tickets, subscriptions, and team.
              </Typography>
            </Box>
          )}
          {q.trim().length >= 2 && !hasResults && (
            <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 2 }}>
              No results for &ldquo;{q}&rdquo;
            </Typography>
          )}
          {hasResults && (
            <>
              {section('Restaurants', (results.tenants || []).map((t: any) => ({
                label: t.name,
                sub: t.ownerEmail,
                path: `/superadmin/tenants/${t._id}`,
              })))}
              {section('Support', (results.tickets || []).map((t: any) => ({
                label: t.subject,
                sub: t.status,
                path: `/superadmin/support/${t._id}`,
              })))}
              {section('Subscriptions', (results.subscriptions || []).map((s: any) => ({
                label: s.tenantId?.name || 'Subscription',
                sub: s.status,
                path: `/superadmin/subscriptions`,
              })))}
              {section('Team', (results.admins || []).map((a: any) => ({
                label: a.displayName || a.email,
                sub: a.role,
                path: `/superadmin/settings/team`,
              })))}
            </>
          )}
        </Box>
        <Box
          sx={{
            px: 2,
            py: 1,
            borderTop: `1px solid ${saas.colors.cardBorder}`,
            bgcolor: alpha(saas.colors.primary, 0.04),
            display: 'flex',
            gap: 1,
          }}
        >
          <Chip label="↑↓ navigate" size="small" variant="outlined" sx={{ height: 22, fontSize: 11 }} />
          <Chip label="↵ open" size="small" variant="outlined" sx={{ height: 22, fontSize: 11 }} />
          <Chip label="esc close" size="small" variant="outlined" sx={{ height: 22, fontSize: 11 }} />
        </Box>
      </DialogContent>
    </Dialog>
  );
}
