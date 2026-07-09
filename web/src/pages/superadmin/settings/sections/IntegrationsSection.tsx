import { useState } from 'react';
import { Alert, Box, Button, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Switch, TextField, CircularProgress } from '@mui/material';
import { SettingsGroup, SettingsRow } from '../../../../components/superadmin/SettingsLayout';
import { saasTextFieldSx } from '../../../../components/superadmin/superAdminFormStyles';
import { useSectionDraft } from '../SettingsContext';
import SectionFooter from '../components/SectionFooter';
import SecretField from '../components/SecretField';
import { superAdminApi } from '../../../../services/superAdminApi';

export default function IntegrationsSection() {
  const { data, setField } = useSectionDraft('integrations');
  const [testing, setTesting] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, boolean>>({});

  const runTest = async (key: string, path: string) => {
    setTesting(key);
    try {
      await superAdminApi.post(path, {});
      setResult((r) => ({ ...r, [key]: true }));
    } catch {
      setResult((r) => ({ ...r, [key]: false }));
    } finally {
      setTesting(null);
    }
  };

  return (
    <>
      <SettingsGroup title="Tax / government">
        <SettingsRow label="FBR POS integration"><FormControlLabel control={<Switch checked={Boolean(data.fbrEnabled)} onChange={(e) => setField('fbrEnabled', e.target.checked)} />} label="" /></SettingsRow>
        <SettingsRow label="FBR API endpoint"><TextField size="small" fullWidth value={data.fbrApiEndpoint || ''} onChange={(e) => setField('fbrApiEndpoint', e.target.value)} sx={saasTextFieldSx} /></SettingsRow>
        <SettingsRow label="FBR API key"><SecretField configured={Boolean(data.fbrApiKeyConfigured)} value={(data.fbrApiKey as string) || ''} onChange={(v) => setField('fbrApiKey', v)} /></SettingsRow>
        <SettingsRow label="FBR environment">
          <FormControl fullWidth size="small" sx={saasTextFieldSx}>
            <InputLabel shrink>Environment</InputLabel>
            <Select notched label="Environment" value={data.fbrEnvironment || 'test'} onChange={(e) => setField('fbrEnvironment', e.target.value)}>
              <MenuItem value="test">Test</MenuItem>
              <MenuItem value="production">Production</MenuItem>
            </Select>
          </FormControl>
        </SettingsRow>
        <SettingsRow label="PRA / SRB / KPRA">
          <FormControlLabel control={<Switch checked={Boolean(data.praEnabled)} onChange={(e) => setField('praEnabled', e.target.checked)} />} label="PRA" />
          <FormControlLabel control={<Switch checked={Boolean(data.srbEnabled)} onChange={(e) => setField('srbEnabled', e.target.checked)} />} label="SRB" sx={{ ml: 2 }} />
          <FormControlLabel control={<Switch checked={Boolean(data.kpraEnabled)} onChange={(e) => setField('kpraEnabled', e.target.checked)} />} label="KPRA" sx={{ ml: 2 }} />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Maps">
        <SettingsRow label="Google Maps API key"><SecretField configured={Boolean(data.googleMapsApiKeyConfigured)} value={(data.googleMapsApiKey as string) || ''} onChange={(v) => setField('googleMapsApiKey', v)} /></SettingsRow>
        <SettingsRow label="Default region"><TextField size="small" fullWidth value={data.mapsDefaultRegion || 'PK'} onChange={(e) => setField('mapsDefaultRegion', e.target.value)} sx={saasTextFieldSx} /></SettingsRow>
        <SettingsRow label="Distance unit">
          <FormControl fullWidth size="small" sx={saasTextFieldSx}>
            <InputLabel shrink>Unit</InputLabel>
            <Select notched label="Unit" value={data.distanceUnit || 'km'} onChange={(e) => setField('distanceUnit', e.target.value)}>
              <MenuItem value="km">Kilometers</MenuItem>
              <MenuItem value="mi">Miles</MenuItem>
            </Select>
          </FormControl>
        </SettingsRow>
        <SettingsRow label="Test maps">
          <Box>
            <Button variant="outlined" disabled={testing === 'maps'} onClick={() => void runTest('maps', '/settings/test-maps')}>
              {testing === 'maps' ? <CircularProgress size={18} /> : 'Validate'}
            </Button>
            {result.maps === true && <Alert severity="success" sx={{ mt: 1 }}>Valid</Alert>}
            {result.maps === false && <Alert severity="error" sx={{ mt: 1 }}>Failed</Alert>}
          </Box>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Communication">
        <SettingsRow label="FCM server key"><SecretField configured={Boolean(data.fcmServerKeyConfigured)} value={(data.fcmServerKey as string) || ''} onChange={(v) => setField('fcmServerKey', v)} /></SettingsRow>
        <SettingsRow label="Test push">
          <Button variant="outlined" disabled={testing === 'push'} onClick={() => void runTest('push', '/settings/test-push')}>
            {testing === 'push' ? <CircularProgress size={18} /> : 'Test push'}
          </Button>
        </SettingsRow>
        <SettingsRow label="Twilio SMS"><FormControlLabel control={<Switch checked={Boolean(data.twilioEnabled)} onChange={(e) => setField('twilioEnabled', e.target.checked)} />} label="" /></SettingsRow>
        <SettingsRow label="Twilio account SID"><TextField size="small" fullWidth value={data.twilioAccountSid || ''} onChange={(e) => setField('twilioAccountSid', e.target.value)} sx={saasTextFieldSx} /></SettingsRow>
        <SettingsRow label="Twilio auth token"><SecretField configured={Boolean(data.twilioAuthTokenConfigured)} value={(data.twilioAuthToken as string) || ''} onChange={(v) => setField('twilioAuthToken', v)} /></SettingsRow>
        <SettingsRow label="From number"><TextField size="small" fullWidth value={data.twilioFromNumber || ''} onChange={(e) => setField('twilioFromNumber', e.target.value)} sx={saasTextFieldSx} /></SettingsRow>
        <SettingsRow label="Test SMS">
          <Button variant="outlined" disabled={testing === 'sms'} onClick={() => void runTest('sms', '/settings/test-sms')}>
            {testing === 'sms' ? <CircularProgress size={18} /> : 'Send test SMS'}
          </Button>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Storage & monitoring">
        <SettingsRow label="Storage provider">
          <FormControl fullWidth size="small" sx={saasTextFieldSx}>
            <InputLabel shrink>Provider</InputLabel>
            <Select notched label="Provider" value={data.storageProvider || 'local'} onChange={(e) => setField('storageProvider', e.target.value)}>
              <MenuItem value="local">Local</MenuItem>
              <MenuItem value="s3">AWS S3</MenuItem>
              <MenuItem value="cloudinary">Cloudinary</MenuItem>
            </Select>
          </FormControl>
        </SettingsRow>
        <SettingsRow label="AWS access key ID"><TextField size="small" fullWidth value={data.awsAccessKeyId || ''} onChange={(e) => setField('awsAccessKeyId', e.target.value)} sx={saasTextFieldSx} /></SettingsRow>
        <SettingsRow label="AWS secret key"><SecretField configured={Boolean(data.awsSecretAccessKeyConfigured)} value={(data.awsSecretAccessKey as string) || ''} onChange={(v) => setField('awsSecretAccessKey', v)} /></SettingsRow>
        <SettingsRow label="S3 bucket"><TextField size="small" fullWidth value={data.awsBucket || ''} onChange={(e) => setField('awsBucket', e.target.value)} sx={saasTextFieldSx} /></SettingsRow>
        <SettingsRow label="S3 region"><TextField size="small" fullWidth value={data.awsRegion || 'ap-south-1'} onChange={(e) => setField('awsRegion', e.target.value)} sx={saasTextFieldSx} /></SettingsRow>
        <SettingsRow label="Google Analytics ID"><TextField size="small" fullWidth value={data.googleAnalyticsId || ''} onChange={(e) => setField('googleAnalyticsId', e.target.value)} sx={saasTextFieldSx} /></SettingsRow>
        <SettingsRow label="Sentry DSN"><TextField size="small" fullWidth value={data.sentryDsn || ''} onChange={(e) => setField('sentryDsn', e.target.value)} sx={saasTextFieldSx} /></SettingsRow>
      </SettingsGroup>

      <SectionFooter saveKey="integrations" />
    </>
  );
}
