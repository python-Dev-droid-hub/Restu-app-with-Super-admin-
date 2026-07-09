import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Paper,
  Skeleton,
  Alert,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
} from '@mui/material';
import {
  Save,
  Settings as SettingsIcon,
  LocalShipping,
  Payment,
  Email,
} from '@mui/icons-material';
import { api } from '../../services/api';
import { io, type Socket } from 'socket.io-client';
import { getSocketIoOptions, getSocketIoUrl } from '../../utils/socketOptions';
import { BACKEND_UNREACHABLE_MSG } from '../../utils/backendHealth';
import { mapSettingsPayload } from '../../utils/applySettingsPayload';
import { useTenantBranding } from '../../context/TenantBrandingProvider';
import { adminPageContainerSx, timeInputFieldSx, useAdminBreakpoints } from '../../utils/adminResponsive';

interface AppSettings {
  appName: string;
  appVersion: string;
  restaurantName: string;
  restaurantDescription: string;
  defaultCurrency: string;
  currency: string;
  defaultLanguage: string;
  language: string;
  taxRate: number;
  serviceCharge: number;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  contactEmail: string;
  contactPhone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  operatingHours: {
    monday: { open: string; close: string; closed: boolean };
    tuesday: { open: string; close: string; closed: boolean };
    wednesday: { open: string; close: string; closed: boolean };
    thursday: { open: string; close: string; closed: boolean };
    friday: { open: string; close: string; closed: boolean };
    saturday: { open: string; close: string; closed: boolean };
    sunday: { open: string; close: string; closed: boolean };
  };
  deliverySettings: {
    deliveryRadius: number;
    deliveryFee: number;
    minimumOrder: number;
    estimatedDeliveryTime: number;
  };
  notifications: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
  };
  socialMedia: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
}

