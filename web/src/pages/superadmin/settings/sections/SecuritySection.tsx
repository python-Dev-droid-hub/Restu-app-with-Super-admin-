import { Box, Chip, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Switch, TextField } from '@mui/material';
import { SettingsGroup, SettingsRow } from '../../../../components/superadmin/SettingsLayout';
import { saasTextFieldSx } from '../../../../components/superadmin/superAdminFormStyles';
import { useSectionDraft } from '../SettingsContext';
import SectionFooter from '../components/SectionFooter';

const ROLES = ['SUPER_ADMIN', 'BILLING_MANAGER', 'SUPPORT_AGENT', 'ONBOARDING_AGENT'];

export default function SecuritySection() {
  const { data, setField } = useSectionDraft('security');
  const require2fa = (data.require2faRoles as string[]) || [];

  return (
    <>
      <SettingsGroup title="Password policy">
        <SettingsRow label="Min password length"><TextField size="small" fullWidth type="number" value={data.minPasswordLength ?? 8} onChange={(e) => setField('minPasswordLength', Number(e.target.value))} sx={saasTextFieldSx} /></SettingsRow>
        <SettingsRow label="Require uppercase"><FormControlLabel control={<Switch checked={data.requireUppercase !== false} onChange={(e) => setField('requireUppercase', e.target.checked)} />} label="" /></SettingsRow>
        <SettingsRow label="Require numbers"><FormControlLabel control={<Switch checked={data.requireNumbers !== false} onChange={(e) => setField('requireNumbers', e.target.checked)} />} label="" /></SettingsRow>
        <SettingsRow label="Require special characters"><FormControlLabel control={<Switch checked={Boolean(data.requireSpecialChars)} onChange={(e) => setField('requireSpecialChars', e.target.checked)} />} label="" /></SettingsRow>
        <SettingsRow label="Password expiry (days)" hint="0 = never"><TextField size="small" fullWidth type="number" value={data.passwordExpiryDays ?? 0} onChange={(e) => setField('passwordExpiryDays', Number(e.target.value))} sx={saasTextFieldSx} /></SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Session settings">
        <SettingsRow label="JWT access expiry (minutes)"><TextField size="small" fullWidth type="number" value={data.jwtAccessMinutes ?? 15} onChange={(e) => setField('jwtAccessMinutes', Number(e.target.value))} sx={saasTextFieldSx} /></SettingsRow>
        <SettingsRow label="JWT refresh expiry (days)"><TextField size="small" fullWidth type="number" value={data.jwtRefreshDays ?? 7} onChange={(e) => setField('jwtRefreshDays', Number(e.target.value))} sx={saasTextFieldSx} /></SettingsRow>
        <SettingsRow label="Max active sessions"><TextField size="small" fullWidth type="number" value={data.maxActiveSessions ?? 3} onChange={(e) => setField('maxActiveSessions', Number(e.target.value))} sx={saasTextFieldSx} /></SettingsRow>
        <SettingsRow label="Force logout after (hours)"><TextField size="small" fullWidth type="number" value={data.forceLogoutHours ?? 8} onChange={(e) => setField('forceLogoutHours', Number(e.target.value))} sx={saasTextFieldSx} /></SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Two-factor authentication">
        <SettingsRow label="Require 2FA for roles" alignTop>
          <Box display="flex" flexWrap="wrap" gap={0.75}>
            {ROLES.map((r) => (
              <Chip
                key={r}
                label={r.replace(/_/g, ' ')}
                color={require2fa.includes(r) ? 'primary' : 'default'}
                variant={require2fa.includes(r) ? 'filled' : 'outlined'}
                onClick={() => {
                  const next = require2fa.includes(r) ? require2fa.filter((x) => x !== r) : [...require2fa, r];
                  setField('require2faRoles', next);
                }}
              />
            ))}
          </Box>
        </SettingsRow>
        <SettingsRow label="2FA method">
          <FormControl fullWidth size="small" sx={saasTextFieldSx}>
            <InputLabel shrink>Method</InputLabel>
            <Select notched label="Method" value={data.twoFaMethod || 'authenticator'} onChange={(e) => setField('twoFaMethod', e.target.value)}>
              <MenuItem value="authenticator">Authenticator app</MenuItem>
              <MenuItem value="sms">SMS</MenuItem>
              <MenuItem value="email">Email OTP</MenuItem>
            </Select>
          </FormControl>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Login security">
        <SettingsRow label="Max login attempts"><TextField size="small" fullWidth type="number" value={data.maxLoginAttempts ?? 5} onChange={(e) => setField('maxLoginAttempts', Number(e.target.value))} sx={saasTextFieldSx} /></SettingsRow>
        <SettingsRow label="Lockout duration (minutes)"><TextField size="small" fullWidth type="number" value={data.lockoutMinutes ?? 15} onChange={(e) => setField('lockoutMinutes', Number(e.target.value))} sx={saasTextFieldSx} /></SettingsRow>
        <SettingsRow label="Log all logins"><FormControlLabel control={<Switch checked={data.logAllLogins !== false} onChange={(e) => setField('logAllLogins', e.target.checked)} />} label="" /></SettingsRow>
        <SettingsRow label="Alert on new IP login"><FormControlLabel control={<Switch checked={Boolean(data.alertOnNewIp)} onChange={(e) => setField('alertOnNewIp', e.target.checked)} />} label="" /></SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Impersonation">
        <SettingsRow label="Allow impersonation"><FormControlLabel control={<Switch checked={data.allowImpersonation !== false} onChange={(e) => setField('allowImpersonation', e.target.checked)} />} label="" /></SettingsRow>
        <SettingsRow label="Session expiry (minutes)"><TextField size="small" fullWidth type="number" value={data.impersonationExpiryMinutes ?? 15} onChange={(e) => setField('impersonationExpiryMinutes', Number(e.target.value))} sx={saasTextFieldSx} /></SettingsRow>
        <SettingsRow label="Notify tenant on impersonation"><FormControlLabel control={<Switch checked={Boolean(data.notifyTenantOnImpersonation)} onChange={(e) => setField('notifyTenantOnImpersonation', e.target.checked)} />} label="" /></SettingsRow>
      </SettingsGroup>

      <SectionFooter saveKey="security" />
    </>
  );
}
