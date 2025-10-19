import pino from 'pino';
import pinoHttp from 'pino-http';
import * as Sentry from '@sentry/node';
import { config } from '../env/index.js';

const logger = pino({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  transport: config.nodeEnv === 'development' 
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-api-key"]',
      'req.headers["x-auth-token"]',
      'req.headers["x-session-id"]',
      'req.headers["set-cookie"]',
    ],
    censor: '[REDACTED]',
  },
});

if (config.sentry.enabled) {
  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.sentry.environment,
    tracesSampleRate: config.sentry.tracesSampleRate,
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
    ],
  });
  logger.info('Sentry initialized for environment: ' + config.sentry.environment);
}

const SAFE_HEADER_KEYS = [
  'user-agent',
  'content-type',
  'content-length',
  'accept',
  'accept-encoding',
  'accept-language',
  'host',
  'referer',
  'x-forwarded-for',
  'x-forwarded-proto',
];

function redactSensitiveHeaders(headers) {
  const safe = {};
  for (const key of SAFE_HEADER_KEYS) {
    if (headers[key]) {
      safe[key] = headers[key];
    }
  }
  return safe;
}

function sanitizeQuery(query) {
  if (config.nodeEnv === 'production') {
    return '[REDACTED IN PRODUCTION]';
  }
  if (!query || Object.keys(query).length === 0) {
    return {};
  }
  const SENSITIVE_PARAMS = ['token', 'api_key', 'apikey', 'key', 'secret', 'password', 'auth'];
  const safe = {};
  for (const [key, value] of Object.entries(query)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_PARAMS.some(param => lowerKey.includes(param))) {
      safe[key] = '[REDACTED]';
    } else {
      safe[key] = value;
    }
  }
  return safe;
}

export function applyObservability(app) {
  if (config.sentry.enabled) {
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
  }
  
  app.use(pinoHttp({ 
    logger,
    customAttributeKeys: {
      req: 'request',
      res: 'response',
      err: 'error',
      responseTime: 'timeTaken'
    },
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url,
          query: sanitizeQuery(req.query),
          params: req.params,
          headers: redactSensitiveHeaders(req.headers || req.raw?.headers || {}),
          remoteAddress: req.remoteAddress,
          remotePort: req.remotePort,
        };
      },
    },
  }));
  
  logger.info('Observability applied', {
    sentry: config.sentry.enabled,
    environment: config.nodeEnv,
  });
}

const SAFE_HEADERS = [
  'user-agent',
  'content-type',
  'content-length',
  'accept',
  'accept-encoding',
  'accept-language',
  'host',
  'referer',
  'x-forwarded-for',
  'x-forwarded-proto',
];

function redactHeaders(headers) {
  const safe = {};
  for (const key of SAFE_HEADERS) {
    if (headers[key]) {
      safe[key] = headers[key];
    }
  }
  return safe;
}

export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  logger.error({
    err,
    req: {
      method: req.method,
      url: req.url,
      headers: redactHeaders(req.headers),
      query: sanitizeQuery(req.query),
      params: req.params,
    },
    status,
  }, 'Request error');
  
  if (config.sentry.enabled) {
    Sentry.captureException(err);
  }
  
  res.status(status).json({ 
    error: message,
    ...(config.nodeEnv === 'development' && { stack: err.stack })
  });
}

export { logger };
