import { FormControl, FormControlLabel, InputLabel, MenuItem, Select, Switch, TextField, Slider } from '@mui/material';
import { SettingsGroup, SettingsRow } from '../../../../components/superadmin/SettingsLayout';
import { saasTextFieldSx } from '../../../../components/superadmin/superAdminFormStyles';
import { useSectionDraft } from '../SettingsContext';
import SectionFooter from '../components/SectionFooter';

export default function TenantDefaultsSection() {
  const { data, setField } = useSectionDraft('defaults');

  return (
    <>
      <SettingsGroup title="Order settings">
        <SettingsRow label="Default tax rate (%)"><TextField size="small" fullWidth type="number" value={data.defaultTaxRate ?? 5} onChange={(e) => setField('defaultTaxRate', Number(e.target.value))} sx={saasTextFieldSx} /></SettingsRow>
        <SettingsRow label="Default service charge (%)"><TextField size="small" fullWidth type="number" value={data.defaultServiceCharge ?? 10} onChange={(e) => setField('defaultServiceCharge', Number(e.target.value))} sx={saasTextFieldSx} /></SettingsRow>
        <SettingsRow label="Default delivery fee"><TextField size="small" fullWidth type="number" value={data.defaultDeliveryFee ?? 150} onChange={(e) => setField('defaultDeliveryFee', Number(e.target.value))} sx={saasTextFieldSx} /></SettingsRow>
        <SettingsRow label="Free delivery above"><TextField size="small" fullWidth type="number" value={data.freeDeliveryAbove ?? 1500} onChange={(e) => setField('freeDeliveryAbove', Number(e.target.value))} sx={saasTextFieldSx} /></SettingsRow>
        <SettingsRow label="Min order amount"><TextField size="small" fullWidth type="number" value={data.minOrderAmount ?? 200} onChange={(e) => setField('minOrderAmount', Number(e.target.value))} sx={saasTextFieldSx} /></SettingsRow>
        <SettingsRow label="Order number prefix"><TextField size="small" fullWidth value={data.orderNumberPrefix || 'ORD'} onChange={(e) => setField('orderNumberPrefix', e.target.value)} sx={saasTextFieldSx} /></SettingsRow>
        <SettingsRow label="Order auto-cancel (minutes)" hint="0 = off"><TextField size="small" fullWidth type="number" value={data.orderAutoCancelMinutes ?? 0} onChange={(e) => setField('orderAutoCancelMinutes', Number(e.target.value))} sx={saasTextFieldSx} /></SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Kitchen settings">
        <SettingsRow label="Default prep time (minutes)"><TextField size="small" fullWidth type="number" value={data.defaultPrepTime ?? 20} onChange={(e) => setField('defaultPrepTime', Number(e.target.value))} sx={saasTextFieldSx} /></SettingsRow>
        <SettingsRow label="Kitchen auto-accept"><FormControlLabel control={<Switch checked={Boolean(data.kitchenAutoAccept)} onChange={(e) => setField('kitchenAutoAccept', e.target.checked)} />} label="" /></SettingsRow>
        <SettingsRow label="Max items per order" hint="0 = unlimited"><TextField size="small" fullWidth type="number" value={data.maxItemsPerOrder ?? 0} onChange={(e) => setField('maxItemsPerOrder', Number(e.target.value))} sx={saasTextFieldSx} /></SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Notifications">
        <SettingsRow label="New order sound">
          <FormControl fullWidth size="small" sx={saasTextFieldSx}>
            <InputLabel shrink>Sound</InputLabel>
            <Select notched label="Sound" value={data.newOrderSound || 'chime'} onChange={(e) => setField('newOrderSound', e.target.value)}>
              <MenuItem value="chime">Chime</MenuItem>
              <MenuItem value="bell">Bell</MenuItem>
              <MenuItem value="alert">Alert</MenuItem>
            </Select>
          </FormControl>
        </SettingsRow>
        <SettingsRow label="Order alert volume">
          <Slider value={Number(data.orderAlertVolume ?? 80)} onChange={(_, v) => setField('orderAlertVolume', v)} min={0} max={100} valueLabelDisplay="auto" />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Receipt / bill settings">
        <SettingsRow label="Bill header" alignTop><TextField size="small" fullWidth multiline rows={2} value={data.billHeader || ''} onChange={(e) => setField('billHeader', e.target.value)} sx={saasTextFieldSx} /></SettingsRow>
        <SettingsRow label="Bill footer" alignTop><TextField size="small" fullWidth multiline rows={2} value={data.billFooter || ''} onChange={(e) => setField('billFooter', e.target.value)} sx={saasTextFieldSx} /></SettingsRow>
        <SettingsRow label="Show logo on bill"><FormControlLabel control={<Switch checked={data.showLogoOnBill !== false} onChange={(e) => setField('showLogoOnBill', e.target.checked)} />} label="" /></SettingsRow>
        <SettingsRow label="Show tax breakdown"><FormControlLabel control={<Switch checked={data.showTaxBreakdown !== false} onChange={(e) => setField('showTaxBreakdown', e.target.checked)} />} label="" /></SettingsRow>
        <SettingsRow label="Show waiter name"><FormControlLabel control={<Switch checked={data.showWaiterName !== false} onChange={(e) => setField('showWaiterName', e.target.checked)} />} label="" /></SettingsRow>
        <SettingsRow label="Show table number"><FormControlLabel control={<Switch checked={data.showTableNumber !== false} onChange={(e) => setField('showTableNumber', e.target.checked)} />} label="" /></SettingsRow>
        <SettingsRow label="Receipt paper width">
          <FormControl fullWidth size="small" sx={saasTextFieldSx}>
            <InputLabel shrink>Width</InputLabel>
            <Select notched label="Width" value={data.receiptPaperWidth || '80mm'} onChange={(e) => setField('receiptPaperWidth', e.target.value)}>
              <MenuItem value="58mm">58mm</MenuItem>
              <MenuItem value="80mm">80mm</MenuItem>
            </Select>
          </FormControl>
        </SettingsRow>
      </SettingsGroup>

      <SectionFooter saveKey="defaults" />
    </>
  );
}
