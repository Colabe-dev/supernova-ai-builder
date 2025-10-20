/**
 * Provider-agnostic LLM wrapper
 * Supports OpenAI-compatible endpoints (OpenAI, Azure, local models via LM Studio, etc.)
 */

const DEFAULTS = {
  provider: process.env.LLM_PROVIDER || 'openai',
  baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  model: process.env.LLM_MODEL || 'gpt-4o-mini',
  temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.2'),
  max_tokens: parseInt(process.env.LLM_MAX_TOKENS || '1200', 10)
};

async function doFetch(url, opts) {
  if (typeof fetch !== 'function') {
    const mod = await import('undici');
    return mod.fetch(url, opts);
  }
  return fetch(url, opts);
}

/**
 * Call LLM with messages
 * @param {Array<{role: string, content: string}>} messages - Chat messages
 * @param {Object} options - Call options
 * @param {boolean} options.schemaJSON - Parse response as JSON
 * @param {Object} overrides - Override default config (model, temperature, etc.)
 * @returns {Promise<{text: string, parsed: any|null}>}
 */
export async function callLLM(messages, options = {}, overrides = {}) {
  const cfg = { ...DEFAULTS, ...overrides };
  const key = process.env.OPENAI_API_KEY;
  
  if (!key) {
    throw new Error('OPENAI_API_KEY not configured - LLM features unavailable');
  }

  const payload = {
    model: cfg.model,
    temperature: cfg.temperature,
    max_tokens: cfg.max_tokens,
    messages
  };

  const res = await doFetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${key}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`LLM HTTP ${res.status}: ${errorText}`);
  }

  const j = await res.json();
  const text = j.choices?.[0]?.message?.content || '';
  
  let parsed = null;
  if (options.schemaJSON) {
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      // JSON parse failed - return null parsed
    }
  }

  return { text, parsed };
}
