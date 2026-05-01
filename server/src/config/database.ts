import mongoose from 'mongoose';
import { logger } from '@/utils/logger';
import { logRegisteredModels } from './models';

const DEFAULT_MONGODB_URI = 'mongodb://localhost:27019/restaurant_app';

export const connectDatabase = async (): Promise<void> => {
  try {
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    };

    const primaryUri = process.env.MONGODB_URI || DEFAULT_MONGODB_URI;
    try {
      await mongoose.connect(primaryUri, options);
    } catch (error: any) {
      const message = String(error?.message || '');
      const shouldTryFallback =
        message.includes('ECONNREFUSED') ||
        message.includes('MongoServerSelectionError') ||
        message.includes('Server selection timed out') ||
        message.includes('ENOTFOUND');

      if (!shouldTryFallback) throw error;

      const fallbackUri =
        primaryUri.includes('localhost:27019') || primaryUri.includes('127.0.0.1:27019')
          ? primaryUri.replace(':27019', ':27017')
          : primaryUri.includes('localhost:27017') || primaryUri.includes('127.0.0.1:27017')
          ? primaryUri.replace(':27017', ':27019')
          : '';

      if (!fallbackUri || fallbackUri === primaryUri) throw error;

      await mongoose.connect(fallbackUri, options);
    }
    
    logger.info(`MongoDB connected: ${mongoose.connection.host}`);
    
    // Log all registered models after connection
    logRegisteredModels();
    
    // List actual collections in database
    if (mongoose.connection.db) {
      const collections = await mongoose.connection.db.listCollections().toArray();
      logger.info(`Existing collections in database: ${collections.map(c => c.name).join(', ') || 'None'}`);
    }

    // Handle connection events
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
    throw error;
  }
};
