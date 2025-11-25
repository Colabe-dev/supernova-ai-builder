import { test } from "node:test";
import assert from "node:assert/strict";
import { createOriginValidator } from "../hardening.ts";

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
