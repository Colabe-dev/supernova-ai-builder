# Supernova Package Ecosystem

This document explains the relationship between the **Replit workspace** (current repo) and the **all-in-one consolidated package**.

## Overview

Supernova exists in two complementary forms:

1. **Development Workspace** (this repo) - Feature-rich with production security stack
2. **All-in-One Package** - Consolidated distribution for quick deployment

Both are **fully compatible** and share the same APIs, UX patterns, and architecture.

---

## Current Workspace (This Repo)

**What's Included:**
- ✅ Complete Security Pro stack (JWKS, JWT, Redis rate limiting, mTLS)
- ✅ Postgres-backed entitlements system (coins, subscriptions, IAP)
- ✅ Production observability (Pino logging, Sentry integration)
- ✅ Comprehensive documentation (Production + CI/CD runbooks)
- ✅ Mobile infrastructure (Expo SDK 51, EAS CI/CD)
- ✅ Approvals workflow with Git integration
- ✅ Advanced security features (request signing, webhook HMAC verification)

**Best For:**
- Active development with all security features
- Production deployments requiring full authentication
- Teams needing complete observability and monitoring
- Projects with IAP and entitlements requirements

---

## All-in-One Package

**Package:** `supernova-builder-all-in-one-20251019-221938.zip`  
**SHA256:** `eeb66b64beb0afbaecaa4b305e770119c3478fa536661e0f84cadd21b83b71`

**Structure:**
```
supernova-builder/
├── server/                 # Express API (dev FS, diffs, tokens, terminal, SSE, /healthz)
├── client/                 # Vite + React + Monaco (dev console, diff viewer, design mode)
├── mobile-expo/            # Expo skeleton (minimal, expandable)
├── deploy/helm/...         # Minimal Helm chart
├── helmfile/...            # dev/staging/prod environments
└── README.md               # Quick start guide
```

**What's Included:**
- ✅ Dev console with file tree, Monaco editor, live preview
- ✅ Diff tracking and viewer (persisted to `server/.supernova/diffs.json`)
- ✅ Design token system (GET/POST `/api/design/tokens`, live CSS vars)
- ✅ Security rails (dev-open auth, path normalization, rate limits)
- ✅ Terminal whitelist (`node -v`, `npm -v`, `npm run build`, `npm run lint`)
- ✅ SSE auto-refresh for live preview
- ✅ Basic Helm + Helmfile for quick K8s deployment
- ✅ Production hardening (dev FS/terminal disabled in production)

**What's NOT Included (Yet):**
- ❌ Collab-lib Helm library
- ❌ Migration/seed hooks with retry policies
- ❌ Advanced security features (JWKS, entitlements, webhooks)
- ❌ Mobile EAS CI/CD workflows

**Best For:**
- Quick local development setup
- Prototyping and demos
- Teams wanting a lightweight starting point
- Projects that will add security features incrementally

---

## Compatibility Map

Both packages share identical APIs and behavior:

| Feature | Current Workspace | All-in-One Package | Compatible? |
|---------|-------------------|-------------------|-------------|
| **Dev Console** | ✅ Same FS allowlist | ✅ Same FS allowlist | ✅ Yes |
| **Diff Viewer** | ✅ `server/.supernova/diffs.json` | ✅ Same location | ✅ Yes |
| **Design Tokens** | ✅ `GET/POST /api/design/tokens` | ✅ Same API | ✅ Yes |
| **Terminal** | ✅ Whitelist commands | ✅ Same whitelist | ✅ Yes |
| **SSE Refresh** | ✅ Auto-refresh | ✅ Same behavior | ✅ Yes |
| **Prod Hardening** | ✅ `NODE_ENV=production` | ✅ Same guards | ✅ Yes |
| **Mobile Base** | ✅ Expo SDK 51 | ✅ Same skeleton | ✅ Yes |

---

## Migration Path: All-in-One → Current Workspace

If you start with the all-in-one package and want to add advanced features:

### Step 1: Copy Security Features

```bash
# From current workspace, copy security modules
cp -r server/auth/ supernova-builder/server/
cp -r server/entitlements/ supernova-builder/server/
cp -r server/rateLimit/ supernova-builder/server/
cp -r server/mtls/ supernova-builder/server/
```

