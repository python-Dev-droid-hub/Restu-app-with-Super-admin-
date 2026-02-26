import { useState, useEffect } from 'react';
import { api } from '../../api/client';

interface SystemSettings {
  restaurantName: string;
  restaurantDescription?: string;
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
  paymentSettings: {
    cashOnDelivery: boolean;
    cardPayment: boolean;
  };
  notifications: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
  };
}

export function Settings() {
  const [activeSection, setActiveSection] = useState<'general' | 'notifications' | 'security'>('general');
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<SystemSettings>('/settings');
      if (response.success && response.data) {
        setSettings(response.data);
      } else {
        setError('Failed to load settings');
      }
    } catch (err) {
      setError('Failed to load settings');
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await api.put('/settings', settings);
      if (response.success) {
        setSuccess('Settings saved successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.message || 'Failed to save settings');
      }
    } catch (err) {
      setError('Failed to save settings');
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (updates: Partial<SystemSettings>) => {
    if (settings) {
      setSettings({ ...settings, ...updates });
    }
  };

  const updateAddress = (addressUpdates: Partial<SystemSettings['address']>) => {
    if (settings) {
      setSettings({
        ...settings,
        address: { ...settings.address, ...addressUpdates }
      });
    }
  };

  const updateOperatingHours = (day: keyof SystemSettings['operatingHours'], updates: Partial<SystemSettings['operatingHours'][typeof day]>) => {
    if (settings) {
      setSettings({
        ...settings,
        operatingHours: {
          ...settings.operatingHours,
          [day]: { ...settings.operatingHours[day], ...updates }
        }
      });
    }
  };

  const updateDeliverySettings = (updates: Partial<SystemSettings['deliverySettings']>) => {
    if (settings) {
      setSettings({
        ...settings,
        deliverySettings: { ...settings.deliverySettings, ...updates }
      });
    }
  };

  const updateNotifications = (updates: Partial<SystemSettings['notifications']>) => {
    if (settings) {
      setSettings({
        ...settings,
        notifications: { ...settings.notifications, ...updates }
      });
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div>Loading settings...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#dc3545' }}>
        <div>Failed to load settings</div>
        <button onClick={loadSettings} style={{ marginTop: '16px', padding: '8px 16px' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ margin: '0 0 24px 0', color: '#1a1a2e' }}>System Settings</h2>

      {/* Error/Success Messages */}
      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '6px',
          border: '1px solid #ffcdd2',
          marginBottom: '16px',
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#e8f5e9',
          color: '#2e7d32',
          borderRadius: '6px',
          border: '1px solid #c8e6c9',
          marginBottom: '16px',
        }}>
          {success}
        </div>
      )}

      {/* Settings Navigation */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '1px solid #ddd',
        paddingBottom: '16px',
      }}>
        {[
          { key: 'general', label: 'General', icon: '⚙️' },
          { key: 'notifications', label: 'Notifications', icon: '🔔' },
          { key: 'security', label: 'Security', icon: '🔒' },
        ].map((section) => (
          <button
            key={section.key}
            onClick={() => setActiveSection(section.key as typeof activeSection)}
            style={{
              padding: '10px 20px',
              backgroundColor: activeSection === section.key ? '#1976d2' : 'transparent',
              color: activeSection === section.key ? '#fff' : '#666',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>{section.icon}</span>
            {section.label}
          </button>
        ))}
      </div>

      {/* Settings Content */}
      {activeSection === 'general' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#1a1a2e' }}>Restaurant Information</h3>
            <div style={{ display: 'grid', gap: '16px', maxWidth: '500px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '8px' }}>Restaurant Name</label>
                <input
                  type="text"
                  value={settings.restaurantName}
                  onChange={(e) => updateSettings({ restaurantName: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '8px' }}>Restaurant Description</label>
                <textarea
                  value={settings.restaurantDescription || ''}
                  onChange={(e) => updateSettings({ restaurantDescription: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', resize: 'vertical' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '8px' }}>Contact Email</label>
                <input
                  type="email"
                  value={settings.contactEmail}
                  onChange={(e) => updateSettings({ contactEmail: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '8px' }}>Phone Number</label>
                <input
                  type="tel"
                  value={settings.contactPhone}
                  onChange={(e) => updateSettings({ contactPhone: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                />
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#1a1a2e' }}>Address</h3>
            <div style={{ display: 'grid', gap: '16px', maxWidth: '500px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '8px' }}>Street Address</label>
                <input
                  type="text"
                  value={settings.address.street}
                  onChange={(e) => updateAddress({ street: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '8px' }}>City</label>
                  <input
                    type="text"
                    value={settings.address.city}
                    onChange={(e) => updateAddress({ city: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '8px' }}>State</label>
                  <input
                    type="text"
                    value={settings.address.state}
                    onChange={(e) => updateAddress({ state: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '8px' }}>ZIP Code</label>
                  <input
                    type="text"
                    value={settings.address.zipCode}
                    onChange={(e) => updateAddress({ zipCode: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '8px' }}>Country</label>
                  <input
                    type="text"
                    value={settings.address.country}
                    onChange={(e) => updateAddress({ country: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#1a1a2e' }}>Business Hours</h3>
            <div style={{ display: 'grid', gap: '12px', maxWidth: '500px' }}>
              {Object.entries(settings.operatingHours).map(([day, hours]) => (
                <div key={day} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px', color: '#666', textTransform: 'capitalize' }}>{day}</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={!hours.closed}
                      onChange={(e) => updateOperatingHours(day as keyof SystemSettings['operatingHours'], { closed: !e.target.checked })}
                      style={{ width: '16px', height: '16px' }}
                    />
                    {!hours.closed && (
                      <>
                        <input
                          type="time"
                          value={hours.open}
                          onChange={(e) => updateOperatingHours(day as keyof SystemSettings['operatingHours'], { open: e.target.value })}
                          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                        />
                        <span style={{ color: '#666' }}>to</span>
                        <input
                          type="time"
                          value={hours.close}
                          onChange={(e) => updateOperatingHours(day as keyof SystemSettings['operatingHours'], { close: e.target.value })}
                          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                        />
                      </>
                    )}
                    {hours.closed && <span style={{ color: '#666', fontSize: '14px' }}>Closed</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSection === 'notifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#1a1a2e' }}>Notification Preferences</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #eee' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a2e' }}>New Order Notifications</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Get notified when a new order is placed</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.emailNotifications}
                  onChange={(e) => updateNotifications({ emailNotifications: e.target.checked })}
                  style={{ width: '20px', height: '20px' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #eee' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a2e' }}>Order Status Updates</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Get notified when order status changes</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.pushNotifications}
                  onChange={(e) => updateNotifications({ pushNotifications: e.target.checked })}
                  style={{ width: '20px', height: '20px' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #eee' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a2e' }}>Low Inventory Alerts</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Get notified when inventory is running low</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.emailNotifications}
                  onChange={(e) => updateNotifications({ emailNotifications: e.target.checked })}
                  style={{ width: '20px', height: '20px' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a2e' }}>SMS Notifications</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Receive SMS alerts for important events</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.smsNotifications}
                  onChange={(e) => updateNotifications({ smsNotifications: e.target.checked })}
                  style={{ width: '20px', height: '20px' }}
                />
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#1a1a2e' }}>Delivery Settings</h3>
            <div style={{ display: 'grid', gap: '16px', maxWidth: '500px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '8px' }}>Delivery Radius (km)</label>
                <input
                  type="number"
                  value={settings.deliverySettings.deliveryRadius}
                  onChange={(e) => updateDeliverySettings({ deliveryRadius: parseFloat(e.target.value) || 0 })}
                  min="1"
                  max="50"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '8px' }}>Delivery Fee ($)</label>
                <input
                  type="number"
                  value={settings.deliverySettings.deliveryFee}
                  onChange={(e) => updateDeliverySettings({ deliveryFee: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '8px' }}>Minimum Order ($)</label>
                <input
                  type="number"
                  value={settings.deliverySettings.minimumOrder}
                  onChange={(e) => updateDeliverySettings({ minimumOrder: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '8px' }}>Estimated Delivery Time (minutes)</label>
                <input
                  type="number"
                  value={settings.deliverySettings.estimatedDeliveryTime}
                  onChange={(e) => updateDeliverySettings({ estimatedDeliveryTime: parseInt(e.target.value) || 0 })}
                  min="5"
                  max="120"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#1a1a2e' }}>Password Settings</h3>
            <div style={{ display: 'grid', gap: '16px', maxWidth: '400px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '8px' }}>Current Password</label>
                <input
                  type="password"
                  placeholder="Enter current password"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '8px' }}>New Password</label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '8px' }}>Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                />
              </div>
              <button
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginTop: '8px',
                }}
              >
                Update Password
              </button>
            </div>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#1a1a2e' }}>Two-Factor Authentication</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a2e' }}>Enable 2FA</div>
                <div style={{ fontSize: '12px', color: '#666' }}>Add an extra layer of security to your account</div>
              </div>
              <button
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#e8f5e9',
                  color: '#2e7d32',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                Enable
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={saveSettings}
          disabled={saving}
          style={{
            padding: '12px 32px',
            backgroundColor: saving ? '#ccc' : '#1976d2',
            color: saving ? '#666' : '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
