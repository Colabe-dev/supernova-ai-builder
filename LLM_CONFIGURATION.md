# LLM Planner v2 Configuration

## Environment Variables

Configure these environment variables to enable LLM-powered planning, error explanation, and auto-fixing:

```bash
# Enable LLM Planner v2 globally (optional - can be toggled per-session in UI)
LLM_PLANNER_V2=true

# LLM Provider (default: openai)
LLM_PROVIDER=openai

# Model Selection (default: gpt-4o-mini)
# Options: gpt-4o-mini, gpt-4o, gpt-4-turbo, etc.
LLM_MODEL=gpt-4o-mini

# OpenAI API Key (required for LLM features)
OPENAI_API_KEY=sk-...

# OpenAI Base URL (optional, for custom endpoints)
# Default: https://api.openai.com/v1
OPENAI_BASE_URL=https://api.openai.com/v1

# LLM Parameters
LLM_TEMPERATURE=0.2
LLM_MAX_TOKENS=1200
```

## Using Replit-integrated OpenAI

The OpenAI API key is already available via the Replit integration:

```bash
OPENAI_API_KEY=${AI_INTEGRATIONS_OPENAI_API_KEY}
OPENAI_BASE_URL=${AI_INTEGRATIONS_OPENAI_BASE_URL}
```

## Client-Side Controls

Users can toggle LLM Planner v2 per-session in the chat interface at `/chat`:

- **Use LLM Planner v2** checkbox - Enable AI-powered planning for this session
- **Model** field - Override default model (e.g., `gpt-4o`, `gpt-4o-mini`)

## How It Works

### Planner v2
- Returns structured JSON with questions, choices, tests, and file edit actions
- Analyzes user requests and creates comprehensive implementation plans
- Supports complex multi-step tasks with dependencies

### Explainer v2  
- Analyzes build/test errors and provides actionable debugging steps
- Focuses on root causes rather than symptoms
- Returns specific fixes in priority order

### Fixer v2
- Proposes automated code fixes for errors
- Generates full file content (not diffs)  
- Marks fixes as `auto:true` only when confident

## Fallback Behavior

If LLM API calls fail, the system automatically falls back to heuristic-based agents to ensure uninterrupted operation.

## Cost Optimization

- Default model (`gpt-4o-mini`) is cost-effective for most tasks
- Use `gpt-4o` for complex architectural decisions
- Adjust `LLM_MAX_TOKENS` to control response length and cost
- Lower `LLM_TEMPERATURE` for more deterministic outputs

## Testing

To test LLM Planner v2:

1. Configure OPENAI_API_KEY
2. Open `/chat` 
3. Enable "Use LLM Planner v2"
4. Try: "Create a pricing page with checkout flow"
5. Watch structured planning, diff previews, and auto-fixes

## Architecture

```
Client (/chat)
  ↓ WebSocket
Server (orchestrator)
  ↓ Conditional routing
LLM v2 Agents          Heuristic Agents
├─ plannerV2.js   OR   ├─ planner.ts
├─ explainerV2.js  OR   ├─ explainer.ts
└─ fixerV2.js      OR   └─ fixer.ts
```

## Production Considerations

- Use environment secrets for OPENAI_API_KEY (never commit to git)
- Monitor API usage and set spending limits in OpenAI dashboard
- Consider caching for repeated queries
- Add rate limiting per user if needed
