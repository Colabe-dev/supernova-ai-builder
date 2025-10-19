export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  
  dev: {
    fsEnable: process.env.DEV_FS_ENABLE === 'true',
    terminalEnable: process.env.DEV_TERMINAL_ENABLE === 'true',
    iapOpen: process.env.DEV_IAP_OPEN === 'true',
    approvalsOpen: process.env.DEV_APPROVALS_OPEN === 'true',
  },
  
  sentry: {
    dsn: process.env.SENTRY_DSN || '',
    environment: process.env.SENTRY_ENV || process.env.NODE_ENV || 'development',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    enabled: Boolean(process.env.SENTRY_DSN),
  },
  
  collabPay: {
    apiBase: process.env.COLLAB_PAY_API_BASE || 'http://localhost:4000',
    secret: process.env.COLLAB_PAY_SECRET || 'dev',
  },
  
  iap: {
    strict: process.env.IAP_STRICT === 'true',
    googleServiceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '',
    googlePackageName: process.env.GOOGLE_PACKAGE_NAME || 'com.collab.supernova',
    appleBundleId: process.env.APPLE_BUNDLE_ID || 'com.collab.supernova',
    useSandbox: process.env.IAP_USE_SANDBOX !== 'false',
  },
  
  jwt: {
    secret: process.env.APP_JWT_SECRET || 'dev-jwt-secret-change-in-production',
  },
  
  session: {
    secret: process.env.SESSION_SECRET || 'dev-session-secret-change-in-production',
  },
};
