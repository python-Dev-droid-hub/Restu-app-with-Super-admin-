import { logger } from '@/utils/logger';

const PLACEHOLDER_SECRETS = [
  'your_super_secret_jwt_key_here',
  'your_super_secret_refresh_key_here',
  'sk_test_your_key_here',
  'sk_test_your_secret_key_here',
];

export function validateProductionEnv(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'MONGODB_URI'] as const;
  for (const key of required) {
    if (!process.env[key]?.trim()) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET'] as const) {
    const value = process.env[key] || '';
    if (value.length < 32 || PLACEHOLDER_SECRETS.includes(value)) {
      throw new Error(`${key} must be a strong random string (32+ chars), not a placeholder`);
    }
  }

  if (!process.env.CORS_ORIGIN?.trim() && !process.env.SERVER_URL?.trim()) {
    logger.warn(
      'CORS_ORIGIN and SERVER_URL are unset in production — browser clients on another host/port will be blocked'
    );
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET?.trim()) {
    logger.warn('STRIPE_WEBHOOK_SECRET is not set — Stripe webhooks will be rejected');
  }

  logger.info('Production environment validation passed');
}
