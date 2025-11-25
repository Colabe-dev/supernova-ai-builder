import type { ZodError } from "zod";

import { insertAgentRunSchema } from "@shared/schema";

export const RUN_AGENT_ALLOWED_TYPES = ["planner", "implementer", "tester", "fixer"] as const;

const isRunAgentType = (value: string): value is (typeof RUN_AGENT_ALLOWED_TYPES)[number] =>
  (RUN_AGENT_ALLOWED_TYPES as readonly string[]).includes(value);

export const runAgentRequestSchema = insertAgentRunSchema.pick({ agentType: true }).extend({
  agentType: insertAgentRunSchema.shape.agentType.refine(isRunAgentType, {
    message: `agentType must be one of: ${RUN_AGENT_ALLOWED_TYPES.join(", ")}`,
  }),
});

export function formatRunAgentValidationError(error: ZodError) {
  const details = error.issues.map((issue) => {
    const path = issue.path.join(".") || "payload";
    const message = issue.message === "Required" ? `${path} is required` : issue.message;

    return `${path}: ${message}`;
  });

  return {
    message: `Invalid agent run payload: ${details.join("; ")}`,
    fieldErrors: error.flatten().fieldErrors,
  };
}
