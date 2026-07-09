import { Request, Response } from 'express';
import { sendSuccess } from '@/utils/response';
import { asyncHandler, IAuthRequest } from '@/utils';
import { getTenantIdFromRequest } from '@/utils/tenantScope';
import {
  getScopedSettings,
  updateScopedSettings,
  resetScopedSettings,
  getPublicScopedSettings,
} from './settings.service';

export class SettingsController {
  getSettings = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const tenantId = getTenantIdFromRequest(req);
    const settings = await getScopedSettings(tenantId);
    sendSuccess(res, settings, 'Settings retrieved successfully');
  });

  getPublicSettings = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantIdFromRequest(req as IAuthRequest);
    const publicSettings = await getPublicScopedSettings(tenantId);
    sendSuccess(res, publicSettings, 'Public settings retrieved successfully');
  });

  updateSettings = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const tenantId = getTenantIdFromRequest(req);
    const {
      _id,
      __v,
      createdAt,
      updatedAt,
      tenantId: _bodyTenantId,
      ...updateData
    } = req.body as Record<string, unknown>;
    const settings = await updateScopedSettings(tenantId, updateData);
    sendSuccess(res, settings, 'Settings updated successfully');
  });

  resetSettings = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const tenantId = getTenantIdFromRequest(req);
    const settings = await resetScopedSettings(tenantId);
    sendSuccess(res, settings, 'Settings reset to defaults successfully');
  });
}