### Step 2: Copy Design Theme

```bash
# Preserve your custom design tokens
cp server/design.tokens.json supernova-builder/server/
```

### Step 3: Copy Diff History (Optional)

```bash
# Keep existing diff history
cp server/.supernova/diffs.json supernova-builder/server/.supernova/
```

### Step 4: Configure Environment

```bash
cd supernova-builder/server
cp .env.example .env

# Edit .env with production values:
# - DEV_AUTH_OPEN=false (for prod)
# - DATABASE_URL=postgresql://...
# - REDIS_URL=redis://...
# - AUTH_ISSUER, AUTH_AUDIENCE, etc.
```

### Step 5: Run & Validate

```bash
# Server
cd server
npm install
npm run dev  # http://localhost:3001

# Client (separate terminal)
cd client
npm install
npm run dev  # http://localhost:5173
```

**Quick Validation:**
```bash
# Health check
curl -s http://localhost:3001/healthz

# FS list
curl -s "http://localhost:3001/api/dev/fs/list?path=client/src" | jq .

# Design tokens
curl -s http://localhost:3001/api/design/tokens | jq .

# Write file (triggers diff + SSE refresh)
curl -s -X POST http://localhost:3001/api/dev/fs/write \
  -H 'Content-Type: application/json' \
  -d '{"path":"client/src/test.txt","content":"Hello World"}'
```

---

## Migration Path: Current Workspace → All-in-One

If you're in the current workspace and want to adopt the all-in-one structure:

### Option A: Keep Current Workspace

**Recommended if:**
- You need the advanced security features
- You're already in production
- You have Postgres entitlements live

**Action:** No migration needed. Continue development here.

### Option B: Merge Infrastructure Into All-in-One

**To add advanced infra to the all-in-one package:**

1. **Say "merge infra into kit"** and request:
   - Collab-lib Helm library under `deploy/helm/supernova-server/charts/collab-lib/`
   - Migration and seed Helm hooks (with exponential retry)
   - Helmfile environments aligned to the library chart

2. **Then copy security features** from current workspace:
   ```bash
   # Copy from this repo to all-in-one package
   cp -r server/auth/ ../supernova-builder/server/
   cp -r server/entitlements/ ../supernova-builder/server/
   cp -r tools/gen-jwks.mjs ../supernova-builder/tools/
   cp -r tools/mint-jwt.mjs ../supernova-builder/tools/
   cp SECURITY_PRODUCTION_RUNBOOK.md ../supernova-builder/
   cp docs/* ../supernova-builder/docs/
   ```

---

## Quick Start Comparison

### Current Workspace

```bash
# Single Replit workspace
npm run dev

# Starts:
# - Express server (port 3001)
# - Vite dev server (port 5000)
# - Both running in same process
```

### All-in-One Package

```bash
# Server (terminal 1)
cd server
npm install
npm run dev  # http://localhost:3001

# Client (terminal 2)
cd client
npm install
npm run dev  # http://localhost:5173 (proxies /api to :3001)
```

---

## Environment Variables

Both packages use the same environment schema:

```bash
# Authentication & Security
AUTH_JWKS_URL=https://api.supernova.com/auth/.well-known/jwks.json
AUTH_ISSUER=https://collab.supernova.auth
AUTH_AUDIENCE=supernova-api
APP_URL=https://app.supernova.com
DEV_AUTH_OPEN=true|false
ISSUER_ADMIN_SECRET=<secret>
APP_JWT_SECRET=<secret>
SESSION_SECRET=<secret>

# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://...
# OR REDIS_SENTINEL=...
# OR REDIS_CLUSTER_NODES=...

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_READ_MAX=120
RATE_LIMIT_WRITE_MAX=30

# IAP
IAP_STRICT=true|false
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
APPLE_SHARED_SECRET=<secret>

# Webhooks
COLLAB_PAY_WEBHOOK_SECRET=<secret>

# Observability
SENTRY_DSN=https://...
SENTRY_ENV=production
LOG_LEVEL=info

# Dev Mode
NODE_ENV=development|production
```

---

## Deployment Options

### All-in-One Package: Quick Deploy

