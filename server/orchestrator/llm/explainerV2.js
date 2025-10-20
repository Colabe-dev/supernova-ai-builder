/**
 * LLM-powered Explainer v2
 * Analyzes errors and provides actionable steps
 */

import { callLLM } from '../../llm/provider.js';

const SYSTEM_PROMPT = `You are ExplainerV2 for Supernova.

Analyze build/test errors and return JSON with actionable steps:
{
  "steps": [
    "Step 1: Specific action to take",
    "Step 2: Another specific action"
  ]
}

Guidelines:
- Be specific and actionable
- Focus on root causes, not symptoms
- Suggest concrete fixes
- Keep steps concise (max 5 steps)
- Return ONLY valid JSON`;

/**
 * Explain errors and suggest fixes
 * @param {{stdout: string, stderr: string}} params
 * @param {Object} overrides - Override LLM config (model, temperature, etc.)
 * @returns {Promise<{text: string, steps: string[]}>}
 */
export async function explainerV2({ stdout, stderr }, overrides = {}) {
  const errorOutput = (stderr || '') + '\n' + (stdout || '');
  
  // Limit context to last 6000 chars to avoid token limits
  const context = errorOutput.slice(-6000);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: context }
  ];

  const { parsed } = await callLLM(messages, { schemaJSON: true }, overrides);

  if (parsed?.steps?.length) {
    return {
      text: 'Analysis:',
      steps: parsed.steps
    };
  }

  // Fallback response
  return {
    text: 'Analysis:',
    steps: ['Review error output and apply suggested fixes', 'Rebuild to verify changes']
  };
}
