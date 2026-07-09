import { PlatformSettings } from '@/superadmin/models/PlatformSettings';

export async function getPlatformSettings() {
  let settings = await PlatformSettings.findOne({ key: 'platform' }).populate('defaultPlanId', 'name');
  if (!settings) {
    settings = await PlatformSettings.create({ key: 'platform' });
  }
  return settings;
}

export async function updatePlatformSettings(patch: Record<string, unknown>) {
  const settings = await PlatformSettings.findOneAndUpdate(
    { key: 'platform' },
    { $set: patch },
    { new: true, upsert: true }
  ).populate('defaultPlanId', 'name');
  return settings;
}

export async function isMaintenanceMode(): Promise<boolean> {
  const settings = await getPlatformSettings();
  return Boolean(settings.maintenanceMode);
}
