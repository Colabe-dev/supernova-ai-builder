import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import { applySecurity } from "./hardening.ts";
import { applyObservability, errorHandler } from "./observability/index.js";
import { createResponseLoggingMiddleware } from "./observability/response-logger.ts";
import webhooksRouter from "./entitlements/webhooks-enhanced.js";
import issuerRouter from "./auth/issuer/index.js";
import jwksRouter from "./auth/jwks/publish.js";
import { parseAuthJwks, requireAuth } from "./auth/verify.js";

function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Enable dev console features in development
if (process.env.NODE_ENV === "development") {
  process.env.DEV_FS_ENABLE = process.env.DEV_FS_ENABLE || "true";
  process.env.DEV_TERMINAL_ENABLE = process.env.DEV_TERMINAL_ENABLE || "true";
}

export function createApp(): Express {
  const app = express();
  const isTestEnv = process.env.NODE_ENV === "test";

  // Apply security hardening (helmet, CORS, rate limiting)
  if (!isTestEnv) {
    applySecurity(app);
  }

  // Apply observability (Pino logging + Sentry)
  if (!isTestEnv) {
    applyObservability(app);
  }

  // IMPORTANT: Register webhook routes BEFORE JSON body parsing
  // to allow raw body access for signature verification
  app.use('/api/webhooks', webhooksRouter);

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  // Mount Security Pro: JWKS endpoint and Auth Issuer
  app.use('/auth', jwksRouter);  // GET /auth/.well-known/jwks.json
  app.use('/auth', issuerRouter); // POST /auth/token

  app.use(createResponseLoggingMiddleware(log));

  return app;
}

if (process.env.NODE_ENV !== "test") {
  const app = createApp();

  (async () => {
    const { registerRoutes } = await import("./routes.ts");
    const { setupVite, serveStatic, log: viteLog } = await import("./vite.ts");
    const server = await registerRoutes(app);
    const runtimeLog = viteLog ?? log;

    // Use centralized error handler with Sentry integration
    app.use(errorHandler);

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      runtimeLog(`serving on port ${port}`);
    });
  })();
}
