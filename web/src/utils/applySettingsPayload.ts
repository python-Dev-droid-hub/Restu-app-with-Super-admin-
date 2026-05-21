/** Map API/socket settings payload into AdminSettings form state. */
export function mapSettingsPayload(data: Record<string, unknown>) {
  const d = data || {};
  return {
    appName: (d.appName as string) || (d.siteName as string) || 'Restaurant App',
    appVersion: (d.appVersion as string) || '1.0.0',
    restaurantName: (d.restaurantName as string) || '',
    restaurantDescription: (d.restaurantDescription as string) || (d.siteDescription as string) || '',
    defaultCurrency: (d.defaultCurrency as string) || (d.currency as string) || 'USD',
    currency: (d.currency as string) || (d.defaultCurrency as string) || 'USD',
    defaultLanguage: (d.defaultLanguage as string) || (d.language as string) || 'en',
    language: (d.language as string) || (d.defaultLanguage as string) || 'en',
    taxRate: (d.taxRate as number) || 0,
    serviceCharge: (d.serviceCharge as number) || 0,
    maintenanceMode: (d.maintenanceMode as boolean) ?? false,
    allowRegistration: (d.allowRegistration as boolean) ?? true,
    contactEmail: (d.contactEmail as string) || '',
    contactPhone: (d.contactPhone as string) || '',
    address: (d.address as object) || { street: '', city: '', state: '', zipCode: '', country: 'USA' },
    operatingHours: (d.operatingHours as object) || (d.businessHours as object) || {
      monday: { open: '09:00', close: '22:00', closed: false },
      tuesday: { open: '09:00', close: '22:00', closed: false },
      wednesday: { open: '09:00', close: '22:00', closed: false },
      thursday: { open: '09:00', close: '22:00', closed: false },
      friday: { open: '09:00', close: '22:00', closed: false },
      saturday: { open: '09:00', close: '22:00', closed: false },
      sunday: { open: '09:00', close: '22:00', closed: true },
    },
    deliverySettings: (d.deliverySettings as object) || {
      deliveryRadius: 10,
      deliveryFee: 0,
      minimumOrder: 0,
      estimatedDeliveryTime: 30,
    },
    notifications: (d.notifications as object) || {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
    },
    socialMedia: (d.socialMedia as object) || (d.socialLinks as object) || {},
  };
}
