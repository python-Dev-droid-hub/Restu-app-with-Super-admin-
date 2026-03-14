import mongoose from 'mongoose';
import { logger } from '@/utils/logger';

// Import all models to ensure they are registered with Mongoose
import '@/models/User';
import '@/models/Branch';
import '@/models/RestaurantTable';
import '@/models/CustomerAddress';
import '@/models/Product';
import '@/models/Category';
import '@/models/Size';
import '@/models/ProductSize';
import '@/models/ProductCustomization';
import '@/models/Deal';
import '@/models/DealProduct';
import '@/models/Coupon';
import '@/models/Order';
import '@/models/OrderRejection';
import '@/models/Payment';
import '@/models/Notification';
import '@/models/BranchInventory';
import '@/models/SystemSetting';
import '@/models/Banner';
import '@/models/Restaurant'; // Legacy
import '@/models/Menu'; // Legacy

/**
 * Logs all registered Mongoose models and their collections
 */
export function logRegisteredModels(): void {
  const models = mongoose.modelNames();
  logger.info(`Registered Mongoose models (${models.length}): ${models.join(', ')}`);

  // Log collection names
  const collections = models.map(modelName => {
    const model = mongoose.model(modelName);
    return model.collection.name;
  });

  logger.info(`MongoDB collections to be created: ${collections.join(', ')}`);
}

/**
 * Gets all registered model names
 */
export function getRegisteredModels(): string[] {
  return mongoose.modelNames();
}

/**
 * Checks if a model is registered
 */
export function isModelRegistered(modelName: string): boolean {
  return mongoose.modelNames().includes(modelName);
}
