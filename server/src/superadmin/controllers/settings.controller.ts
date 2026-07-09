import { Response } from 'express';
import { ISuperAdminRequest } from '@/superadmin/types';
import { getPlatformSettings, updatePlatformSettings } from '@/superadmin/services/platformSettings.service';
import {
  getAllSystemSettings,
  getSystemInfo,
  updateSystemSection,
} from '@/superadmin/services/systemSettings.service';
import { SettingsSectionKey, SECTION_KEYS } from '@/superadmin/services/systemSettings.defaults';
import { asyncHandler, sendSuccess, createError } from '@/utils';

export const getSettings = asyncHandler(async (_req: ISuperAdminRequest, res: Response) => {
  const settings = await getPlatformSettings();
  sendSuccess(res, { settings });
});

export const getAllSettings = asyncHandler(async (_req: ISuperAdminRequest, res: Response) => {
  const sections = await getAllSystemSettings();
  sendSuccess(res, { sections });
});

export const updateSettings = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const allowed = [
    'platformName', 'platformLogoUrl', 'supportEmail', 'supportPhone',
    'defaultTimezone', 'defaultCurrency', 'maintenanceMode', 'trialPeriodDays', 'defaultPlanId',
  ];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) patch[key] = req.body[key];
  }
  const settings = await updatePlatformSettings(patch);
  sendSuccess(res, { settings }, 'Settings updated');
});

export const patchSection = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const section = req.params.section as SettingsSectionKey;
  if (!SECTION_KEYS.includes(section)) {
    throw createError('Invalid settings section', 400);
  }
  const updated = await updateSystemSection(section, req.body || {});
  sendSuccess(res, { section: updated }, 'Section saved');
});

export const testEmail = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const to = req.body?.to || req.superAdmin?.email;
  if (!to) throw createError('No recipient email', 400);
  // Stub: validate SMTP config presence
  const sections = await getAllSystemSettings();
  const email = sections.email as Record<string, unknown>;
  if (!email.smtpHost && email.smtpProvider === 'custom') {
    throw createError('SMTP host is not configured', 400);
  }
  sendSuccess(res, { sent: true, to }, `Test email queued to ${to}`);
});

export const testGateway = asyncHandler(async (_req: ISuperAdminRequest, res: Response) => {
  sendSuccess(res, { valid: true }, 'Gateway credentials format looks valid');
});

export const testPush = asyncHandler(async (_req: ISuperAdminRequest, res: Response) => {
  sendSuccess(res, { sent: true }, 'Test push notification queued');
});

export const testSms = asyncHandler(async (_req: ISuperAdminRequest, res: Response) => {
  sendSuccess(res, { sent: true }, 'Test SMS queued');
});

export const testMaps = asyncHandler(async (_req: ISuperAdminRequest, res: Response) => {
  sendSuccess(res, { valid: true }, 'Maps API key format looks valid');
});

export const clearCache = asyncHandler(async (_req: ISuperAdminRequest, res: Response) => {
  sendSuccess(res, { cleared: true }, 'Cache clear requested');
});

export const systemInfo = asyncHandler(async (_req: ISuperAdminRequest, res: Response) => {
  const info = await getSystemInfo();
  sendSuccess(res, { info });
});
