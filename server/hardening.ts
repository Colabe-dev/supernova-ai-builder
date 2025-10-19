import helmet from "helmet";
import cors from "cors";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { Express, Request, Response, NextFunction } from "express";

export function applySecurity(app: Express) {
  // Trust proxy for X-Forwarded-For (Replit environment)
  app.set("trust proxy", true);

  // Remove X-Powered-By header
  app.disable("x-powered-by");

  // Helmet security headers
  app.use(
    helmet({
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }, // for preview/iframe
      contentSecurityPolicy: false, // Allow Vite HMR in development
    })
  );

  // CORS with credentials
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  // Global rate limiting - more lenient in development
  const isDevelopment = process.env.NODE_ENV !== "production";
  app.use(
    rateLimit({
      windowMs: 60_000,
      max: isDevelopment ? 300 : 60, // 300 req/min dev, 60 in production
      message: "Too many requests, please try again later",
      standardHeaders: true,
      legacyHeaders: false,
      // Use IPv6-safe key generator for Replit environment
      keyGenerator: (req) => {
        const ip = req.ip || req.socket.remoteAddress || "unknown";
        // Handle IPv6 addresses properly using ipKeyGenerator
        return ipKeyGenerator(ip);
      },
      skip: (req) => {
        // Skip rate limiting for static assets in development
        return isDevelopment && (
          req.path.startsWith("/@") || // Vite HMR
          req.path.startsWith("/node_modules/") ||
          req.path.endsWith(".js") ||
          req.path.endsWith(".css") ||
          req.path.endsWith(".map")
        );
      },
    })
  );

  // Request timeout protection
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.setTimeout(60_000);
    next();
  });
}
