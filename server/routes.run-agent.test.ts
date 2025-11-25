import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatRunAgentValidationError,
  runAgentRequestSchema,
} from "./run-agent-request-schema";

describe("runAgentRequestSchema", () => {
  it("accepts valid agent types", () => {
    const result = runAgentRequestSchema.safeParse({ agentType: "planner" });
    assert.equal(result.success, true);
  });

  it("rejects missing agentType", () => {
    const result = runAgentRequestSchema.safeParse({});
    assert.equal(result.success, false);
    const formatted = formatRunAgentValidationError(result.error);
    assert.equal(
      formatted.message,
      "Invalid agent run payload: agentType: agentType is required",
    );
    const errorMessage = formatted.fieldErrors.agentType?.[0] ?? "";
    assert.match(errorMessage, /required/i);
  });

  it("rejects unsupported agent types with descriptive message", () => {
    const result = runAgentRequestSchema.safeParse({ agentType: "unknown" });
    assert.equal(result.success, false);
    const formatted = formatRunAgentValidationError(result.error);
    assert.match(formatted.message, /agentType: agentType must be one of:/);
    const errorMessage = formatted.fieldErrors.agentType?.[0] ?? "";
    assert.match(errorMessage, /one of/i);
  });
});
