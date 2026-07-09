import { Alert, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Switch, TextField } from '@mui/material';
import { SettingsGroup, SettingsRow } from '../../../../components/superadmin/SettingsLayout';
import { saasTextFieldSx } from '../../../../components/superadmin/superAdminFormStyles';
import { useSectionDraft } from '../SettingsContext';
import SectionFooter from '../components/SectionFooter';
import { useSuperAdminPlans } from '../../../../hooks/useSuperAdminPlans';

type FlagVal = { enabled?: boolean; planRestriction?: string };

const GROUPS: { title: string; items: { key: string; label: string }[] }[] = [
  { title: 'Order types', items: [
    { key: 'dineIn', label: 'Dine-in ordering' },
    { key: 'delivery', label: 'Delivery orders' },
    { key: 'takeaway', label: 'Takeaway orders' },
    { key: 'driveThrough', label: 'Drive-through' },
  ]},
  { title: 'Kitchen & operations', items: [
    { key: 'kitchenDisplay', label: 'Kitchen display system' },
    { key: 'autoAcceptDineIn', label: 'Auto-accept dine-in' },
    { key: 'tableQrOrdering', label: 'Table QR ordering' },
    { key: 'waiterTablet', label: 'Waiter tablet mode' },
  ]},
  { title: 'Delivery', items: [
    { key: 'riderApp', label: 'Rider app' },
    { key: 'riderLocationTrack', label: 'Rider location tracking' },
  ]},
  { title: 'Payments', items: [
    { key: 'onlinePayments', label: 'Online payments' },
    { key: 'splitPayments', label: 'Split payments' },
    { key: 'cod', label: 'Cash on delivery' },
    { key: 'partialPayments', label: 'Partial payments' },
  ]},
  { title: 'Customer features', items: [
    { key: 'customerApp', label: 'Customer app/web' },
    { key: 'orderTracking', label: 'Order tracking page' },
    { key: 'reviews', label: 'Reviews & ratings' },
    { key: 'loyalty', label: 'Loyalty program' },
  ]},
  { title: 'Analytics & platform', items: [
    { key: 'basicReports', label: 'Basic reports' },
    { key: 'advancedAnalytics', label: 'Advanced analytics' },
    { key: 'exportCsv', label: 'Export CSV' },
    { key: 'whiteLabel', label: 'White label' },
    { key: 'customDomain', label: 'Custom domain' },
    { key: 'apiAccess', label: 'API access' },
    { key: 'fbrIntegration', label: 'FBR integration' },
    { key: 'offlineMode', label: 'Offline mode' },
  ]},
];

export default function FeaturesSection() {
  const { data, setField } = useSectionDraft('features');
  const { plans } = useSuperAdminPlans();

  const getFlag = (key: string): FlagVal => (data[key] as FlagVal) || { enabled: false, planRestriction: '' };
  const setFlag = (key: string, patch: Partial<FlagVal>) => setField(key, { ...getFlag(key), ...patch });

  return (
    <>
      <Alert severity="info" sx={{ mb: 2 }}>
        Changes here set defaults for <strong>new tenants</strong> only. Per-tenant overrides are managed in tenant settings.
      </Alert>

      {GROUPS.map((g) => (
        <SettingsGroup key={g.title} title={g.title}>
          {g.items.map((item) => {
            const flag = getFlag(item.key);
            return (
              <SettingsRow key={item.key} label={item.label}>
                <FormControlLabel
                  control={<Switch checked={Boolean(flag.enabled)} onChange={(e) => setFlag(item.key, { enabled: e.target.checked })} />}
                  label=""
                  sx={{ mr: 2 }}
                />
                <FormControl size="small" sx={{ ...saasTextFieldSx, minWidth: 160 }}>
                  <InputLabel shrink>Plan restriction</InputLabel>
                  <Select notched label="Plan restriction" displayEmpty value={flag.planRestriction || ''} onChange={(e) => setFlag(item.key, { planRestriction: e.target.value })}>
                    <MenuItem value="">All plans</MenuItem>
                    {plans.map((p) => <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </SettingsRow>
            );
          })}
        </SettingsGroup>
      ))}

      <SettingsGroup title="Delivery radius defaults">
        <SettingsRow label="Pickup radius (m)"><TextField size="small" fullWidth type="number" value={data.pickupRadiusM ?? 100} onChange={(e) => setField('pickupRadiusM', Number(e.target.value))} sx={saasTextFieldSx} /></SettingsRow>
        <SettingsRow label="Delivery radius (m)"><TextField size="small" fullWidth type="number" value={data.deliveryRadiusM ?? 200} onChange={(e) => setField('deliveryRadiusM', Number(e.target.value))} sx={saasTextFieldSx} /></SettingsRow>
      </SettingsGroup>

      <SectionFooter saveKey="features" />
    </>
  );
}
