import { Request, Response } from 'express';
import { SystemSettings } from '@/models/SystemSettings';
import { sendSuccess, sendError } from '@/utils/response';
import { asyncHandler, IAuthRequest } from '@/utils';

export class SettingsController {
  // Get system settings
  getSettings = asyncHandler(async (req: Request, res: Response) => {
    let settings = await SystemSettings.findOne();

    // If no settings exist, create default settings
    if (!settings) {
      settings = new SystemSettings({
        restaurantName: 'Restaurant App',
        restaurantDescription: 'Welcome to our restaurant',
        contactEmail: 'contact@restaurant.com',
        contactPhone: '+1-234-567-8900',
        address: {
          street: '123 Main Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        }
      });
      await settings.save();
    }

    sendSuccess(res, settings, 'Settings retrieved successfully');
  });

  // Update system settings
  updateSettings = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const updateData = req.body;

    let settings = await SystemSettings.findOne();

    if (settings) {
      // Update existing settings
      Object.assign(settings, updateData);
      await settings.save();
    } else {
      // Create new settings
      settings = new SystemSettings(updateData);
      await settings.save();
    }

    sendSuccess(res, settings, 'Settings updated successfully');
  });

  // Reset settings to defaults
  resetSettings = asyncHandler(async (req: IAuthRequest, res: Response) => {
    await SystemSettings.deleteMany({});

    const defaultSettings = new SystemSettings({
      restaurantName: 'Restaurant App',
      restaurantDescription: 'Welcome to our restaurant',
      contactEmail: 'contact@restaurant.com',
      contactPhone: '+1-234-567-8900',
      address: {
        street: '123 Main Street',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA'
      }
    });

    await defaultSettings.save();

    sendSuccess(res, defaultSettings, 'Settings reset to defaults successfully');
  });
}