const AdminSettings: React.FC = () => {
  const { branding } = useTenantBranding();
  const { isCompact } = useAdminBreakpoints();
  const primary = branding.primaryColor || '#FF6B35';
  const primaryHover = branding.secondaryColor || '#E55A24';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    appName: 'Restaurant App',
    appVersion: '1.0.0',
    restaurantName: '',
    restaurantDescription: '',
    defaultCurrency: 'USD',
    currency: 'USD',
    defaultLanguage: 'en',
    language: 'en',
    taxRate: 0,
    serviceCharge: 0,
    maintenanceMode: false,
    allowRegistration: true,
    contactEmail: '',
    contactPhone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA',
    },
    operatingHours: {
      monday: { open: '09:00', close: '22:00', closed: false },
      tuesday: { open: '09:00', close: '22:00', closed: false },
      wednesday: { open: '09:00', close: '22:00', closed: false },
      thursday: { open: '09:00', close: '22:00', closed: false },
      friday: { open: '09:00', close: '22:00', closed: false },
      saturday: { open: '09:00', close: '22:00', closed: false },
      sunday: { open: '09:00', close: '22:00', closed: true },
    },
    deliverySettings: {
      deliveryRadius: 10,
      deliveryFee: 0,
      minimumOrder: 0,
      estimatedDeliveryTime: 30,
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
    },
    socialMedia: {},
  });

  const applySettingsData = useCallback((payload: any) => {
    const data = payload?.settings || payload?.data?.settings || payload?.data || payload || {};
    setSettings(mapSettingsPayload(data) as AppSettings);
    setLoading(false);
    setError('');
  }, []);

  const loadSettingsHttp = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await api.getSettings();
      if (res?.success) {
        applySettingsData(res.data);
        return true;
      }
      setError(res?.error || res?.message || BACKEND_UNREACHABLE_MSG);
    } catch {
      setError(BACKEND_UNREACHABLE_MSG);
    }
    setLoading(false);
    return false;
  }, [applySettingsData]);

  const requestSettings = useCallback(() => {
    if (!socketRef.current) return;
    setLoading(true);
    socketRef.current.emit('admin_settings:get');
  }, []);

  useEffect(() => {
    void loadSettingsHttp();

    const socket = io(getSocketIoUrl(), getSocketIoOptions());
    socketRef.current = socket;

    socket.on('connect', requestSettings);
    socket.on('admin_settings:data', applySettingsData);
    socket.on('connect_error', () => {
      void loadSettingsHttp();
    });

    if (socket.connected) {
      requestSettings();
    }

    return () => {
      socket.off('connect', requestSettings);
      socket.off('admin_settings:data', applySettingsData);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [requestSettings, applySettingsData, loadSettingsHttp]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const {
        _id: _omitId,
        __v: _omitV,
        createdAt: _omitCreated,
        updatedAt: _omitUpdated,
        tenantId: _omitTenant,
        ...rest
      } = settings as AppSettings & Record<string, unknown>;
      const { socialMedia, ...payloadRest } = rest;
      const payload = {
        ...payloadRest,
        socialMedia: Object.fromEntries(
          Object.entries(socialMedia || {}).filter(([, v]) => v != null && String(v).trim() !== '')
        ),
      };

      const response: any = await api.updateSettings(payload);
      if (response?.success) {
        applySettingsData(response.data);
        setSuccess('Settings saved successfully');
      } else {
        setError(response?.message || response?.error || 'Failed to save settings');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset all settings to defaults?')) return;
    try {
      setLoading(true);
      const response: any = await api.resetSettings();
      if (response?.success) {
        applySettingsData(response.data);
        setSuccess('Settings reset to defaults');
      } else {
        setError(response?.message || 'Failed to reset settings');
        setLoading(false);
      }
    } catch {
      setError('Failed to reset settings');
      setLoading(false);
    }
  };

  return (
    <Box sx={{ ...adminPageContainerSx, bgcolor: '#f8f5ff', minHeight: '100vh' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          mb: 3,
          gap: 1.5,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#333' }}>
          Settings
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
          <Button variant="outlined" onClick={handleReset} disabled={loading} fullWidth={isCompact}>
            Reset to Defaults
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSave}
            disabled={saving || loading}
            fullWidth={isCompact}
            sx={{ bgcolor: primary, '&:hover': { bgcolor: primaryHover } }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {loading ? (
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
      ) : (
        <Grid container spacing={3}>
          {/* General Settings */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <SettingsIcon sx={{ color: primary }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  General Settings
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="App Name"
                  fullWidth
                  value={settings.appName}
                  onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                />
                <TextField
                  label="App Version"
                  fullWidth
                  value={settings.appVersion}
                  onChange={(e) => setSettings({ ...settings, appVersion: e.target.value })}
                />
                <TextField
                  label="Restaurant Name"
                  fullWidth
                  value={settings.restaurantName}
                  onChange={(e) => setSettings({ ...settings, restaurantName: e.target.value })}
                />
                <TextField
                  label="Restaurant Description"
                  fullWidth
                  multiline
                  rows={2}
                  value={settings.restaurantDescription}
                  onChange={(e) => setSettings({ ...settings, restaurantDescription: e.target.value })}
                />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Currency</InputLabel>
                      <Select
                        value={settings.defaultCurrency}
                        label="Currency"
                        onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value, currency: e.target.value })}
                      >
                        <MenuItem value="PKR">PKR - Pakistani Rupee</MenuItem>
                        <MenuItem value="USD">USD - US Dollar</MenuItem>
                        <MenuItem value="EUR">EUR - Euro</MenuItem>
                        <MenuItem value="GBP">GBP - British Pound</MenuItem>
                        <MenuItem value="AED">AED - UAE Dirham</MenuItem>
                        <MenuItem value="SAR">SAR - Saudi Riyal</MenuItem>
                        <MenuItem value="INR">INR - Indian Rupee</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={6}>
                    <FormControl fullWidth>
                      <InputLabel>Language</InputLabel>
                      <Select
                        value={settings.defaultLanguage}
                        label="Language"
                        onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value, language: e.target.value })}
                      >
                        <MenuItem value="en">English</MenuItem>
                        <MenuItem value="ar">Arabic</MenuItem>
                        <MenuItem value="ur">Urdu</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Tax Rate (%)"
                      type="number"
                      fullWidth
                      value={settings.taxRate}
                      onChange={(e) => setSettings({ ...settings, taxRate: parseFloat(e.target.value) || 0 })}
                    />
                  </Grid>
                  <Grid size={6}>
                    <TextField
                      label="Delivery Charges"
                      type="number"
                      fullWidth
                      value={settings.deliverySettings.deliveryFee}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          deliverySettings: {
                            ...settings.deliverySettings,
                            deliveryFee: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </Grid>
                </Grid>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Service Charge (%)"
                      type="number"
                      fullWidth
                      value={settings.serviceCharge}
                      onChange={(e) => setSettings({ ...settings, serviceCharge: parseFloat(e.target.value) || 0 })}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Paper>
          </Grid>

          {/* Delivery Settings */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LocalShipping sx={{ color: '#2196F3' }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Delivery Settings
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Delivery Fee"
                  type="number"
                  fullWidth
                  value={settings.deliverySettings.deliveryFee}
                  onChange={(e) => setSettings({ ...settings, deliverySettings: { ...settings.deliverySettings, deliveryFee: parseFloat(e.target.value) || 0 } })}
                />
                <TextField
                  label="Minimum Order Amount"
                  type="number"
                  fullWidth
                  value={settings.deliverySettings.minimumOrder}
                  onChange={(e) => setSettings({ ...settings, deliverySettings: { ...settings.deliverySettings, minimumOrder: parseFloat(e.target.value) || 0 } })}
                />
                <TextField
                  label="Delivery Radius (km)"
                  type="number"
                  fullWidth
                  value={settings.deliverySettings.deliveryRadius}
                  onChange={(e) => setSettings({ ...settings, deliverySettings: { ...settings.deliverySettings, deliveryRadius: parseInt(e.target.value) || 10 } })}
                />
                <TextField
                  label="Est. Delivery Time (min)"
                  type="number"
                  fullWidth
                  value={settings.deliverySettings.estimatedDeliveryTime}
                  onChange={(e) => setSettings({ ...settings, deliverySettings: { ...settings.deliverySettings, estimatedDeliveryTime: parseInt(e.target.value) || 30 } })}
                />
              </Box>
            </Paper>
          </Grid>

          {/* Contact Settings */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Email sx={{ color: '#4CAF50' }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Contact Information
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Contact Email"
                  type="email"
                  fullWidth
                  value={settings.contactEmail}
                  onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                />
                <TextField
                  label="Contact Phone"
                  fullWidth
                  value={settings.contactPhone}
                  onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                />
                <TextField
                  label="Street Address"
                  fullWidth
                  value={settings.address.street}
                  onChange={(e) => setSettings({ ...settings, address: { ...settings.address, street: e.target.value } })}
                />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="City"
                      fullWidth
                      value={settings.address.city}
                      onChange={(e) => setSettings({ ...settings, address: { ...settings.address, city: e.target.value } })}
                    />
                  </Grid>
                  <Grid size={6}>
                    <TextField
                      label="State"
                      fullWidth
                      value={settings.address.state}
                      onChange={(e) => setSettings({ ...settings, address: { ...settings.address, state: e.target.value } })}
                    />
                  </Grid>
                </Grid>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Zip Code"
                      fullWidth
                      value={settings.address.zipCode}
                      onChange={(e) => setSettings({ ...settings, address: { ...settings.address, zipCode: e.target.value } })}
                    />
                  </Grid>
                  <Grid size={6}>
                    <TextField
                      label="Country"
                      fullWidth
                      value={settings.address.country}
                      onChange={(e) => setSettings({ ...settings, address: { ...settings.address, country: e.target.value } })}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Paper>
          </Grid>

          {/* System Settings */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Payment sx={{ color: '#9C27B0' }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  System Settings
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.maintenanceMode}
                      onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                    />
                  }
                  label="Maintenance Mode"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.allowRegistration}
                      onChange={(e) => setSettings({ ...settings, allowRegistration: e.target.checked })}
                    />
                  }
                  label="Allow Registration"
                />
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" color="textSecondary">
                  Notifications
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.notifications.emailNotifications}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, emailNotifications: e.target.checked }
                      })}
                    />
                  }
                  label="Email Notifications"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.notifications.smsNotifications}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, smsNotifications: e.target.checked }
                      })}
                    />
                  }
                  label="SMS Notifications"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.notifications.pushNotifications}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, pushNotifications: e.target.checked }
                      })}
                    />
                  }
                  label="Push Notifications"
                />
              </Box>
            </Paper>
          </Grid>

          {/* Business Hours */}
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <SettingsIcon sx={{ color: primary }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Business Hours
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />
              <Grid container spacing={2}>
                {Object.entries(settings.operatingHours).map(([day, hours]) => (
                  <Grid size={{ xs: 12, sm: 6, lg: 4, xl: 3 }} key={day}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: { xs: 1.5, sm: 2 },
                        borderRadius: 2,
                        borderColor: hours.closed ? '#e0e0e0' : primary,
                        bgcolor: hours.closed ? '#fafafa' : 'white',
                        height: '100%',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 1,
                          mb: hours.closed ? 0 : 2,
                          flexWrap: 'wrap',
                        }}
                      >
                        <Typography
                          variant="subtitle1"
                          sx={{ textTransform: 'capitalize', fontWeight: 600, minWidth: 0 }}
                        >
                          {day}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              display: { xs: 'none', sm: 'block' },
                              color: hours.closed ? '#999' : '#4CAF50',
                              fontWeight: 500,
                            }}
                          >
                            {hours.closed ? 'Closed' : 'Open'}
                          </Typography>
                          <Switch
                            size="small"
                            checked={!hours.closed}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                operatingHours: {
                                  ...settings.operatingHours,
                                  [day]: { ...hours, closed: !e.target.checked },
                                },
                              })
                            }
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': { color: primary },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                backgroundColor: primary,
                              },
                            }}
                          />
                        </Box>
                      </Box>
                      {!hours.closed ? (
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                          <TextField
                            label="Open"
                            type="time"
                            size="small"
                            fullWidth
                            value={hours.open}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                operatingHours: {
                                  ...settings.operatingHours,
                                  [day]: { ...hours, open: e.target.value },
                                },
                              })
                            }
                            InputLabelProps={{ shrink: true }}
                            sx={timeInputFieldSx}
                          />
                          <TextField
                            label="Close"
                            type="time"
                            size="small"
                            fullWidth
                            value={hours.close}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                operatingHours: {
                                  ...settings.operatingHours,
                                  [day]: { ...hours, close: e.target.value },
                                },
                              })
                            }
                            InputLabelProps={{ shrink: true }}
                            sx={timeInputFieldSx}
                          />
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="error" sx={{ textAlign: 'center', py: 1 }}>
                          Closed
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default AdminSettings;
