import mongoose from 'mongoose';
import { SystemSettings } from '@/superadmin/models/SystemSettings';
import { getPlatformSettings, updatePlatformSettings } from '@/superadmin/services/platformSettings.service';
import {
  SECTION_KEYS,
  SECRET_MASK,
  SECRET_FIELDS,
  SettingsSectionKey,
  sectionDefaults,
} from '@/superadmin/services/systemSettings.defaults';

const PLATFORM_GENERAL_MAP: Record<string, string> = {
  platformName: 'platformName',
  supportEmail: 'supportEmail',
  supportPhone: 'supportPhone',
  defaultTimezone: 'defaultTimezone',
  defaultCurrency: 'defaultCurrency',
  trialPeriodDays: 'trialPeriodDays',
  defaultPlanId: 'defaultPlanId',
  maintenanceMode: 'maintenanceMode',
};

function deepMerge<T extends Record<string, unknown>>(base: T, patch: Partial<T>): T {
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof out[k] === 'object' && out[k] !== null) {
      out[k as keyof T] = deepMerge(out[k] as Record<string, unknown>, v as Record<string, unknown>) as T[keyof T];
    } else if (v !== undefined) {
      out[k as keyof T] = v as T[keyof T];
    }
  }
  return out;
}

function maskSection(section: SettingsSectionKey, data: Record<string, unknown>) {
  const secrets = SECRET_FIELDS[section] || [];
  const out = { ...data };
  for (const field of secrets) {
    if (out[field]) {
      out[field] = SECRET_MASK;
      out[`${field}Configured`] = true;
    } else {
      out[`${field}Configured`] = false;
    }
  }
  return out;
}

function stripMaskedSecrets(
  section: SettingsSectionKey,
  patch: Record<string, unknown>,
  existing: Record<string, unknown>
) {
  const secrets = SECRET_FIELDS[section] || [];
  const out = { ...patch };
  for (const field of secrets) {
    if (out[field] === SECRET_MASK || out[field] === '') {
      delete out[field];
    } else if (out[field] === undefined) {
      // keep undefined as skip
    } else if (existing[field]) {
      // new value provided
    }
  }
  return out;
}

async function getSectionDoc(key: SettingsSectionKey) {
  let doc = await SystemSettings.findOne({ key });
  if (!doc) {
    doc = await SystemSettings.create({ key, value: sectionDefaults()[key] });
  }
  return doc;
}

async function buildGeneralSection() {
  const platform = await getPlatformSettings();
  const doc = await getSectionDoc('general');
  const base = sectionDefaults().general;
  const p = platform.toObject ? platform.toObject() : platform;
  return deepMerge(base as Record<string, unknown>, {
    ...doc.value,
    platformName: p.platformName,
    supportEmail: p.supportEmail,
    supportPhone: p.supportPhone || '',
    defaultTimezone: p.defaultTimezone,
    defaultCurrency: p.defaultCurrency,
    trialPeriodDays: p.trialPeriodDays ?? 14,
    defaultPlanId: p.defaultPlanId?._id || p.defaultPlanId || null,
    platformLogoUrl: p.platformLogoUrl || '',
  });
}

async function buildMaintenanceSection() {
  const platform = await getPlatformSettings();
  const doc = await getSectionDoc('maintenance');
  const base = sectionDefaults().maintenance;
  const p = platform.toObject ? platform.toObject() : platform;
  return deepMerge(base as Record<string, unknown>, {
    ...doc.value,
    maintenanceMode: Boolean(p.maintenanceMode),
  });
}

export async function getAllSystemSettings() {
  const result: Record<string, unknown> = {};
  for (const key of SECTION_KEYS) {
    if (key === 'general') {
      result.general = maskSection('general', await buildGeneralSection());
    } else if (key === 'maintenance') {
      result.maintenance = await buildMaintenanceSection();
    } else {
      const doc = await getSectionDoc(key);
      const merged = deepMerge(
        sectionDefaults()[key] as Record<string, unknown>,
        (doc.value || {}) as Record<string, unknown>
      );
      result[key] = maskSection(key, merged);
    }
  }
  return result;
}

export async function updateSystemSection(section: SettingsSectionKey, patch: Record<string, unknown>) {
  if (!SECTION_KEYS.includes(section)) {
    throw new Error('Invalid settings section');
  }

  if (section === 'general') {
    const doc = await getSectionDoc('general');
    const platformPatch: Record<string, unknown> = {};
    const sectionPatch: Record<string, unknown> = { ...patch };

    for (const [patchKey, platformKey] of Object.entries(PLATFORM_GENERAL_MAP)) {
      if (patch[patchKey] !== undefined) {
        platformPatch[platformKey] = patch[patchKey];
        delete sectionPatch[patchKey];
      }
    }
    if (patch.platformLogoUrl !== undefined) {
      platformPatch.platformLogoUrl = patch.platformLogoUrl;
      delete sectionPatch.platformLogoUrl;
    }

    if (Object.keys(platformPatch).length) {
      await updatePlatformSettings(platformPatch);
    }

    const merged = deepMerge(
      sectionDefaults().general as Record<string, unknown>,
      deepMerge((doc.value || {}) as Record<string, unknown>, sectionPatch)
    );
    doc.value = merged;
    await doc.save();
    return maskSection('general', await buildGeneralSection());
  }

  if (section === 'maintenance') {
    const doc = await getSectionDoc('maintenance');
    const sectionPatch = { ...patch };
    if (patch.maintenanceMode !== undefined) {
      await updatePlatformSettings({ maintenanceMode: patch.maintenanceMode });
      delete sectionPatch.maintenanceMode;
    }
    doc.value = deepMerge(
      sectionDefaults().maintenance as Record<string, unknown>,
      deepMerge((doc.value || {}) as Record<string, unknown>, sectionPatch)
    );
    await doc.save();
    return buildMaintenanceSection();
  }

  const doc = await getSectionDoc(section);
  const existing = deepMerge(
    sectionDefaults()[section] as Record<string, unknown>,
    (doc.value || {}) as Record<string, unknown>
  );
  const cleaned = stripMaskedSecrets(section, patch, existing);
  doc.value = deepMerge(existing, cleaned);
  await doc.save();
  return maskSection(section, doc.value as Record<string, unknown>);
}

export async function getSystemInfo() {
  const dbState = mongoose.connection.readyState;
  const dbLabels: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return {
    platformVersion: process.env.npm_package_version || '1.0.0',
    nodeVersion: process.version,
    databaseStatus: dbLabels[dbState] || 'unknown',
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
  };
}
