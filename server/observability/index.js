import pino from 'pino';
import pinoHttp from 'pino-http';
import * as Sentry from '@sentry/node';
import { config } from '../env/index.js';

const logger = pino({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  transport: config.nodeEnv === 'development' 
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
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

export function applyObservability(app) {
  if (config.sentry.enabled) {
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
  }
  
  app.use(pinoHttp({ logger }));
  
  logger.info('Observability applied', {
    sentry: config.sentry.enabled,
    environment: config.nodeEnv,
  });
}

export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  logger.error({
    err,
    req: {
      method: req.method,
      url: req.url,
      headers: req.headers,
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
