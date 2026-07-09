import { FormControl, InputLabel, MenuItem, Select, Switch, TextField, FormControlLabel } from '@mui/material';
import { SettingsGroup, SettingsRow } from '../../../../components/superadmin/SettingsLayout';
import { saasTextFieldSx } from '../../../../components/superadmin/superAdminFormStyles';
import { useSectionDraft } from '../SettingsContext';
import SectionFooter from '../components/SectionFooter';
import ColorField from '../components/ColorField';

const FONTS = ['Inter', 'Poppins', 'Roboto', 'Cairo'];

export default function BrandingSection() {
  const { data, setField } = useSectionDraft('branding');

  return (
    <>
      <SettingsGroup title="Super admin panel branding" description="How this console looks to your team.">
        <SettingsRow label="Panel logo URL" hint="Recommended 200×50px">
          <TextField size="small" fullWidth value={data.panelLogoUrl || ''} onChange={(e) => setField('panelLogoUrl', e.target.value)} sx={saasTextFieldSx} />
        </SettingsRow>
        <SettingsRow label="Panel favicon URL" hint="32×32px">
          <TextField size="small" fullWidth value={data.panelFaviconUrl || ''} onChange={(e) => setField('panelFaviconUrl', e.target.value)} sx={saasTextFieldSx} />
        </SettingsRow>
        <SettingsRow label="Panel primary color">
          <ColorField label="Primary" value={(data.panelPrimaryColor as string) || '#FA4A0C'} onChange={(v) => setField('panelPrimaryColor', v)} />
        </SettingsRow>
        <SettingsRow label="Panel secondary color">
          <ColorField label="Secondary" value={(data.panelSecondaryColor as string) || '#2D2D2D'} onChange={(v) => setField('panelSecondaryColor', v)} />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Default tenant branding" description="Applied to new tenants until they customize.">
        <SettingsRow label="Default logo URL">
          <TextField size="small" fullWidth value={data.defaultTenantLogoUrl || ''} onChange={(e) => setField('defaultTenantLogoUrl', e.target.value)} sx={saasTextFieldSx} />
        </SettingsRow>
        <SettingsRow label="Default primary color">
          <ColorField label="Primary" value={(data.defaultTenantPrimaryColor as string) || '#FF5733'} onChange={(v) => setField('defaultTenantPrimaryColor', v)} />
        </SettingsRow>
        <SettingsRow label="Default secondary color">
          <ColorField label="Secondary" value={(data.defaultTenantSecondaryColor as string) || '#2C3E50'} onChange={(v) => setField('defaultTenantSecondaryColor', v)} />
        </SettingsRow>
        <SettingsRow label="Default font">
          <FormControl fullWidth size="small" sx={saasTextFieldSx}>
            <InputLabel shrink>Font</InputLabel>
            <Select notched label="Font" value={data.defaultFont || 'Inter'} onChange={(e) => setField('defaultFont', e.target.value)}>
              {FONTS.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
            </Select>
          </FormControl>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="White label" description="Footer branding on tenant-facing experiences.">
        <SettingsRow label="Powered by text">
          <TextField size="small" fullWidth value={data.poweredByText || ''} onChange={(e) => setField('poweredByText', e.target.value)} sx={saasTextFieldSx} />
        </SettingsRow>
        <SettingsRow label="Show powered by">
          <FormControlLabel control={<Switch checked={data.showPoweredBy !== false} onChange={(e) => setField('showPoweredBy', e.target.checked)} />} label={data.showPoweredBy !== false ? 'Visible' : 'Hidden'} />
        </SettingsRow>
        <SettingsRow label="Powered by logo URL">
          <TextField size="small" fullWidth value={data.poweredByLogoUrl || ''} onChange={(e) => setField('poweredByLogoUrl', e.target.value)} sx={saasTextFieldSx} />
        </SettingsRow>
        <SettingsRow label="Privacy policy URL">
          <TextField size="small" fullWidth value={data.privacyPolicyUrl || ''} onChange={(e) => setField('privacyPolicyUrl', e.target.value)} sx={saasTextFieldSx} />
        </SettingsRow>
        <SettingsRow label="Terms URL">
          <TextField size="small" fullWidth value={data.termsUrl || ''} onChange={(e) => setField('termsUrl', e.target.value)} sx={saasTextFieldSx} />
        </SettingsRow>
      </SettingsGroup>

      <SectionFooter saveKey="branding" />
    </>
  );
}
