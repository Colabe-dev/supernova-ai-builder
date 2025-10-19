import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { applySecurity } from "./hardening";
import { applyObservability, errorHandler } from "./observability/index.js";
import webhooksRouter from "./entitlements/webhooks.db.js";
import issuerRouter from "./auth/issuer/index.js";
import jwksRouter from "./auth/jwks/publish.js";
import { parseAuthJwks, requireAuth } from "./auth/verify.js";

// Enable dev console features in development
if (process.env.NODE_ENV === "development") {
  process.env.DEV_FS_ENABLE = process.env.DEV_FS_ENABLE || "true";
  process.env.DEV_TERMINAL_ENABLE = process.env.DEV_TERMINAL_ENABLE || "true";
}

const app = express();

// Apply security hardening (helmet, CORS, rate limiting)
applySecurity(app);

// Apply observability (Pino logging + Sentry)
applyObservability(app);

// IMPORTANT: Register webhook routes BEFORE JSON body parsing
// to allow raw body access for signature verification
app.use('/api/webhooks', webhooksRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Mount Security Pro: JWKS endpoint and Auth Issuer
app.use('/auth', jwksRouter);  // GET /auth/.well-known/jwks.json
app.use('/auth', issuerRouter); // POST /auth/token

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

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
    log(`serving on port ${port}`);
  });
})();
