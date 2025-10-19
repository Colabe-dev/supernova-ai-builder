import pino from 'pino';
import pinoHttp from 'pino-http';
import * as Sentry from '@sentry/node';

export const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export function applyObservability(app){
  app.use(pinoHttp({ logger }));
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENV || process.env.NODE_ENV || 'development',
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1)
    });
    app.use(Sentry.requestHandler());
    app.use(Sentry.tracingHandler());
  }
}
export function errorHandler(err, req, res, next){
  try { if (process.env.SENTRY_DSN) Sentry.captureException(err); } catch {}
  req.log?.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'internal' });
}
