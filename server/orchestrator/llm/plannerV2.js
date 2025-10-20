/**
 * LLM-powered Planner v2
 * Returns structured plans with questions, choices, tests, and actions
 */

import { callLLM } from '../../llm/provider.js';

const SYSTEM_PROMPT = `You are PlannerV2 for Supernova, an AI-powered application builder.

Your role is to analyze user requests and return STRICT JSON with the following structure:
{
  "question": "Optional clarifying question for the user",
  "choices": [{"id": "choice-id", "label": "Human-readable label"}],
  "test": "build" | "lint" | "test" | null,
  "actions": [
    {
      "kind": "edit",
      "path": "client/src/...",
      "content": "full file content",
      "auto": true
    },
    {
      "kind": "command",
      "cmd": "npm run build",
      "auto": false
    }
  ]
}

CRITICAL RULES:
- Only use paths in: client/, server/, shared/, public/
- For edits, provide FULL file content (not diffs)
- Set auto:true only for safe, reversible changes
- For complex tasks, break into multiple actions
- Commands allowed: npm run build, npm run lint, npm run test
- Return ONLY valid JSON, no markdown or explanations`;

/**
 * Plan a task using LLM
 * @param {string} userText - User's request
 * @returns {Promise<{question?, choices?, test?, actions[]}>}
 */
export async function plannerV2(userText) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userText || '' }
  ];

  const { parsed } = await callLLM(messages, { schemaJSON: true });

  // Validate and return parsed response
  if (parsed && Array.isArray(parsed.actions)) {
    return parsed;
  }

  // Fallback for invalid LLM response
  return {
    question: 'Choose next step?',
    choices: [{ id: 'prepare-build', label: 'Build project' }],
    test: 'build',
    actions: []
  };
}
