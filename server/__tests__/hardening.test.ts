import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createCorsOptionsDelegate,
  createOriginValidator,
} from "../hardening.ts";

test("allows any origin in development when whitelist is empty", () => {
  const validator = createOriginValidator([], true);

  assert.equal(validator.allowAllInDevelopment, true);
  assert.equal(validator.check("https://example.dev").allowed, true);
});

test("allows configured origins outside of development", () => {
  const validator = createOriginValidator(["https://app.supernova.ai"], false);

  assert.equal(validator.allowAllInDevelopment, false);
  assert.equal(validator.check("https://app.supernova.ai").allowed, true);
});

test("rejects unexpected origins with a helpful message", () => {
  const validator = createOriginValidator(["https://app.supernova.ai"], false);

  const result = validator.check("https://malicious.example");

  assert.equal(result.allowed, false);
  assert.ok(result.message);
  assert.match(result.message ?? "", /https:\/\/malicious\.example/);
});

test("logs and rejects disallowed origins with context", (context) => {
  const validator = createOriginValidator(["https://app.supernova.ai"], false);
  const warnings: unknown[] = [];
  const corsDelegate = createCorsOptionsDelegate(validator, {
    warn: (message: string, payload: unknown) => warnings.push({ message, payload }),
  });

  const mockRequest = {
    header: () => "https://bad.example",
    method: "GET",
    originalUrl: "/api/test",
  } as unknown as import("express").Request;

  corsDelegate(mockRequest, (err) => {
    assert.ok(err);
    assert.equal((err as { status?: number }).status, 403);
    assert.match((err as Error).message, /not allowed/);
  });

  assert.equal(warnings.length, 1);
  assert.deepEqual(warnings[0], {
    message: "[security] Blocked request from disallowed origin",
    payload: {
      origin: "https://bad.example",
      method: "GET",
      path: "/api/test",
      message:
        "Origin https://bad.example is not allowed. Allowed origins: https://app.supernova.ai.",
      allowAllInDevelopment: false,
    },
  });
});

test("permits requests without an Origin header", () => {
  const validator = createOriginValidator(["https://app.supernova.ai"], false);

  assert.equal(validator.check(undefined).allowed, true);
  assert.equal(validator.check(null).allowed, true);
});

test("normalizes whitespace in configured origins", () => {
  const validator = createOriginValidator([
    " https://allowed.supernova.ai ",
  ], false);

  assert.equal(validator.check("https://allowed.supernova.ai").allowed, true);
});

test("reflects origin for allowed requests without enabling wildcard CORS in production", () => {
  const validator = createOriginValidator(["https://app.supernova.ai"], false);
  const corsDelegate = createCorsOptionsDelegate(validator);

  const mockRequest = {
    header: () => "https://app.supernova.ai",
    method: "GET",
    originalUrl: "/api/test",
  } as unknown as import("express").Request;

  corsDelegate(mockRequest, (err, options) => {
    assert.equal(err, null);
    assert.equal(options?.origin, "https://app.supernova.ai");
    assert.equal(options?.credentials, true);
  });
});

test("uses wildcard CORS only in development when no origins are configured", () => {
  const validator = createOriginValidator([], true);
  const corsDelegate = createCorsOptionsDelegate(validator);

  const mockRequest = {
    header: () => undefined,
    method: "GET",
    originalUrl: "/api/test",
  } as unknown as import("express").Request;

  corsDelegate(mockRequest, (err, options) => {
    assert.equal(err, null);
    assert.equal(options?.origin, true);
    assert.equal(options?.credentials, true);
  });
});
