import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
const xss = require('xss-clean');
import mongoSanitize from 'express-mongo-sanitize';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';

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
import inventoryRoutes from './modules/inventory/inventory.routes';
import paymentRoutes from './modules/payment/payment.routes';
import bannerRoutes from './modules/banner/banner.routes';
import printerRoutes from './modules/printer/printer.routes';
import customerRoutes from './routes/customer.routes';
import { initWebSocket } from '@/config/websocket';
import { validateProductionEnv } from '@/config/validateEnv';
import { buildCorsOptions } from '@/config/cors';
import { handleStripeWebhook } from '@/modules/payment/stripeWebhook.handler';

// Load environment variables
dotenv.config();
validateProductionEnv();

const app: Express = express();
const PORT = parseInt(process.env.PORT || '3101', 10);
const serverRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(serverRoot, '..');
const uploadPathEnv = process.env.UPLOAD_PATH || 'uploads';
const uploadsPathPrimary = path.isAbsolute(uploadPathEnv) ? uploadPathEnv : path.join(serverRoot, uploadPathEnv);
const uploadsPathFallback = path.isAbsolute(uploadPathEnv) ? uploadPathEnv : path.join(repoRoot, uploadPathEnv);

if (!fs.existsSync(uploadsPathPrimary)) {
  fs.mkdirSync(uploadsPathPrimary, { recursive: true });
}

const ws = initWebSocket(app);

app.locals.ws = ws;

(globalThis as any).ws = ws;

// Rate limiting - General API limiter
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // 1000 requests per window
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    req.method === 'OPTIONS' ||
    process.env.NODE_ENV === 'development' ||
    process.env.RATE_LIMIT_DISABLED === 'true',
});

// Stricter rate limiting for login/register only (not GET /auth/me)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '60', 10),
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    req.method === 'OPTIONS' ||
    req.method === 'GET' ||
    process.env.NODE_ENV === 'development' ||
    process.env.RATE_LIMIT_DISABLED === 'true',
});

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  app.set('trust proxy', 1);
}

// Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
    contentSecurityPolicy: isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            connectSrc: ["'self'", 'wss:'],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
          },
        }
      : false,
  })
);
app.use(compression());
app.use(xss()); // Prevent XSS attacks
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(hpp()); // Prevent HTTP Parameter Pollution

// CORS before rate limiters so preflight/429 responses still include ACAO headers
app.use(cors(buildCorsOptions(isProduction)));
app.options('*', cors(buildCorsOptions(isProduction)));
app.use(cookieParser());

app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);

// Stripe webhook must receive raw body (register before JSON parser)
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json', limit: '1mb' }),
  handleStripeWebhook
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded images (public)
// In dev mode with ts-node, __dirname is the src folder
app.use('/uploads', (req, res, next) => {
  // Set CORS headers for images
  if (!isProduction) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadsPathPrimary), express.static(uploadsPathFallback));
logger.info(`Serving uploads from: ${uploadsPathPrimary}${uploadsPathFallback !== uploadsPathPrimary ? ` (fallback: ${uploadsPathFallback})` : ''}`);

// Health check endpoint (minimal info in production)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    ...(isProduction ? {} : { uptime: process.uptime(), environment: process.env.NODE_ENV }),
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
app.use('/api/banners', bannerRoutes); // Banner management routes
app.use('/api/printers', printerRoutes);
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

    // Seed notifications if none exist
    const { seedNotifications } = await import('./scripts/seedNotifications');
    await seedNotifications();

    const listenOnPort = (port: number) =>
      new Promise<void>((resolve, reject) => {
        const server = ws.httpServer.listen(port, '0.0.0.0', () => {
          logger.info(`Server is running on port ${port} in ${process.env.NODE_ENV} mode`);
          logger.info(`Health check available at http://localhost:${port}/health`);
          logger.info(`Network access: http://0.0.0.0:${port}/health`);
          resolve();
        });
        server.once('error', reject);
      });

    try {
      await listenOnPort(PORT);
    } catch (error: any) {
      const isDev = process.env.NODE_ENV !== 'production';
      const fallbackPort = 3101;
      if (isDev && error?.code === 'EADDRINUSE' && PORT !== fallbackPort) {
        logger.warn(`Port ${PORT} is already in use. Falling back to ${fallbackPort}.`);
        await listenOnPort(fallbackPort);
      } else {
        throw error;
      }
    }
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
