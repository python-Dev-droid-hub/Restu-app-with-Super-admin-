import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface RestaurantSettings {
  restaurantName: string;
  address: string;
  phoneNumber: string;
  email: string;
  currency: string;
  taxRate: number;
  serviceCharge: number;
  deliveryFee: number;
  minOrderAmount: number;
  workingHours: {
    open: string;
    close: string;
  };
  isActive: boolean;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<RestaurantSettings>({
    restaurantName: '',
    address: '',
    phoneNumber: '',
    email: '',
    currency: 'PKR',
    taxRate: 16,
    serviceCharge: 0,
    deliveryFee: 50,
    minOrderAmount: 200,
    workingHours: {
      open: '09:00',
      close: '23:00',
    },
    isActive: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await api.getSettings();
      if (response.success && response.data) {
        const apiSettings = response.data as RestaurantSettings;
        // Ensure all fields have proper default values
        const settingsWithDefaults = {
          restaurantName: apiSettings.restaurantName || '',
          address: apiSettings.address || '',
          phoneNumber: apiSettings.phoneNumber || '',
          email: apiSettings.email || '',
          currency: apiSettings.currency || 'PKR',
          taxRate: apiSettings.taxRate || 16,
          serviceCharge: apiSettings.serviceCharge || 0,
          deliveryFee: apiSettings.deliveryFee || 50,
          minOrderAmount: apiSettings.minOrderAmount || 200,
          workingHours: {
            open: apiSettings.workingHours?.open || '09:00',
            close: apiSettings.workingHours?.close || '23:00',
          },
          isActive: apiSettings.isActive ?? true, // Use nullish coalescing for boolean
        };
        setSettings(settingsWithDefaults);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Use default values if API fails
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    
    try {
      setSaving(true);
      const response = await api.updateSettings(settings);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to save settings' });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'An error occurred while saving settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof RestaurantSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleWorkingHoursChange = (field: 'open' | 'close', value: string) => {
    setSettings((prev) => ({
      ...prev,
      workingHours: { ...prev.workingHours, [field]: value },
    }));
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure your restaurant settings</p>
        </div>
        <div className="page-header-right">
          <button 
            className="btn btn-primary" 
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? '⏳ Saving...' : '💾 Save Settings'}
          </button>
        </div>
      </div>

      {/* Page Content */}
      <div className="page-content">
        {message && (
          <div className={`alert alert-${message.type}`} style={{ marginBottom: '24px' }}>
            {message.text}
          </div>
        )}

        {/* Business Information Card */}
        <div className="content-card">
          <div className="content-card-header">
            <h2 className="content-card-title">🏢 Business Information</h2>
          </div>
          <div className="content-card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Restaurant Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={settings.restaurantName}
                    onChange={(e) => handleChange('restaurantName', e.target.value)}
                    placeholder="e.g., Gourmet Kitchen"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={settings.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="restaurant@example.com"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Address</label>
                <input
                  type="text"
                  className="form-input"
                  value={settings.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Full address"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  className="form-input"
                  value={settings.phoneNumber}
                  onChange={(e) => handleChange('phoneNumber', e.target.value)}
                  placeholder="+92xxxxxxxxxx"
                />
              </div>
            </form>
          </div>
        </div>

        {/* Pricing & Charges Card */}
        <div className="content-card">
          <div className="content-card-header">
            <h2 className="content-card-title">💰 Pricing & Charges</h2>
          </div>
          <div className="content-card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Currency</label>
                  <select
                    className="form-select"
                    value={settings.currency}
                    onChange={(e) => handleChange('currency', e.target.value)}
                  >
                    <option value="PKR">PKR - Pakistani Rupee</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Tax Rate (%)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={settings.taxRate}
                    onChange={(e) => handleChange('taxRate', parseFloat(e.target.value))}
                    min="0"
                    max="50"
                    step="0.1"
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Service Charge (%)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={settings.serviceCharge}
                    onChange={(e) => handleChange('serviceCharge', parseFloat(e.target.value))}
                    min="0"
                    max="20"
                    step="0.1"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Delivery Fee</label>
                  <input
                    type="number"
                    className="form-input"
                    value={settings.deliveryFee}
                    onChange={(e) => handleChange('deliveryFee', parseFloat(e.target.value))}
                    min="0"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Minimum Order Amount</label>
                <input
                  type="number"
                  className="form-input"
                  value={settings.minOrderAmount}
                  onChange={(e) => handleChange('minOrderAmount', parseFloat(e.target.value))}
                  min="0"
                />
              </div>
            </form>
          </div>
        </div>

        {/* Working Hours Card */}
        <div className="content-card">
          <div className="content-card-header">
            <h2 className="content-card-title">🕐 Working Hours</h2>
          </div>
          <div className="content-card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Opening Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={settings.workingHours.open}
                    onChange={(e) => handleWorkingHoursChange('open', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Closing Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={settings.workingHours.close}
                    onChange={(e) => handleWorkingHoursChange('close', e.target.value)}
                  />
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* System Status Card */}
        <div className="content-card">
          <div className="content-card-header">
            <h2 className="content-card-title">🔧 System Status</h2>
          </div>
          <div className="content-card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.isActive}
                    onChange={(e) => handleChange('isActive', e.target.checked)}
                  />
                  Restaurant is Active (Accepting Orders)
                </label>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
