import type { Request, Response, NextFunction } from "express";

export type ResponseLogger = (message: string, source?: string) => void;

function isStream(value: unknown): value is NodeJS.ReadableStream {
  return Boolean(value && typeof (value as NodeJS.ReadableStream).pipe === "function");
}

function snapshotPayload(payload: unknown): string | undefined {
  if (payload === undefined) {
    return undefined;
  }

  if (Buffer.isBuffer(payload) || isStream(payload)) {
    return undefined;
  }

  if (typeof payload === "string") {
    return payload;
  }

  if (typeof payload === "number" || typeof payload === "boolean") {
    return String(payload);
  }

  if (payload === null) {
    return "null";
  }

  try {
    return JSON.stringify(payload);
  } catch (error) {
    return "[unserializable payload]";
  }
}

function attachSnapshot(res: Response, snapshot: string | undefined) {
  if (snapshot === undefined) {
    delete (res.locals as Record<string, unknown>).responsePayloadSnapshot;
  } else {
    (res.locals as Record<string, unknown>).responsePayloadSnapshot = snapshot;
  }
}

function wrapResponseMethod<
  T extends (...args: any[]) => Response,
>(
  method: T,
  setSnapshot: (payload: string | undefined) => void,
) {
  return function wrapped(this: Response, ...args: Parameters<T>): ReturnType<T> {
    const [body] = args as unknown[];
    const snapshot = snapshotPayload(body);
    setSnapshot(snapshot);
    return method.apply(this, args);
  } as T;
}

export function createResponseLoggingMiddleware(log: ResponseLogger) {
  return function responseLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    let responseSnapshot: string | undefined;

    const setSnapshot = (snapshot: string | undefined) => {
      responseSnapshot = snapshot;
      attachSnapshot(res, snapshot);
    };

    const originalJson = res.json;
    const originalSend = res.send;

    res.json = wrapResponseMethod(originalJson, setSnapshot);
    res.send = wrapResponseMethod(originalSend, setSnapshot);

    res.on("finish", () => {
      const duration = Date.now() - start;

      if (!req.path.startsWith("/api")) {
        return;
      }

      let logLine = `${req.method} ${req.path} ${res.statusCode} in ${duration}ms`;

      if (responseSnapshot !== undefined) {
        logLine += ` :: ${responseSnapshot}`;
      }

      if (logLine.length > 80) {
        logLine = `${logLine.slice(0, 79)}…`;
      }

      log(logLine);
    });

    next();
  };
}
