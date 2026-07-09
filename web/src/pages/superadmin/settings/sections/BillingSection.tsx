import { useState } from 'react';
import {
  Alert, Box, Button, FormControl, FormControlLabel, InputLabel, MenuItem, Select,
  Switch, TextField, CircularProgress,
} from '@mui/material';
import { SettingsGroup, SettingsRow } from '../../../../components/superadmin/SettingsLayout';
import { saasTextFieldSx } from '../../../../components/superadmin/superAdminFormStyles';
import { useSectionDraft } from '../SettingsContext';
import SectionFooter from '../components/SectionFooter';
import SecretField from '../components/SecretField';
import { superAdminApi } from '../../../../services/superAdminApi';

export default function BillingSection() {
  const { data, setField } = useSectionDraft('billing');
  const gateway = (data.gateway as string) || 'manual';
  const [testing, setTesting] = useState(false);
  const [testOk, setTestOk] = useState<boolean | null>(null);

  const validate = async () => {
    setTesting(true);
    setTestOk(null);
    try {
      await superAdminApi.post('/settings/test-gateway', {});
      setTestOk(true);
    } catch {
      setTestOk(false);
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      {data.gatewayMode === 'test' && (
        <Alert severity="warning" sx={{ mb: 2 }}>Payment gateway is in test mode.</Alert>
      )}

      <SettingsGroup title="Payment gateway" description="How restaurants pay for subscriptions.">
        <SettingsRow label="Active gateway">
          <FormControl fullWidth size="small" sx={saasTextFieldSx}>
            <InputLabel shrink>Gateway</InputLabel>
            <Select notched label="Gateway" value={gateway} onChange={(e) => setField('gateway', e.target.value)}>
              <MenuItem value="stripe">Stripe</MenuItem>
              <MenuItem value="rozarpay">Rozarpay</MenuItem>
              <MenuItem value="jazzcash">JazzCash</MenuItem>
              <MenuItem value="easypaisa">EasyPaisa</MenuItem>
              <MenuItem value="bank">Bank transfer</MenuItem>
              <MenuItem value="manual">Manual</MenuItem>
            </Select>
          </FormControl>
        </SettingsRow>
        <SettingsRow label="Gateway mode">
          <FormControlLabel control={<Switch checked={data.gatewayMode === 'live'} onChange={(e) => setField('gatewayMode', e.target.checked ? 'live' : 'test')} />} label={data.gatewayMode === 'live' ? 'Live' : 'Test'} />
        </SettingsRow>

        {gateway === 'stripe' && (
          <>
            <SettingsRow label="Stripe publishable key">
              <TextField size="small" fullWidth value={data.stripePublishableKey || ''} onChange={(e) => setField('stripePublishableKey', e.target.value)} sx={saasTextFieldSx} />
            </SettingsRow>
            <SettingsRow label="Stripe secret key">
              <SecretField configured={Boolean(data.stripeSecretKeyConfigured)} value={(data.stripeSecretKey as string) || ''} onChange={(v) => setField('stripeSecretKey', v)} />
            </SettingsRow>
            <SettingsRow label="Stripe webhook secret">
              <SecretField configured={Boolean(data.stripeWebhookSecretConfigured)} value={(data.stripeWebhookSecret as string) || ''} onChange={(v) => setField('stripeWebhookSecret', v)} />
            </SettingsRow>
          </>
        )}

        {gateway === 'rozarpay' && (
          <>
            <SettingsRow label="Rozarpay key ID">
              <TextField size="small" fullWidth value={data.rozarpayKeyId || ''} onChange={(e) => setField('rozarpayKeyId', e.target.value)} sx={saasTextFieldSx} />
            </SettingsRow>
            <SettingsRow label="Rozarpay key secret">
              <SecretField configured={Boolean(data.rozarpayKeySecretConfigured)} value={(data.rozarpayKeySecret as string) || ''} onChange={(v) => setField('rozarpayKeySecret', v)} />
            </SettingsRow>
          </>
        )}

        {(gateway === 'bank' || gateway === 'manual') && (
          <>
            <SettingsRow label="Bank name"><TextField size="small" fullWidth value={data.bankName || ''} onChange={(e) => setField('bankName', e.target.value)} sx={saasTextFieldSx} /></SettingsRow>
            <SettingsRow label="Account title"><TextField size="small" fullWidth value={data.accountTitle || ''} onChange={(e) => setField('accountTitle', e.target.value)} sx={saasTextFieldSx} /></SettingsRow>
            <SettingsRow label="Account number"><TextField size="small" fullWidth value={data.accountNumber || ''} onChange={(e) => setField('accountNumber', e.target.value)} sx={saasTextFieldSx} /></SettingsRow>
            <SettingsRow label="IBAN"><TextField size="small" fullWidth value={data.iban || ''} onChange={(e) => setField('iban', e.target.value)} sx={saasTextFieldSx} /></SettingsRow>
            <SettingsRow label="Payment instructions" alignTop>
              <TextField size="small" fullWidth multiline rows={4} value={data.paymentInstructions || ''} onChange={(e) => setField('paymentInstructions', e.target.value)} sx={saasTextFieldSx} />
            </SettingsRow>
          </>
        )}

        <SettingsRow label="Validate keys">
          <Box>
            <Button variant="outlined" onClick={() => void validate()} disabled={testing}>
              {testing ? <CircularProgress size={18} /> : 'Validate keys'}
            </Button>
            {testOk === true && <Alert severity="success" sx={{ mt: 1 }}>Connected</Alert>}
            {testOk === false && <Alert severity="error" sx={{ mt: 1 }}>Validation failed</Alert>}
          </Box>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Billing rules">
        <SettingsRow label="Tax on subscriptions (%)">
          <TextField size="small" fullWidth type="number" value={data.taxPercent ?? 0} onChange={(e) => setField('taxPercent', Number(e.target.value))} sx={saasTextFieldSx} />
        </SettingsRow>
        <SettingsRow label="Invoice prefix">
          <TextField size="small" fullWidth value={data.invoicePrefix || 'INV-'} onChange={(e) => setField('invoicePrefix', e.target.value)} sx={saasTextFieldSx} />
        </SettingsRow>
        <SettingsRow label="Invoice starting number">
          <TextField size="small" fullWidth type="number" value={data.invoiceStartNumber ?? 1000} onChange={(e) => setField('invoiceStartNumber', Number(e.target.value))} sx={saasTextFieldSx} />
        </SettingsRow>
        <SettingsRow label="Auto-retry failed payments">
          <FormControlLabel control={<Switch checked={data.autoRetryFailed !== false} onChange={(e) => setField('autoRetryFailed', e.target.checked)} />} label="" />
        </SettingsRow>
        <SettingsRow label="Retry attempts">
          <TextField size="small" fullWidth type="number" value={data.retryAttempts ?? 3} onChange={(e) => setField('retryAttempts', Number(e.target.value))} sx={saasTextFieldSx} />
        </SettingsRow>
        <SettingsRow label="Retry interval (days)">
          <TextField size="small" fullWidth type="number" value={data.retryIntervalDays ?? 3} onChange={(e) => setField('retryIntervalDays', Number(e.target.value))} sx={saasTextFieldSx} />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Dunning management">
        <SettingsRow label="Day 1 after failure"><FormControlLabel control={<Switch checked={data.dunningDay1 !== false} onChange={(e) => setField('dunningDay1', e.target.checked)} />} label="Send payment failed email" /></SettingsRow>
        <SettingsRow label="Day 3 after failure"><FormControlLabel control={<Switch checked={data.dunningDay3 !== false} onChange={(e) => setField('dunningDay3', e.target.checked)} />} label="Send reminder" /></SettingsRow>
        <SettingsRow label="Day 7 after failure"><FormControlLabel control={<Switch checked={data.dunningDay7 !== false} onChange={(e) => setField('dunningDay7', e.target.checked)} />} label="Final warning" /></SettingsRow>
        <SettingsRow label="Day 10 after failure">
          <FormControl fullWidth size="small" sx={saasTextFieldSx}>
            <InputLabel shrink>Action</InputLabel>
            <Select notched label="Action" value={data.dunningDay10Action || 'suspend'} onChange={(e) => setField('dunningDay10Action', e.target.value)}>
              <MenuItem value="suspend">Suspend</MenuItem>
              <MenuItem value="downgrade">Downgrade</MenuItem>
              <MenuItem value="keep">Keep active</MenuItem>
            </Select>
          </FormControl>
        </SettingsRow>
      </SettingsGroup>

      <SectionFooter saveKey="billing" />
    </>
  );
}
