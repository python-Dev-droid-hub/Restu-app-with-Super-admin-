import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, Switch, TextField, Typography, alpha,
} from '@mui/material';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { SettingsGroup, SettingsRow } from '../../../../components/superadmin/SettingsLayout';
import { saasTextFieldSx } from '../../../../components/superadmin/superAdminFormStyles';
import { saas } from '../../../../components/superadmin/superAdminTokens';
import { useSectionDraft } from '../SettingsContext';
import SectionFooter from '../components/SectionFooter';
import { superAdminApi } from '../../../../services/superAdminApi';

export default function MaintenanceSection() {
  const { data, setField } = useSectionDraft('maintenance');
  const [info, setInfo] = useState<any>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    superAdminApi.get('/settings/system-info').then((r: any) => setInfo(r.data?.info));
  }, []);

  const toggleMaintenance = (checked: boolean) => {
    if (checked && !data.maintenanceMode) {
      if (!window.confirm('Enable maintenance mode? All tenant logins will be blocked.')) return;
    }
    setField('maintenanceMode', checked);
  };

  return (
    <>
      <SettingsGroup title="Maintenance mode" description="Control platform-wide availability for tenants.">
        {data.maintenanceMode && (
          <Alert severity="warning" icon={<WarningAmberOutlinedIcon />} sx={{ mb: 2 }}>
            Maintenance mode is ON — tenants cannot access their dashboards.
          </Alert>
        )}
        <Box
          sx={{
            p: 2.5,
            mb: 2,
            borderRadius: `${saas.radius.md}px`,
            border: `2px solid ${data.maintenanceMode ? alpha('#F44336', 0.5) : saas.colors.cardBorder}`,
            bgcolor: data.maintenanceMode ? alpha('#F44336', 0.06) : 'transparent',
          }}
        >
          <FormControlLabel
            control={<Switch color="error" size="medium" checked={Boolean(data.maintenanceMode)} onChange={(e) => toggleMaintenance(e.target.checked)} />}
            label={<Typography fontWeight={800}>Maintenance mode</Typography>}
          />
        </Box>
        <SettingsRow label="Maintenance message" alignTop>
          <TextField size="small" fullWidth multiline rows={3} value={data.maintenanceMessage || ''} onChange={(e) => setField('maintenanceMessage', e.target.value)} sx={saasTextFieldSx} />
        </SettingsRow>
        <SettingsRow label="Estimated duration">
          <TextField size="small" fullWidth placeholder="Back in 2 hours" value={data.estimatedDuration || ''} onChange={(e) => setField('estimatedDuration', e.target.value)} sx={saasTextFieldSx} />
        </SettingsRow>
        <SettingsRow label="Schedule enable at">
          <TextField size="small" fullWidth type="datetime-local" InputLabelProps={{ shrink: true }} value={data.scheduleEnableAt || ''} onChange={(e) => setField('scheduleEnableAt', e.target.value)} sx={saasTextFieldSx} />
        </SettingsRow>
        <SettingsRow label="Auto-disable at">
          <TextField size="small" fullWidth type="datetime-local" value={data.scheduleDisableAt || ''} onChange={(e) => setField('scheduleDisableAt', e.target.value)} sx={saasTextFieldSx} />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="System information" description="Read-only platform health.">
        {info && (
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={1.5}>
            {[
              ['Platform version', info.platformVersion],
              ['Node.js', info.nodeVersion],
              ['Database', info.databaseStatus],
              ['Environment', info.environment],
              ['Uptime', `${Math.floor((info.uptimeSeconds || 0) / 3600)}h`],
            ].map(([k, v]) => (
              <Box key={k} sx={{ p: 1.5, borderRadius: 1, border: `1px solid ${saas.colors.cardBorder}` }}>
                <Typography variant="caption" color="text.secondary">{k}</Typography>
                <Typography variant="body2" fontWeight={700}>{v}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </SettingsGroup>

      <SettingsGroup title="Cache management">
        <SettingsRow label="Clear all cache">
          <Button variant="outlined" color="warning" onClick={() => setConfirmOpen(true)}>Clear all cache</Button>
        </SettingsRow>
      </SettingsGroup>

      <SectionFooter saveKey="maintenance" />

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Danger zone</DialogTitle>
        <DialogContent>
          <Typography variant="body2" mb={2}>Type CONFIRM to clear all cache.</Typography>
          <TextField fullWidth value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={confirmText !== 'CONFIRM'}
            onClick={async () => {
              await superAdminApi.post('/settings/cache/clear', {});
              setConfirmOpen(false);
              setConfirmText('');
            }}
          >
            Clear cache
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
