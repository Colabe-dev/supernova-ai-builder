# S4 — Auto‑Integrate Security (one‑click patch)

This overlay **edits your `server/index.js` automatically** to wire:
- JWKS auth (`/auth/.well-known/jwks.json` + verifier)
- Redis/memory rate‑limiting (Security Pro compatible)
- Secured Entitlements routes (`routes.db.secpro.js`)

## Install
```bash
npm i jose ioredis
```

## Run (from repo root)
```bash
node tools/auto-integrate-security.mjs
```
The script is **idempotent**. Re‑running won’t duplicate lines.

## Env to add (merge to your `.env`)
```
# Auth
AUTH_JWKS_URL=https://<your-domain>/auth/.well-known/jwks.json
AUTH_ISSUER=https://collab.supernova.auth
AUTH_AUDIENCE=supernova-api
DEV_AUTH_OPEN=false

# Redis (optional; memory fallback if unset)
REDIS_URL=redis://localhost:6379
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_READ_MAX=120
RATE_LIMIT_WRITE_MAX=30
RATE_LIMIT_WEBHOOK_MAX=1200
```

## What it does
- Ensures imports for `jwksRouter`, `parseAuthJwks/requireAuth`, `rateLimit`
- Mounts `/auth` (jwks) and `/api` (secured entitlements)
- Does **not** remove your existing routes
- Prints a dry‑run diff and prompts before writing (pass `--yes` to auto‑apply)

If your entry point is not `server/index.js`, run:
```bash
node tools/auto-integrate-security.mjs --file path/to/your/server.js
```
