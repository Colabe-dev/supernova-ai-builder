import { z } from 'zod';
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development','test','production']).default('development'),
  PORT: z.string().default('3001'),

  SENTRY_DSN: z.string().optional(),
  SENTRY_ENV: z.string().optional(),

  DATABASE_URL: z.string(),

  AUTH_JWKS_URL: z.string().url().optional(),
  AUTH_ISSUER: z.string().optional(),
  AUTH_AUDIENCE: z.string().optional(),
  DEV_AUTH_OPEN: z.enum(['true','false']).optional(),

  REDIS_URL: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.string().optional(),
  RATE_LIMIT_READ_MAX: z.string().optional(),
  RATE_LIMIT_WRITE_MAX: z.string().optional(),
  RATE_LIMIT_WEBHOOK_MAX: z.string().optional(),

  COLLAB_PAY_API_BASE: z.string().optional(),
  COLLAB_PAY_SECRET: z.string().optional(),
  COLLAB_PAY_WEBHOOK_SECRET: z.string().optional(),

  IAP_STRICT: z.enum(['true','false']).optional(),
  DEV_IAP_OPEN: z.enum(['true','false']).optional(),
  GOOGLE_SERVICE_ACCOUNT_KEY: z.string().optional(),
  GOOGLE_PACKAGE_NAME: z.string().optional(),
  APPLE_BUNDLE_ID: z.string().optional(),
  IAP_USE_SANDBOX: z.enum(['true','false']).optional(),
  APPLE_SHARED_SECRET: z.string().optional()
}).strict();
