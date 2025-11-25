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

type ResponseMethod<T extends keyof Pick<Response, "json" | "send">> = Response[T] extends (
  ...args: infer P
) => infer R
  ? (...args: P) => R
  : never;

function wrapResponseMethod<
  T extends keyof Pick<Response, "json" | "send">,
>(
  res: Response,
  methodName: T,
  setSnapshot: (payload: string | undefined) => void,
) {
  const boundMethod = (res[methodName] as ResponseMethod<T>).bind(res);

  return function wrapped(this: Response, ...args: Parameters<ResponseMethod<T>>) {
    const [body] = args as unknown[];
    const snapshot = snapshotPayload(body);
    setSnapshot(snapshot);
    return boundMethod(...args);
  } as Response[T];
}

export function createResponseLoggingMiddleware(log: ResponseLogger) {
  return function responseLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    let responseSnapshot: string | undefined;

    const setSnapshot = (snapshot: string | undefined) => {
      responseSnapshot = snapshot;
      attachSnapshot(res, snapshot);
    };

    res.json = wrapResponseMethod(res, "json", setSnapshot);
    res.send = wrapResponseMethod(res, "send", setSnapshot);

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
