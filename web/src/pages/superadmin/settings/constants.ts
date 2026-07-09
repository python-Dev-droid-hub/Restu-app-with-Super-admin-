import type { SvgIconComponent } from '@mui/icons-material';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import ExtensionOutlinedIcon from '@mui/icons-material/ExtensionOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';

export type SettingsSectionId =
  | 'general'
  | 'branding'
  | 'email'
  | 'templates'
  | 'billing'
  | 'security'
  | 'team'
  | 'features'
  | 'integrations'
  | 'defaults'
  | 'maintenance'
  | 'audit';

export type SettingsSectionDef = {
  id: SettingsSectionId;
  label: string;
  description: string;
  icon: SvgIconComponent;
  saveKey?: string;
};

export const SETTINGS_SECTIONS: SettingsSectionDef[] = [
  { id: 'general', label: 'General', description: 'Platform identity, regional defaults, and slug rules', icon: SettingsOutlinedIcon, saveKey: 'general' },
  { id: 'branding', label: 'Platform Branding', description: 'Panel and default tenant visual identity', icon: PaletteOutlinedIcon, saveKey: 'branding' },
  { id: 'email', label: 'Email & Notifications', description: 'SMTP configuration and notification triggers', icon: EmailOutlinedIcon, saveKey: 'email' },
  { id: 'templates', label: 'Email Templates', description: 'Transactional email content and variables', icon: DescriptionOutlinedIcon },
  { id: 'billing', label: 'Billing & Payments', description: 'Payment gateways, invoicing, and dunning', icon: CreditCardOutlinedIcon, saveKey: 'billing' },
  { id: 'security', label: 'Security & Access', description: 'Password policy, sessions, and login security', icon: SecurityOutlinedIcon, saveKey: 'security' },
  { id: 'team', label: 'Team Management', description: 'Super admin accounts and role permissions', icon: GroupsOutlinedIcon },
  { id: 'features', label: 'Feature Flags', description: 'Global defaults for new tenant capabilities', icon: FlagOutlinedIcon, saveKey: 'features' },
  { id: 'integrations', label: 'Integrations', description: 'Tax, maps, SMS, storage, and monitoring', icon: ExtensionOutlinedIcon, saveKey: 'integrations' },
  { id: 'defaults', label: 'Tenant Defaults', description: 'Order, kitchen, and receipt defaults for new tenants', icon: TuneOutlinedIcon, saveKey: 'defaults' },
  { id: 'maintenance', label: 'Maintenance & System', description: 'Maintenance mode, system info, and cache', icon: BuildOutlinedIcon, saveKey: 'maintenance' },
  { id: 'audit', label: 'Audit Log', description: 'Platform activity and administrative actions', icon: HistoryOutlinedIcon },
];

export type SettingsNavGroup = {
  title: string;
  accent: string;
  items: SettingsSectionId[];
};

export const SETTINGS_GROUPS: SettingsNavGroup[] = [
  { title: 'Platform', accent: '#FA4A0C', items: ['general', 'branding'] },
  { title: 'Communications', accent: '#2196F3', items: ['email', 'templates'] },
  { title: 'Business', accent: '#4CAF50', items: ['billing', 'features', 'defaults'] },
  { title: 'Access', accent: '#9C27B0', items: ['security', 'team'] },
  { title: 'System', accent: '#00BCD4', items: ['integrations', 'maintenance', 'audit'] },
];

export const SECRET_MASK = '••••••••';

export function sectionFromSearch(search: string): SettingsSectionId | null {
  const id = new URLSearchParams(search).get('section') as SettingsSectionId | null;
  if (!id) return null;
  return SETTINGS_SECTIONS.some((s) => s.id === id) ? id : null;
}
