import {
  FormControl, InputLabel, MenuItem, Select, Switch, TextField, FormControlLabel, Chip, Box,
} from '@mui/material';
import { SettingsGroup, SettingsRow } from '../../../../components/superadmin/SettingsLayout';
import { saasTextFieldSx } from '../../../../components/superadmin/superAdminFormStyles';
import { useSectionDraft } from '../SettingsContext';
import SectionFooter from '../components/SectionFooter';
import { useSuperAdminPlans } from '../../../../hooks/useSuperAdminPlans';

const TIMEZONES = ['UTC', 'America/New_York', 'Europe/London', 'Asia/Dubai', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Singapore'];
const LANGUAGES = [{ v: 'en', l: 'English' }, { v: 'ur', l: 'Urdu' }, { v: 'ar', l: 'Arabic' }];
const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
const CURRENCIES = ['PKR', 'USD', 'AED', 'SAR', 'EUR', 'GBP'];

export default function GeneralSection() {
  const { data, setField } = useSectionDraft('general');
  const { plans } = useSuperAdminPlans();

  return (
    <>
      <SettingsGroup title="Platform identity" description="Core platform information shown across the product.">
        <SettingsRow label="Platform name" hint="e.g. FoodFlow">
          <TextField size="small" fullWidth value={data.platformName || ''} onChange={(e) => setField('platformName', e.target.value)} sx={saasTextFieldSx} />
        </SettingsRow>
        <SettingsRow label="Platform tagline" hint="Short description for marketing and emails.">
          <TextField size="small" fullWidth value={data.platformTagline || ''} onChange={(e) => setField('platformTagline', e.target.value)} sx={saasTextFieldSx} />
        </SettingsRow>
        <SettingsRow label="Support email">
          <TextField size="small" fullWidth type="email" value={data.supportEmail || ''} onChange={(e) => setField('supportEmail', e.target.value)} sx={saasTextFieldSx} />
        </SettingsRow>
        <SettingsRow label="Support phone">
          <TextField size="small" fullWidth value={data.supportPhone || ''} onChange={(e) => setField('supportPhone', e.target.value)} sx={saasTextFieldSx} />
        </SettingsRow>
        <SettingsRow label="WhatsApp support">
          <TextField size="small" fullWidth value={data.whatsappSupport || ''} onChange={(e) => setField('whatsappSupport', e.target.value)} sx={saasTextFieldSx} />
        </SettingsRow>
        <SettingsRow label="Website URL">
          <TextField size="small" fullWidth value={data.websiteUrl || ''} onChange={(e) => setField('websiteUrl', e.target.value)} sx={saasTextFieldSx} />
        </SettingsRow>
        <SettingsRow label="App domain" hint="Used for tenant subdomains.">
          <TextField size="small" fullWidth value={data.appDomain || ''} onChange={(e) => setField('appDomain', e.target.value)} sx={saasTextFieldSx} />
        </SettingsRow>
        <SettingsRow label="Super admin panel URL">
          <TextField size="small" fullWidth value={data.superAdminPanelUrl || ''} InputProps={{ readOnly: true }} sx={saasTextFieldSx} />
        </SettingsRow>
        <SettingsRow label="Platform logo URL">
          <TextField size="small" fullWidth value={data.platformLogoUrl || ''} onChange={(e) => setField('platformLogoUrl', e.target.value)} sx={saasTextFieldSx} />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Regional defaults" description="Defaults for new tenants and platform formatting.">
        <SettingsRow label="Default timezone">
          <FormControl fullWidth size="small" sx={saasTextFieldSx}>
            <InputLabel shrink>Timezone</InputLabel>
            <Select notched label="Timezone" value={data.defaultTimezone || 'Asia/Karachi'} onChange={(e) => setField('defaultTimezone', e.target.value)}>
              {TIMEZONES.map((tz) => <MenuItem key={tz} value={tz}>{tz}</MenuItem>)}
            </Select>
          </FormControl>
        </SettingsRow>
        <SettingsRow label="Default currency">
          <FormControl fullWidth size="small" sx={saasTextFieldSx}>
            <InputLabel shrink>Currency</InputLabel>
            <Select notched label="Currency" value={data.defaultCurrency || 'PKR'} onChange={(e) => setField('defaultCurrency', e.target.value)}>
              {CURRENCIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
        </SettingsRow>
        <SettingsRow label="Default language">
          <FormControl fullWidth size="small" sx={saasTextFieldSx}>
            <InputLabel shrink>Language</InputLabel>
            <Select notched label="Language" value={data.defaultLanguage || 'en'} onChange={(e) => setField('defaultLanguage', e.target.value)}>
              {LANGUAGES.map((l) => <MenuItem key={l.v} value={l.v}>{l.l}</MenuItem>)}
            </Select>
          </FormControl>
        </SettingsRow>
        <SettingsRow label="Date format">
          <FormControl fullWidth size="small" sx={saasTextFieldSx}>
            <InputLabel shrink>Date format</InputLabel>
            <Select notched label="Date format" value={data.dateFormat || 'DD/MM/YYYY'} onChange={(e) => setField('dateFormat', e.target.value)}>
              {DATE_FORMATS.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
            </Select>
          </FormControl>
        </SettingsRow>
        <SettingsRow label="Time format">
          <FormControl fullWidth size="small" sx={saasTextFieldSx}>
            <InputLabel shrink>Time format</InputLabel>
            <Select notched label="Time format" value={data.timeFormat || '12-hour'} onChange={(e) => setField('timeFormat', e.target.value)}>
              <MenuItem value="12-hour">12-hour</MenuItem>
              <MenuItem value="24-hour">24-hour</MenuItem>
            </Select>
          </FormControl>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="New tenant defaults" description="Applied when launching a new restaurant.">
        <SettingsRow label="Default trial period (days)">
          <TextField size="small" fullWidth type="number" value={data.trialPeriodDays ?? 14} onChange={(e) => setField('trialPeriodDays', Number(e.target.value))} sx={saasTextFieldSx} />
        </SettingsRow>
        <SettingsRow label="Default plan">
          <FormControl fullWidth size="small" sx={saasTextFieldSx}>
            <InputLabel shrink>Plan</InputLabel>
            <Select notched label="Plan" displayEmpty value={data.defaultPlanId || ''} onChange={(e) => setField('defaultPlanId', e.target.value || null)}>
              <MenuItem value="">None</MenuItem>
              {plans.map((p) => <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>)}
            </Select>
          </FormControl>
        </SettingsRow>
        <SettingsRow label="Auto-verify tenants" hint="OFF = manual verification required.">
          <FormControlLabel control={<Switch checked={Boolean(data.autoVerifyTenants)} onChange={(e) => setField('autoVerifyTenants', e.target.checked)} />} label={data.autoVerifyTenants ? 'Enabled' : 'Disabled'} />
        </SettingsRow>
        <SettingsRow label="Grace period after trial (days)">
          <TextField size="small" fullWidth type="number" value={data.gracePeriodDays ?? 3} onChange={(e) => setField('gracePeriodDays', Number(e.target.value))} sx={saasTextFieldSx} />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Slug configuration" description="Reserved slugs and length limits for tenant URLs.">
        <SettingsRow label="Reserved slugs" alignTop>
          <Box display="flex" flexWrap="wrap" gap={0.75}>
            {((data.reservedSlugs as string[]) || []).map((s) => (
              <Chip key={s} label={s} size="small" onDelete={() => setField('reservedSlugs', ((data.reservedSlugs as string[]) || []).filter((x) => x !== s))} />
            ))}
          </Box>
          <TextField
            size="small"
            fullWidth
            placeholder="Add slug and press Enter"
            sx={{ ...saasTextFieldSx, mt: 1 }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const v = (e.target as HTMLInputElement).value.trim().toLowerCase();
                if (!v) return;
                const list = [...((data.reservedSlugs as string[]) || [])];
                if (!list.includes(v)) setField('reservedSlugs', [...list, v]);
                (e.target as HTMLInputElement).value = '';
              }
            }}
          />
        </SettingsRow>
        <SettingsRow label="Min slug length">
          <TextField size="small" fullWidth type="number" value={data.minSlugLength ?? 3} onChange={(e) => setField('minSlugLength', Number(e.target.value))} sx={saasTextFieldSx} />
        </SettingsRow>
        <SettingsRow label="Max slug length">
          <TextField size="small" fullWidth type="number" value={data.maxSlugLength ?? 50} onChange={(e) => setField('maxSlugLength', Number(e.target.value))} sx={saasTextFieldSx} />
        </SettingsRow>
      </SettingsGroup>

      <SectionFooter saveKey="general" />
    </>
  );
}