```bash
cd supernova-builder

# Using Helmfile (recommended)
cd helmfile
helmfile -e dev apply      # Development
helmfile -e staging apply  # Staging
helmfile -e prod apply     # Production

# Or using Helm directly
helm upgrade --install supernova ./deploy/helm/supernova-server \
  -n supernova --create-namespace \
  -f deploy/helm/supernova-server/values-prod.yaml
```

### Current Workspace: Full CI/CD

```bash
# GitHub Actions (automatic)
git push origin develop    # → Deploys to dev
git push origin main       # → Deploys to staging
git tag v1.0.0 && git push --tags  # → Deploys to production

# See docs/CICD_GUIDE.md for complete pipeline
```

---

## Recommendations

### Use All-in-One Package When:
- ✅ Starting a new project from scratch
- ✅ Want quick local development setup (2 commands)
- ✅ Need minimal dependencies
- ✅ Plan to add security features incrementally
- ✅ Want clean separation of server/client code

### Use Current Workspace When:
- ✅ Need production-ready security immediately
- ✅ Require Postgres entitlements and IAP verification
- ✅ Want comprehensive observability out-of-the-box
- ✅ Need complete deployment documentation
- ✅ Already have infrastructure in production

### Use Both (Hybrid Approach):
1. **Develop locally** with all-in-one package structure
2. **Copy security features** from current workspace as needed
3. **Deploy to production** using documented Helm/Helmfile workflows
4. **Best of both worlds**: Clean structure + enterprise features

---

## API Endpoint Compatibility

Both packages expose identical REST APIs:

### Dev Console APIs
```
GET  /api/dev/fs/list?path=<path>
GET  /api/dev/fs/read?path=<path>
POST /api/dev/fs/write
POST /api/dev/terminal/exec
GET  /api/dev/sse (Server-Sent Events)
```

### Design Token APIs
```
GET  /api/design/tokens
POST /api/design/tokens
```

### Diff APIs
```
GET  /api/diffs
GET  /api/diffs/:timestamp
```

### Security APIs (Current Workspace Only)
```
GET  /auth/.well-known/jwks.json
POST /auth/token
GET  /api/entitlements/:profileId
POST /api/entitlements/grant
POST /api/iap/google/verify
POST /api/iap/apple/verify
```

---

## File Structure Comparison

### Shared Structure
```
server/
├── src/
│   ├── routes.js              # API routes
│   ├── dev-routes.js          # Dev console endpoints
│   └── index.js               # Server entry
├── .supernova/
│   └── diffs.json             # Diff history
├── design.tokens.json         # Design system
└── .env                       # Environment config

client/
├── src/
│   ├── pages/
│   │   ├── dev.jsx            # Dev console
│   │   └── diff.jsx           # Diff viewer
│   └── components/
└── vite.config.ts
```

### Current Workspace Additional Files
```
server/
├── auth/
│   ├── verify.js              # JWT verification
│   ├── jwks/publish.js        # JWKS endpoint
│   └── issuer/index.js        # Token minting
├── entitlements/
│   ├── db.js                  # Postgres layer
│   ├── routes.db.js           # API routes
│   └── webhooks.db.js         # Webhook handlers
├── rateLimit/
│   ├── index.js               # Basic rate limiter
│   └── pro.js                 # Redis-backed limiter
└── mtls/                      # mTLS support

tools/
├── gen-jwks.mjs               # JWKS key generator
└── mint-jwt.mjs               # JWT minting CLI

docs/
├── PRODUCTION_RUNBOOK.md      # Deployment guide
├── CICD_GUIDE.md              # Pipeline documentation
└── PACKAGE_ECOSYSTEM.md       # This file
```

---

## Support & Questions

- **Current Workspace Docs:** `docs/PRODUCTION_RUNBOOK.md`, `docs/CICD_GUIDE.md`
- **Security Stack:** `SECURITY_PRODUCTION_RUNBOOK.md`
- **Architecture:** `replit.md`
- **All-in-One Package:** `README.md` (included in ZIP)

---

**Last Updated:** 2025-10-19  
**Version:** 1.0  
**Package Version:** `supernova-builder-all-in-one-20251019-221938`
