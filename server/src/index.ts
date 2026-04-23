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
import customerRoutes from './routes/customer.routes';
import { initWebSocket } from '@/config/websocket';

// Load environment variables
dotenv.config();

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
  skip: (req) => process.env.NODE_ENV === 'development', // Skip rate limiting in dev
});

// Stricter rate limiting for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 login/register requests per window
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development',
});

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "*"], // Allow images from any source for now due to dynamic uploads
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "ws:", "wss:", "*"], // Allow WS connections
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));
app.use(compression());
app.use(xss()); // Prevent XSS attacks
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(hpp()); // Prevent HTTP Parameter Pollution
app.use('/api/', generalLimiter); // Apply general limiter to all API routes
app.use('/api/auth/', authLimiter); // Apply stricter limiter to auth routes

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5175',
  'http://localhost:3000',
  'http://localhost:3001',
];

if (process.env.CORS_ORIGIN) {
  allowedOrigins.push(...process.env.CORS_ORIGIN.split(',').map(o => o.trim()));
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded images (public)
// In dev mode with ts-node, __dirname is the src folder
app.use('/uploads', (req, res, next) => {
  // Set CORS headers for images
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadsPathPrimary), express.static(uploadsPathFallback));
logger.info(`Serving uploads from: ${uploadsPathPrimary}${uploadsPathFallback !== uploadsPathPrimary ? ` (fallback: ${uploadsPathFallback})` : ''}`);

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
app.use('/api/banners', bannerRoutes); // Banner management routes
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
