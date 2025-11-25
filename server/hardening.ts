import helmet from "helmet";
import cors, { type CorsOptions, type CorsOptionsDelegate } from "cors";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { Express, Request, Response, NextFunction } from "express";
import { config } from "./env/index.js";

export interface OriginCheckResult {
  allowed: boolean;
  message?: string;
}

export interface OriginValidator {
  allowAllInDevelopment: boolean;
  check: (origin?: string | null) => OriginCheckResult;
}

export function createOriginValidator(
  allowedOrigins: string[],
  isDevelopment: boolean,
): OriginValidator {
  const normalizedOrigins = Array.from(
    new Set(
      allowedOrigins
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    ),
  );

  const allowAllInDevelopment = isDevelopment && normalizedOrigins.length === 0;

  const check = (origin?: string | null): OriginCheckResult => {
    if (!origin) {
      return { allowed: true };
    }

    if (allowAllInDevelopment) {
      return { allowed: true };
    }

    if (normalizedOrigins.includes(origin)) {
      return { allowed: true };
    }

    return {
      allowed: false,
      message: `Origin ${origin} is not allowed`,
    };
  };

  return {
    allowAllInDevelopment,
    check,
  };
}

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
  const isDevelopment = config.nodeEnv !== "production";
  const { allowAllInDevelopment, check } = createOriginValidator(
    config.security?.allowedOrigins ?? [],
    isDevelopment,
  );

  const corsOptionsDelegate: CorsOptionsDelegate<Request> = (req, callback) => {
    const origin = req.header("Origin") ?? undefined;
    const result = check(origin);

    if (result.allowed) {
      const options: CorsOptions = {
        origin: allowAllInDevelopment ? true : origin ?? true,
        credentials: true,
      };

      callback(null, options);
      return;
    }

    if (origin) {
      console.warn("[security] Blocked request from disallowed origin", {
        origin,
        method: req.method,
        path: req.originalUrl,
      });
    }

    const error: Error & { status?: number } = new Error(
      result.message ?? "Origin is not allowed",
    );
    error.status = 403;

    callback(error);
  };

  app.use(cors(corsOptionsDelegate));

  // Global rate limiting - more lenient in development
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
