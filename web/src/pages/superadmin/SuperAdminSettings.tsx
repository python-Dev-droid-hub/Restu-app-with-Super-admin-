import { useCallback, useEffect, type ComponentType } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert, Box, Button, CircularProgress, IconButton, Snackbar, Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { SuperAdminLayout } from '../../components/superadmin/SuperAdminLayout';
import { saas } from '../../components/superadmin/superAdminTokens';
import { SETTINGS_SECTIONS, sectionFromSearch, type SettingsSectionId } from './settings/constants';
import { SettingsProvider, useSettings } from './settings/SettingsContext';
import SettingsIndex from './settings/SettingsIndex';
import GeneralSection from './settings/sections/GeneralSection';
import BrandingSection from './settings/sections/BrandingSection';
import EmailSection from './settings/sections/EmailSection';
import TemplatesSection from './settings/sections/TemplatesSection';
import BillingSection from './settings/sections/BillingSection';
import SecuritySection from './settings/sections/SecuritySection';
import TeamSection from './settings/sections/TeamSection';
import FeaturesSection from './settings/sections/FeaturesSection';
import IntegrationsSection from './settings/sections/IntegrationsSection';
import TenantDefaultsSection from './settings/sections/TenantDefaultsSection';
import MaintenanceSection from './settings/sections/MaintenanceSection';
import AuditSection from './settings/sections/AuditSection';

const SECTION_COMPONENTS: Record<SettingsSectionId, ComponentType> = {
  general: GeneralSection,
  branding: BrandingSection,
  email: EmailSection,
  templates: TemplatesSection,
  billing: BillingSection,
  security: SecuritySection,
  team: TeamSection,
  features: FeaturesSection,
  integrations: IntegrationsSection,
  defaults: TenantDefaultsSection,
  maintenance: MaintenanceSection,
  audit: AuditSection,
};

function SettingsPageInner() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeId = sectionFromSearch(`?${searchParams.toString()}`);
  const active = activeId ? SETTINGS_SECTIONS.find((s) => s.id === activeId) : null;
  const { loading, dirty, saveAll, saving, toast, clearToast } = useSettings();
  const ActiveComponent = activeId ? SECTION_COMPONENTS[activeId] : null;

  const setSection = useCallback(
    (id: SettingsSectionId) => {
      if (dirty.size > 0 && !window.confirm('You have unsaved changes. Leave this section?')) return;
      setSearchParams({ section: id });
    },
    [dirty, setSearchParams]
  );

  const goToIndex = useCallback(() => {
    if (dirty.size > 0 && !window.confirm('You have unsaved changes. Leave this section?')) return;
    setSearchParams({});
  }, [dirty, setSearchParams]);

  useEffect(() => {
    const legacy = window.location.pathname;
    if (legacy.includes('/settings/general')) navigate('/superadmin/settings?section=general', { replace: true });
    if (legacy.includes('/settings/email-templates')) navigate('/superadmin/settings?section=templates', { replace: true });
    if (legacy.includes('/settings/team')) navigate('/superadmin/settings?section=team', { replace: true });
  }, [navigate]);

  const sectionDirty = (id: SettingsSectionId) => {
    const def = SETTINGS_SECTIONS.find((s) => s.id === id);
    return def?.saveKey ? dirty.has(def.saveKey) : false;
  };

  return (
    <SuperAdminLayout>
      <Box display="flex" flexWrap="wrap" alignItems="flex-start" justifyContent="space-between" gap={2} mb={3}>
        <Box>
          {active ? (
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              <IconButton
                size="small"
                onClick={goToIndex}
                sx={{
                  border: `1px solid ${saas.colors.cardBorder}`,
                  borderRadius: `${saas.radius.sm}px`,
                }}
              >
                <ArrowBackRoundedIcon sx={{ fontSize: 18 }} />
              </IconButton>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Platform settings
              </Typography>
            </Box>
          ) : null}
          <Typography variant="h5" fontWeight={800} letterSpacing="-0.03em">
            {active ? active.label : 'Platform settings'}
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5} maxWidth={560}>
            {active
              ? active.description
              : 'Manage platform-wide configuration. Select a section to view and edit settings.'}
          </Typography>
        </Box>
        {active && (
          <Box display="flex" alignItems="center" gap={1.5}>
            {dirty.size > 0 && (
              <Box display="flex" alignItems="center" gap={0.75}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#FF9800' }} />
                <Typography variant="caption" fontWeight={700} color="warning.main">Unsaved changes</Typography>
              </Box>
            )}
            <Button
              variant="contained"
              color="primary"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />}
              disabled={dirty.size === 0 || Boolean(saving)}
              onClick={() => void saveAll()}
            >
              Save all changes
            </Button>
          </Box>
        )}
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={12}><CircularProgress /></Box>
      ) : !active || !ActiveComponent ? (
        <SettingsIndex onSelect={setSection} isDirty={sectionDirty} />
      ) : (
        <Box
          sx={{
            width: '100%',
            border: `1px solid ${saas.colors.cardBorder}`,
            borderRadius: `${saas.radius.lg}px`,
            bgcolor: '#fff',
            boxShadow: saas.shadow.card,
            p: { xs: 2, md: 3 },
          }}
        >
          <ActiveComponent />
        </Box>
      )}

      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={clearToast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast?.type} onClose={clearToast}>{toast?.message}</Alert>
      </Snackbar>
    </SuperAdminLayout>
  );
}

export default function SuperAdminSettings() {
  return (
    <SettingsProvider>
      <SettingsPageInner />
    </SettingsProvider>
  );
}
