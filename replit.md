# Supernova - AI-Powered App Builder

## Overview
Supernova is an intelligent application builder platform that uses AI-powered agents (Planner, Implementer, Tester, Fixer) to scaffold, build, and deploy web and mobile applications. The platform emphasizes generating production-ready code with an approvals workflow for reviewing changes. Its business vision is to streamline app development through AI, offering a robust tool for creating web and mobile applications with a focus on high-quality frontend and design.

## Recent Changes
- **2025-10-19 (Sprint 4 Security Pro - Final)**: Complete Security Stack ✅ **PRODUCTION-READY**
  - ✅ **Security Pro**: JWKS-based JWT verification with role-based access control (RBAC)
  - ✅ **JWKS Endpoint**: GET /auth/.well-known/jwks.json serves real public keys from jwks.json
  - ✅ **Auth Middleware**: parseAuthJwks (token parsing), requireAuth (RBAC enforcement)
  - ✅ **Auth Issuer**: Self-hosted JWT minting with RS256 signing (POST /auth/token)
  - ✅ **Redis Rate Limiting**: Production-grade rate limiter supporting single/Sentinel/Cluster configurations
  - ✅ **mTLS Support**: Mutual TLS for internal service-to-service authentication
  - ✅ **Request Signing**: HMAC-based request signatures for zero-trust architectures (signature parsing bug fixed)
  - ✅ **Packages**: jose (JWT), ioredis (Redis Cluster/Sentinel)
  - ✅ **Files**: server/auth/verify.js, server/auth/jwks/publish.js, server/auth/issuer/index.js, server/rateLimit/index.js+pro.js, server/mtls/*
  - ✅ **Tools**: tools/gen-jwks.mjs (RS256 keypair generator), tools/mint-jwt.mjs (CLI token generator), tools/gencerts.sh (dev CA/cert generator)
  - ✅ **JWKS Generator**: Automated tool creates server/auth/jwks/keys/<kid>/{private.pem,public.pem} + jwks.json
  - ✅ **Production Runbook**: SECURITY_PRODUCTION_RUNBOOK.md with complete deployment & validation procedures
  - ✅ **Configuration**: AUTH_JWKS_URL, AUTH_ISSUER, AUTH_AUDIENCE, DEV_AUTH_OPEN, REDIS_URL/SENTINEL/CLUSTER, TLS_CA/KEY/CERT
  - ✅ **Dev Mode**: DEV_AUTH_OPEN=true bypasses authentication for local development
  - ✅ **E2E Verified**: JWKS generation → token minting → JWT verification → RBAC enforcement all tested

- **2025-10-19 (Sprint 4 Add-ons - Postgres Migration)**: Postgres-Backed Entitlements + Multi-Channel Deployment ✅ **PRODUCTION-READY**
  - ✅ **Postgres Database**: Migrated from in-memory to Replit Postgres with transactional integrity
  - ✅ **Database Schema**: ent_balances (current state), ent_ledger (append-only log), ent_subscriptions (lifecycle tracking)
  - ✅ **Migrations**: Auto-tracked schema_migrations with 001_init.sql and 002_indexes.sql
  - ✅ **Idempotency**: Unique external_ref constraint prevents duplicate credits; handles concurrent requests gracefully
  - ✅ **Transactional Layer**: server/entitlements/db.js with BEGIN/COMMIT/ROLLBACK for data consistency
  - ✅ **API Routes**: GET /api/entitlements/:profileId (with purchase history), POST /api/entitlements/grant (coins/subscriptions/revoke)
  - ✅ **Webhook Router**: server/entitlements/webhooks.db.js mounted before express.json() for raw body HMAC verification
  - ✅ **Security Hardening**: Concurrent idempotency (handles Postgres error 23505), malformed HMAC signature defense
  - ✅ **IAP Integration**: Google/Apple verification creates entitlements with profileId validation and DB persistence
  - ✅ **Multi-Channel EAS**: Added staging channel to eas.json; GitHub workflow for preview/staging/production OTA updates
  - ✅ **Testing Complete**: Idempotency verified, subscriptions lifecycle tested, webhooks process all events correctly
  - ✅ **Packages**: pg for Postgres, undici for webhook verification
  - ✅ **Files**: server/db/migrate.mjs (migration runner), server/entitlements/db.js, routes.db.js, webhooks.db.js, hmac.js

- **2025-10-19 (Sprint 4)**: Mobile Infrastructure + Sentry + IAP Verification + Observability ✅ **PRODUCTION-READY**
  - ✅ **Mobile Base (Sprint 3)**: Expo SDK 51 app structure with design token integration
  - ✅ **EAS CI/CD**: Build profiles (development, preview, production) with GitHub Actions workflows
  - ✅ **Store Automation**: Metadata generator from design tokens, version bump utility
  - ✅ **Sentry Integration**: Error tracking for mobile (sentry-expo) and web (@sentry/react, @sentry/node)
  - ✅ **IAP Verification**: Production-ready Google Play (Android Publisher v3) and Apple (StoreKit 2 JWS) verification
  - ✅ **Server Routes**: `/api/iap/google/verify` and `/api/iap/apple/verify` with grant fulfillment stubs
  - ✅ **Observability Layer**: Pino structured logging (pino-http, pino-pretty) with centralized error handling
  - ✅ **Security Hardening**: Comprehensive sensitive data redaction (headers, query params) in all logs
  - ✅ **Config Management**: Centralized environment config in server/env/index.js
  - ✅ **Packages Installed**: googleapis, jose, pino, pino-http, pino-pretty, @sentry/node, @sentry/react
  - ✅ **Mobile Structure**: mobile-expo/ with App.tsx, app.config.js, package.json, sentry.ts
  - ✅ **GitHub Workflows**: EAS build, OTA update, and store submission automation
  - ✅ **Configuration**: .env.example with baseline dev settings for IAP, Sentry, Collab Pay integration
  - ✅ **Note**: Mobile dependencies added to package.json (requires `cd mobile-expo && npm install` to use)

- **2025-10-19 (Sprint 3)**: Manual Diff Approvals with Git Integration
  - ✅ **Approval Infrastructure**: Created snapshots and diffApprovals tables for code review
  - ✅ **API Routes**: Complete approvals API with submit/list/approve/reject endpoints
  - ✅ **JWT Auth**: Token-based authentication with dev bypass (DEV_APPROVALS_OPEN=true)
  - ✅ **UI Components**: DiffSubmitBar for multi-select submission, ApprovalsPage for review queue
  - ✅ **Git Integration**: Auto-creates branches on approval with format approval/{timestamp}
  - ✅ **previousContent Fix**: Saves .before files alongside .diff for accurate code comparison
  - ✅ **Environment Setup**: APP_JWT_SECRET via Replit Secrets, Git identity configured
  - ✅ **E2E Tested**: Complete workflow verified - edit → diff → submit → approve → branch creation

## User Preferences
- **Visual Priority**: Frontend quality is paramount - exceptional attention to spacing, typography, colors, and interactions
- **Design System**: Collab Creative Studio - Neon aesthetic with vibrant colors and glow effects
- **Color Scheme**: Dark background (#0a0a0f) with neon cyan, pink, yellow, and green accents
- **Visual Effects**: Animated grid backgrounds, neon glow shadows, gradient text, glassmorphic cards
- **Fonts**: Inter for UI, JetBrains Mono for code
- **Components**: Custom neon-styled cards and buttons with colorful typography

## System Architecture

### Frontend
The frontend is built with React, Wouter for routing, TanStack Query for data fetching, and Shadcn UI components. It features a modular structure including pages for landing, dashboard, project details, a dev console, diff viewer, and approvals workflow. A custom brand system manages runtime design tokens via CSS variables and SSE for live updates, supporting layout primitives like Container, Stack, Grid, Card, and Button. The current visual identity is "Collab Creative Studio Neon Design" with vibrant neon colors, animated backgrounds, glow effects, gradient text, and glassmorphic cards.

### Backend
The backend, built with Express, handles core API endpoints for projects, templates, agents, approvals, in-app purchases, and entitlements. It includes a dev-routes module for file system access, terminal execution, and design token management. The IAP routes provide production-ready verification for Google Play (via Android Publisher v3 API) and Apple App Store (via StoreKit 2 JWS verification), with automatic entitlement grant fulfillment to Postgres. The entitlements system uses **Postgres** (Replit-hosted Neon) for persistent storage with transactional integrity, tracking coins (balance, total, append-only ledger), subscriptions (plan, status, lifecycle), and purchase history. Idempotency is enforced via unique external_ref constraints with graceful concurrent request handling.

The observability stack includes Pino for structured JSON logging with pino-http middleware, optional Sentry integration for error tracking, and centralized configuration management via server/env/index.js. Security middleware (Helmet, CORS, rate limiting) provides defense-in-depth hardening. Design tokens are validated using an AJV schema. **Data persistence** uses Postgres for entitlements and in-memory storage for other application data.

**Logging & Redaction Policy**: All request logging uses custom pino-http serializers that whitelist only safe headers (user-agent, content-type, accept, host, x-forwarded-for, x-forwarded-proto) and redact sensitive query parameters (token, api_key, password, auth, secret) in development mode. In production, ALL query parameters are fully redacted. Authorization, Cookie, and other sensitive headers are never logged. The centralized error handler applies the same redaction strategy to prevent data leakage during exception logging.

### Mobile
The mobile application is built with Expo SDK 51 and React Native, featuring design token integration that syncs with the brand system. It includes Sentry for error tracking, configured via the sentry-expo plugin. The mobile CI/CD pipeline uses EAS (Expo Application Services) with three build profiles: development, preview, and production. GitHub Actions workflows automate builds, OTA updates, and store submissions. Additional tooling includes a metadata generator for store listings and a version bump utility.

### AI Agent System
Supernova utilizes specialized AI agents (Planner, Implementer, Tester, Fixer) powered by OpenAI to generate and modify application code. This system includes an approvals workflow for reviewing and managing AI-generated code changes, with Git integration for creating branches upon approval.

### Key Features
- **Project Management**: Create and manage projects from predefined templates (e.g., Next.js 14, Expo SDK 51).
- **Dev Console**: Integrated development environment with a file tree, code editor, live preview, and terminal access.
- **Design Mode**: Real-time customization of design tokens (colors, fonts, spacing) with live visual feedback.
- **Brand System**: Runtime application of design tokens with live Server-Sent Events (SSE) updates.
- **Diff Tracking and Approvals**: Automatic tracking of file changes with a unified diff viewer and a workflow for approving or rejecting AI-generated code.
- **Security & Reliability**: Implements security headers, rate limiting, dev console guards, SSE heartbeats, and detailed audit logging.

## Deployment & Operations

### Documentation
- **Production Runbook**: `docs/PRODUCTION_RUNBOOK.md` - Complete operational guide for deploying and managing Supernova in production, including infrastructure setup, security configuration, Helm deployment, migrations, observability, and incident response
- **CI/CD Guide**: `docs/CICD_GUIDE.md` - Comprehensive pipeline documentation covering build workflows, branch→environment mapping, deployment procedures, rollback strategies, and troubleshooting
- **Security Runbook**: `SECURITY_PRODUCTION_RUNBOOK.md` - Focused security stack guide with JWKS generation, JWT verification, rate limiting, and end-to-end smoke tests

### Deployment Options
- **Kubernetes**: Full manifests with Kustomize bases and dev/staging/prod overlays (available separately)
- **Helm Chart**: `supernova-server` chart with environment-specific values and migration hooks (available separately)
- **Helmfile**: Multi-environment orchestration with embedded chart (available separately)
- **Helm Library**: `collab-lib` shared templates for standardized deployments across services (available separately)

### CI/CD Pipeline
- **GitHub Actions**: Automated Docker build & publish to GHCR
- **Automated Deployment**: GitOps-style deployment via Helmfile
- **Branch Mapping**: `develop` → dev, `main` → staging, `v*` tags → production

## External Dependencies
- **OpenAI API**: Used for AI agent functionality (Planner, Implementer, Tester, Fixer).
- **React**: Frontend UI library.
- **Wouter**: Client-side routing for React.
- **TanStack Query**: Data fetching and caching for React applications.
- **Shadcn UI**: UI component library.
- **Lucide Icons**: Icon library.
- **Express**: Backend web framework.
- **Zod, Drizzle-Zod, AJV**: Data validation and schema definition.
- **Helmet**: Security middleware for HTTP headers.
- **CORS**: Middleware for Cross-Origin Resource Sharing.
- **Express Rate Limit**: Middleware for rate limiting API requests.
- **Pino**: Structured logging library.
- **Tailwind CSS**: Utility-first CSS framework for styling.