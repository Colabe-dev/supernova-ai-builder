# Supernova Monorepo Starter

This pack gives you a **runnable monorepo** (server + mobile) with security, IAP, and entitlements pre-wired.

## Apps
- **server/** — Express + Security Pro (JWKS auth, Redis limiter), Entitlements (Postgres), Real IAP (Google/Apple), Observability (Pino/Sentry).
- **mobile-expo/** — Expo SDK base with EAS CI, reads design tokens from server.

## Quick start
```bash
# 0) Requirements
# - Node 18+
# - Docker (for Postgres+Redis)

# 1) Boot infra
docker compose up -d

# 2) Install deps
npm i
npm run -w server migrate

# 3) Dev server
npm run -w server dev

# 4) Mobile
cd mobile-expo && npm i && npx expo start
```

## Environment
Copy `.env.sample` → `.env` at repo root and adjust values.
