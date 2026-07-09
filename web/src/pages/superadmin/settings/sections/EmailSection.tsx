import { useState } from 'react';
import {
  Alert, Box, Button, FormControl, FormControlLabel, InputLabel, MenuItem, Select,
  Switch, TextField, Typography, CircularProgress,
} from '@mui/material';
import { SettingsGroup, SettingsRow } from '../../../../components/superadmin/SettingsLayout';
import { saasTextFieldSx } from '../../../../components/superadmin/superAdminFormStyles';
import { useSectionDraft } from '../SettingsContext';
import SectionFooter from '../components/SectionFooter';
import SecretField from '../components/SecretField';
import { superAdminApi } from '../../../../services/superAdminApi';

const TRIGGERS: { key: string; label: string }[] = [
  { key: 'newTenantSignedUp', label: 'New tenant signed up' },
  { key: 'trialExpiring3Days', label: 'Tenant trial expiring (3 days before)' },
  { key: 'trialExpired', label: 'Tenant trial expired' },
  { key: 'paymentFailed', label: 'Tenant payment failed' },
  { key: 'subscriptionRenewed', label: 'Tenant subscription renewed' },
  { key: 'tenantSuspended', label: 'Tenant account suspended' },
  { key: 'supportTicketHigh', label: 'New support ticket (HIGH/URGENT)' },
  { key: 'supportTicketUnresolved24h', label: 'Support ticket unresolved 24h' },
  { key: 'tenantNearOrderLimit', label: 'Tenant near order limit (80%)' },
  { key: 'planChanged', label: 'New plan upgrade/downgrade' },
];

export default function EmailSection() {
  const { data, setField } = useSectionDraft('email');
  const triggers = (data.triggers || {}) as Record<string, boolean>;
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const setTrigger = (key: string, value: boolean) => {
    setField('triggers', { ...triggers, [key]: value });
  };

  const testEmail = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res: any = await superAdminApi.post('/settings/test-email', {});
      setTestResult({ ok: true, message: res.message || 'Test email sent' });
    } catch (e: unknown) {
      setTestResult({ ok: false, message: e instanceof Error ? e.message : 'Test failed' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <SettingsGroup title="SMTP configuration" description="How the platform sends transactional emails.">
        <SettingsRow label="SMTP provider">
          <FormControl fullWidth size="small" sx={saasTextFieldSx}>
            <InputLabel shrink>Provider</InputLabel>
            <Select notched label="Provider" value={data.smtpProvider || 'sendgrid'} onChange={(e) => setField('smtpProvider', e.target.value)}>
              <MenuItem value="sendgrid">SendGrid</MenuItem>
              <MenuItem value="mailgun">Mailgun</MenuItem>
              <MenuItem value="custom">Custom SMTP</MenuItem>
            </Select>
          </FormControl>
        </SettingsRow>
        <SettingsRow label="SMTP host">
          <TextField size="small" fullWidth value={data.smtpHost || ''} onChange={(e) => setField('smtpHost', e.target.value)} sx={saasTextFieldSx} />
        </SettingsRow>
        <SettingsRow label="SMTP port">
          <TextField size="small" fullWidth type="number" value={data.smtpPort ?? 587} onChange={(e) => setField('smtpPort', Number(e.target.value))} sx={saasTextFieldSx} />
        </SettingsRow>
        <SettingsRow label="SMTP username">
          <TextField size="small" fullWidth value={data.smtpUsername || ''} onChange={(e) => setField('smtpUsername', e.target.value)} sx={saasTextFieldSx} />
        </SettingsRow>
        <SettingsRow label="SMTP password">
          <SecretField label="Password" configured={Boolean(data.smtpPasswordConfigured)} value={(data.smtpPassword as string) || ''} onChange={(v) => setField('smtpPassword', v)} />
        </SettingsRow>
        <SettingsRow label="Encryption">
          <FormControl fullWidth size="small" sx={saasTextFieldSx}>
            <InputLabel shrink>Encryption</InputLabel>
            <Select notched label="Encryption" value={data.smtpEncryption || 'TLS'} onChange={(e) => setField('smtpEncryption', e.target.value)}>
              <MenuItem value="TLS">TLS</MenuItem>
              <MenuItem value="SSL">SSL</MenuItem>
              <MenuItem value="none">None</MenuItem>
            </Select>
          </FormControl>
        </SettingsRow>
        <SettingsRow label="From name">
          <TextField size="small" fullWidth value={data.fromName || ''} onChange={(e) => setField('fromName', e.target.value)} sx={saasTextFieldSx} />
        </SettingsRow>
        <SettingsRow label="From email">
          <TextField size="small" fullWidth type="email" value={data.fromEmail || ''} onChange={(e) => setField('fromEmail', e.target.value)} sx={saasTextFieldSx} />
        </SettingsRow>
        <SettingsRow label="Reply-to email">
          <TextField size="small" fullWidth type="email" value={data.replyToEmail || ''} onChange={(e) => setField('replyToEmail', e.target.value)} sx={saasTextFieldSx} />
        </SettingsRow>
        <SettingsRow label="Test connection">
          <Box>
            <Button variant="outlined" onClick={() => void testEmail()} disabled={testing}>
              {testing ? <CircularProgress size={18} /> : 'Send test email'}
            </Button>
            {testResult && (
              <Alert severity={testResult.ok ? 'success' : 'error'} sx={{ mt: 1.5 }}>
                {testResult.message}
              </Alert>
            )}
          </Box>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Email notification triggers" description="Toggle which events send emails.">
        {TRIGGERS.map((t) => (
          <SettingsRow key={t.key} label={t.label}>
            <FormControlLabel control={<Switch checked={triggers[t.key] !== false} onChange={(e) => setTrigger(t.key, e.target.checked)} />} label="" />
          </SettingsRow>
        ))}
      </SettingsGroup>

      <SettingsGroup title="Internal notifications">
        <SettingsRow label="Browser push notifications">
          <FormControlLabel control={<Switch checked={Boolean(data.pushNotifications)} onChange={(e) => setField('pushNotifications', e.target.checked)} />} label="" />
        </SettingsRow>
        <SettingsRow label="Notification sound">
          <FormControlLabel control={<Switch checked={Boolean(data.notificationSound)} onChange={(e) => setField('notificationSound', e.target.checked)} />} label="" />
        </SettingsRow>
        <SettingsRow label="Critical alert email">
          <TextField size="small" fullWidth type="email" value={data.alertEmail || ''} onChange={(e) => setField('alertEmail', e.target.value)} sx={saasTextFieldSx} />
        </SettingsRow>
      </SettingsGroup>

      <SectionFooter saveKey="email" />
    </>
  );
}
