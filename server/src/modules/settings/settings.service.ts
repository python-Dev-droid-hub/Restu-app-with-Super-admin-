import { Types } from 'mongoose';
import { SystemSettings, ISystemSettings } from '@/models/SystemSettings';
import { Tenant } from '@/superadmin/models/Tenant';
import { ITenantSettings } from '@/superadmin/types';

function legacyGlobalFilter(): Record<string, unknown> {
  return { $or: [{ tenantId: null }, { tenantId: { $exists: false } }] };
}

function tenantFilter(tenantId: string): Record<string, unknown> {
  return { tenantId: new Types.ObjectId(tenantId) };
}

export function buildDefaultSettingsFromTenant(tenant: {
  _id: Types.ObjectId;
  name: string;
  ownerEmail: string;
  ownerPhone: string;
  addressLine?: string;
  city?: string;
  country?: string;
  settings?: ITenantSettings | Record<string, unknown>;
}) {
  const ts = (tenant.settings || {}) as ITenantSettings;
  const currency = ts.currency || 'PKR';

  return {
    tenantId: tenant._id,
    restaurantName: tenant.name || 'Restaurant',
    restaurantDescription: `Welcome to ${tenant.name}`,
    appName: tenant.name || 'Restaurant App',
    appVersion: '1.0.0',
    contactEmail: tenant.ownerEmail || 'owner@restaurant.local',
    contactPhone: tenant.ownerPhone || '',
    defaultCurrency: currency,
    currency,
    defaultLanguage: ts.language || 'en',
    language: ts.language || 'en',
    taxRate: typeof ts.tax_rate === 'number' ? ts.tax_rate : 5,
    serviceCharge: typeof ts.service_charge === 'number' ? ts.service_charge : 0,
    maintenanceMode: false,
    allowRegistration: true,
    address: {
      street: tenant.addressLine || '',
      city: tenant.city || '',
      state: '',
      zipCode: '',
      country: tenant.country || 'Pakistan',
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
      deliveryFee: typeof ts.delivery_fee === 'number' ? ts.delivery_fee : 150,
      minimumOrder: 15,
      estimatedDeliveryTime: 30,
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
    },
    socialMedia: {},
  };
}

function buildLegacyDefaults() {
  return {
    restaurantName: 'Restaurant App',
    restaurantDescription: 'Welcome to our restaurant',
    appName: 'Restaurant App',
    appVersion: '1.0.0',
    contactEmail: 'contact@restaurant.com',
    contactPhone: '+1-234-567-8900',
    defaultCurrency: 'USD',
    currency: 'USD',
    defaultLanguage: 'en',
    language: 'en',
    taxRate: 0,
    serviceCharge: 0,
    maintenanceMode: false,
    allowRegistration: true,
    address: {
      street: '123 Main Street',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
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
      deliveryFee: 2.99,
      minimumOrder: 15,
      estimatedDeliveryTime: 30,
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
    },
    socialMedia: {},
  };
}

async function upsertScopedSettings(
  filter: Record<string, unknown>,
  defaults: Record<string, unknown>
): Promise<ISystemSettings> {
  const existing = await SystemSettings.findOne(filter);
  if (existing) return existing;

  try {
    const created = await SystemSettings.findOneAndUpdate(
      filter,
      { $setOnInsert: defaults },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (created) return created;
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 11000) {
      const raced = await SystemSettings.findOne(filter);
      if (raced) return raced;
    }
    throw err;
  }

  const fallback = await SystemSettings.findOne(filter);
  if (!fallback) {
    throw new Error('Failed to create settings document');
  }
  return fallback;
}

async function syncTenantPlanSettings(tenantId: string, settings: ISystemSettings) {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) return;

  const merged = {
    ...((tenant.settings as Record<string, unknown>) || {}),
    currency: settings.defaultCurrency || settings.currency || 'PKR',
    language: settings.defaultLanguage || settings.language || 'en',
    tax_rate: settings.taxRate ?? 0,
    service_charge: settings.serviceCharge ?? 0,
    delivery_fee: settings.deliverySettings?.deliveryFee ?? 0,
  };
  tenant.settings = merged as ITenantSettings;
  if (settings.restaurantName) tenant.name = settings.restaurantName;
  if (settings.contactEmail) tenant.ownerEmail = settings.contactEmail;
  if (settings.contactPhone) tenant.ownerPhone = settings.contactPhone;
  if (settings.address?.street) tenant.addressLine = settings.address.street;
  if (settings.address?.city) tenant.city = settings.address.city;
  if (settings.address?.country) tenant.country = settings.address.country;
  await tenant.save();
}

export async function getScopedSettings(tenantId?: string) {
  if (tenantId && Types.ObjectId.isValid(tenantId)) {
    const tenant = await Tenant.findById(tenantId);
    const defaults = tenant
      ? buildDefaultSettingsFromTenant(tenant)
      : { ...buildLegacyDefaults(), tenantId: new Types.ObjectId(tenantId) };
    return upsertScopedSettings(tenantFilter(tenantId), defaults);
  }

  return upsertScopedSettings(legacyGlobalFilter(), buildLegacyDefaults());
}

export async function updateScopedSettings(tenantId: string | undefined, updateData: Record<string, unknown>) {
  const settings = await getScopedSettings(tenantId);
  Object.assign(settings, updateData);
  await settings.save();

  if (tenantId) {
    await syncTenantPlanSettings(tenantId, settings);
  }

  return settings;
}

export async function resetScopedSettings(tenantId?: string) {
  if (tenantId && Types.ObjectId.isValid(tenantId)) {
    await SystemSettings.deleteMany(tenantFilter(tenantId));
    const tenant = await Tenant.findById(tenantId);
    const defaults = tenant
      ? buildDefaultSettingsFromTenant(tenant)
      : { ...buildLegacyDefaults(), tenantId: new Types.ObjectId(tenantId) };
    return upsertScopedSettings(tenantFilter(tenantId), defaults);
  }

  await SystemSettings.deleteMany(legacyGlobalFilter());
  return upsertScopedSettings(legacyGlobalFilter(), buildLegacyDefaults());
}

export async function getPublicScopedSettings(tenantId?: string) {
  const settings = await getScopedSettings(tenantId);
  return {
    restaurantName: settings.restaurantName,
    restaurantDescription: settings.restaurantDescription,
    contactEmail: settings.contactEmail,
    contactPhone: settings.contactPhone,
    address: settings.address,
    businessHours: settings.operatingHours,
    currency: settings.defaultCurrency || settings.currency || 'USD',
    taxRate: settings.taxRate ?? 0,
  };
}
