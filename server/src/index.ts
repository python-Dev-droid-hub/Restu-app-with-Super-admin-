import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

import { connectDatabase } from '@/config/database';
import { logger } from '@/utils/logger';
import { errorHandler } from '@/middleware/errorHandler';
import { notFoundHandler } from '@/middleware/notFoundHandler';

// Import routes
import authRoutes from '@/modules/auth/auth.routes';
import userRoutes from '@/modules/user/user.routes';
import restaurantRoutes from '@/modules/restaurant/restaurant.routes';
import branchRoutes from '@/modules/branch/branch.routes';
import menuRoutes from '@/modules/menu/menu.routes';
import orderRoutes from '@/modules/order/order.routes';
import dashboardRoutes from '@/modules/dashboard/dashboard.routes';
import favoriteRoutes from '@/modules/favorite/favorite.routes';
import settingsRoutes from '@/modules/settings/settings.routes';
import notificationRoutes from '@/modules/notification/notification.routes';
import dealRoutes from '@/modules/deal/deal.routes';
import couponRoutes from '@/modules/coupon/coupon.routes';
import productSizeRoutes from '@/modules/product-size/product-size.routes';
import sizesRoutes from '@/modules/product-size/sizes.routes';
import uploadRoutes from '@/modules/upload/upload.routes';
import tableRoutes from '@/modules/table/table.routes';
import inventoryRoutes from '@/modules/inventory/inventory.routes';
import paymentRoutes from '@/modules/payment/payment.routes';
import customerRoutes from './routes/customer.routes';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Rate limiting - more lenient for development
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // 1000 requests per window for development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development', // Skip rate limiting in dev
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(limiter);
app.use(cors({
  origin: [
    'http://localhost:5173',  // Vite dev server
    'http://localhost:3001',  // Original dev server
    'http://localhost:3000',  // Another common port
    ...(process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : [])
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/product-sizes', productSizeRoutes);
app.use('/api/sizes', sizesRoutes); // Dedicated routes for size CRUD
app.use('/api/tables', tableRoutes); // Table management routes
app.use('/api/inventory', inventoryRoutes); // Inventory management routes
app.use('/api/payments', paymentRoutes); // Payment processing routes
app.use('/api/customer', customerRoutes); // Customer app routes
app.use('/api', uploadRoutes); // Upload routes at /api/upload

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('Database connected successfully');

    // Start listening
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server is running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      logger.info(`Health check available at http://localhost:${PORT}/health`);
      logger.info(`Network access: http://0.0.0.0:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();

export default app;
