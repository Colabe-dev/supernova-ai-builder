/**
 * LLM-powered Fixer v2
 * Proposes automated fixes for errors
 */

import { callLLM } from '../../llm/provider.js';

const SYSTEM_PROMPT = `You are FixerV2 for Supernova.

Analyze errors and return JSON with fix actions:
{
  "actions": [
    {
      "kind": "edit",
      "path": "client/src/file.ts",
      "content": "full corrected file content",
      "auto": true
    }
  ]
}

CRITICAL RULES:
- Only fix files in: client/, server/, shared/, public/
- Provide FULL file content (not partial/diffs)
- Set auto:true only for confident, safe fixes
- Maximum 3 file edits per fix
- Return ONLY valid JSON`;

/**
 * Generate automated fix actions
 * @param {{stdout: string, stderr: string}} params
 * @returns {Promise<{actions: Array}>}
 */
export async function fixerV2({ stdout, stderr }) {
  const errorOutput = (stderr || '') + '\n' + (stdout || '');
  
  // Limit context to last 6000 chars
  const context = errorOutput.slice(-6000);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: context }
  ];

  const { parsed } = await callLLM(messages, { schemaJSON: true });

  if (parsed?.actions && Array.isArray(parsed.actions)) {
    return parsed;
  }

  // Fallback - no automatic fixes
  return { actions: [] };
}
