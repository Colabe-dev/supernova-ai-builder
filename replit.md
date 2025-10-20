# Supernova - AI-Powered App Builder

## Overview
Supernova is an intelligent application builder platform that uses AI-powered agents to scaffold, build, and deploy web and mobile applications. Its core purpose is to streamline app development through AI, offering a robust tool for creating high-quality frontend and design-centric applications with production-ready code.

## Recent Updates (Sprint A - Credits & Usage - In Progress)
**Sprint A (Credits & Usage)** deliverables completed:
- **Credits System**: Internal-only credit grant function (grantCreditsInternal), balance/history APIs
- **Usage Analytics**: Real-time usage tracking for AI tokens (in/out), tasks, with daily/weekly/monthly aggregation
- **Usage Dashboard**: Interactive analytics page with time-series charts (Area/Line/Bar), summary cards, error/loading states
- **Referral Integration**: Automatic credit grants on signup (100), purchases (10% commission), and social posts (50)
- **Database Schema**: Supabase tables (credit_ledger, usage_events, usage_daily materialized view) with usage_summary_fn() function

**⚠️  SPRINT A SECURITY LIMITATIONS (Development/Demo Only)**
- **Referral event endpoint is unauthenticated**: /api/referrals/event can be called by anyone to mint credits
- **Read APIs are unauthenticated**: /api/credits/balance and /api/credits/history expose data without auth
- **Not production-ready**: Requires Sprint B workspace/auth system before deployment
  
**Sprint B Security Roadmap:**
- Move credit granting to authenticated backend workflows (signup/purchase handlers)
- Implement JWT/workspace-based authorization for all credit APIs
- Remove direct browser access to credit-granting endpoints
- Add authenticated context to all read APIs
- Replace affiliate email with proper workspace/user IDs

## User Preferences
- **Visual Priority**: Frontend quality is paramount - exceptional attention to spacing, typography, colors, and interactions
- **Design System**: Collab Creative Studio - Refined neon aesthetic with balanced visual effects
- **Color Scheme**: Dark background (#0a0a0f) with neon cyan, pink, yellow, and green accents
- **Visual Effects**: Brighter static raster grid background (rgba 0.08-0.10), toned-down neon glow effects, gradient text using header brand colors (#7c3aed to #22d3ee)
- **Fonts**: Inter for UI, JetBrains Mono for code
- **Components**: Custom neon-styled cards and buttons with colorful typography, unified SharedHeader component

## System Architecture

### Frontend
The frontend is built with React, Wouter for routing, TanStack Query for data fetching, and Shadcn UI components. It features a modular structure including pages for landing, dashboard, project details, a dev console, diff viewer, and approvals workflow. A custom brand system manages runtime design tokens via CSS variables and SSE for live updates, supporting layout primitives like Container, Stack, Grid, Card, and Button. The visual identity is "Collab Creative Studio Neon Design."

**Global Layout System**: AppShell wrapper component loads design tokens and applies global theme styles. SharedHeader component provides consistent navigation across all pages with brand gradient logo (#7c3aed to #22d3ee). Global theme.css implements brighter static raster grid background (tighter 22px cells, rgba 0.08-0.10 opacity) with toned-down neon effects - glow shadows are now opt-in via specific classes rather than default. The "AI-Powered Agents" hero title uses `.hero-title-gradient` class for clean gradient text without neon glow, matching header brand colors.

### Backend
The backend, built with Express, handles core API endpoints for projects, templates, agents, approvals, in-app purchases, and entitlements. It includes a dev-routes module for file system access, terminal execution, and design token management. The IAP routes provide production-ready verification for Google Play and Apple App Store, with automatic entitlement grant fulfillment to Postgres. The entitlements system uses **Postgres** (Replit-hosted Neon) for persistent storage with transactional integrity, tracking coins, subscriptions, and purchase history. Idempotency is enforced via unique external_ref constraints.

**Monetization v1 (Collab Pay)**: Complete billing and subscription infrastructure with SKU-based product configuration (Pro Monthly $49, Pro Yearly $499 with bonus coins), checkout session creation with referral metadata integration, enhanced webhook processor with HMAC-SHA256 signature verification and in-memory idempotency tracking, real-time entitlement grants based on payment events, and database-backed entitlement lookups. The system includes Free tier limits (3 projects, 50 AI minutes/month, 10 builds/month) and Pro tier benefits (50 projects, 500 AI minutes/month, 100 builds/month, priority support, advanced templates). API routes: `/api/billing/pricing` (plan data), `/api/billing/checkout` (session creation - requires authentication), `/api/billing/entitlements/:profileId` (real-time DB lookup), `/api/webhooks/collab-pay` (webhook receiver with SKU mapping).

**Supabase Integration**: One-click Supabase auto-integration with two modes: (A) Connect to existing project via URL and API keys, or (B) Auto-provision new project via Supabase Management API. The system includes pre-configured clients for web (`client/src/lib/supabase.ts`) and server (`server/integrations/supabase.ts`), automated database bootstrap with RLS-safe tables (profiles, system_health), health check monitoring at `/api/db/health`, and proper credential segregation (service role server-only, anon key for client). API routes handle connection (`/api/supabase/connect`), provisioning (`/api/supabase/provision`), and bootstrap (`/api/supabase/bootstrap`). Mobile support via Expo with deep linking configuration ready.

**Referral System**: Neutral referral tracking system storing all data in Supabase. Features include affiliate link generation, 30-day cookie-based attribution, click tracking with IP/user agent logging, event recording for signups and purchases with revenue tracking, real-time statistics dashboard with auto-refresh, and CSV export for payout processing. The system uses secure cookies (`httpOnly`, `sameSite: 'lax'`, `secure` in production) and RFC 4180-compliant CSV escaping. RLS policies ensure service-role-only access to tracking tables. API routes: `/r/:code` (redirect + track), `/api/referrals/affiliate` (create link), `/api/referrals/event` (record conversion), `/api/referrals/stats` (dashboard data), `/api/referrals/export.csv` (payout file).

The observability stack includes Pino for structured JSON logging with pino-http middleware and Sentry integration for error tracking. Security middleware (Helmet, CORS, rate limiting) provides defense-in-depth hardening. **Data persistence** uses Postgres for entitlements and in-memory storage for other application data.

**Logging & Redaction Policy**: All request logging uses custom pino-http serializers that whitelist only safe headers and redact sensitive query parameters in development mode. In production, all query parameters are fully redacted. Authorization, Cookie, and other sensitive headers are never logged.

### Mobile
The mobile application is built with Expo SDK 51 and React Native, featuring design token integration that syncs with the brand system. It includes Sentry for error tracking. The mobile CI/CD pipeline uses EAS (Expo Application Services) with three build profiles (development, preview, production) and GitHub Actions workflows for builds, OTA updates, and store submissions.

### AI Agent System
Supernova features a dual-mode AI system supporting both heuristic-based and LLM-powered agents for code generation, error analysis, and automated fixes.

**LLM Planner v2** (Provider-Agnostic): Upgraded AI system with OpenAI-compatible LLM integration for structured JSON planning, intelligent error explanation, and automated code fixes. Components include `server/llm/provider.js` (unified LLM wrapper supporting OpenAI, Azure, local models), `server/orchestrator/llm/plannerV2.js` (structured planning with questions, choices, and actions), `server/orchestrator/llm/explainerV2.js` (root-cause error analysis), and `server/orchestrator/llm/fixerV2.js` (automated fix proposals). Users can toggle LLM mode per-session via chat UI or enable globally with `LLM_PLANNER_V2=true`. Configuration: `OPENAI_API_KEY`, `LLM_MODEL` (default: gpt-4o-mini), `LLM_TEMPERATURE` (0.2), `LLM_MAX_TOKENS` (1200). Falls back to heuristic agents on LLM API errors.

A real-time AI-assisted development system operates via WebSocket at `/api/chat/ws`. A multi-agent orchestrator coordinates roles: Planner (intent detection, task breakdown), Builder (file operations with diff preview), Tester (automated validation), Explainer (error analysis), and Fixer (automated remediation). Users interact through a React chat interface at `/chat` with autonomy mode toggle (auto-apply vs. manual approval) and LLM v2 toggle (AI-powered vs. heuristic planning). File operations enforce whitelist security (`client/`, `server/`, `shared/`, `public/`) with path traversal protection. The patch workflow involves preview with unified diff, approval, and application with state persistence. Heuristic agents provide reliable fallback when LLM features are unavailable.

### Key Features
- **Project Management**: Create and manage projects from predefined templates (e.g., Next.js 14, Expo SDK 51).
- **Workbench**: Two-pane development interface with live AI chat on the left and workspace tabs on the right. Resizable split view with Dev Console, Diffs, Preview, Usage analytics, and Settings. Connects to LLM Planner v2 via WebSocket for real-time AI assistance.
- **AI Chat Builder**: Real-time collaborative development with a WebSocket-powered swarm orchestrator.
- **Supabase Integration**: One-click auto-integration with existing or new Supabase projects. Interactive setup wizard with health monitoring, automatic database bootstrap with RLS policies, and proper credential management for web/server/mobile.
- **Referral Tracking**: Neutral affiliate system with link generation, cookie attribution, event tracking (signups, purchases), revenue reporting, and CSV export. No external SaaS dependencies.
- **Usage Analytics**: Real-time tracking and visualization of AI token usage (input/output), tasks, and system metrics with daily/weekly/monthly charts. Integrated into Workbench and available as standalone page.
- **Monetization (Collab Pay)**: Complete subscription and billing system with pricing page (monthly/yearly toggle), SKU-based checkout flow, secure webhook processing with signature verification, real-time entitlement management from Postgres, upgrade modals, paywall guards, and billing settings dashboard. Supports Free tier (3 projects, 50 AI minutes) and Pro tier (50 projects, 500 AI minutes, priority support). Integrates with referral system for attribution tracking.
- **Dev Console**: Integrated development environment with a file tree, code editor, live preview, and terminal access.
- **Design Mode**: Real-time customization of design tokens with live visual feedback.
- **Brand System**: Runtime application of design tokens with live Server-Sent Events (SSE) updates.
- **Diff Tracking and Approvals**: Automatic tracking of file changes with a unified diff viewer and a workflow for approving or rejecting AI-generated code.
- **Security & Reliability**: Implements security headers, rate limiting, dev console guards, SSE heartbeats, and detailed audit logging.

## External Dependencies
- **OpenAI API**: For LLM Planner v2 (provider-agnostic, supports OpenAI, Azure, local models via compatible endpoints).
- **Supabase**: Backend-as-a-Service for authentication, database (Postgres), and storage with @supabase/supabase-js SDK.
- **React**: Frontend UI library.
- **Wouter**: Client-side routing for React.
- **TanStack Query**: Data fetching and caching.
- **Shadcn UI**: UI component library.
- **Lucide Icons**: Icon library.
- **Express**: Backend web framework.
- **Zod, Drizzle-Zod, AJV**: Data validation and schema definition.
- **Helmet**: Security middleware.
- **CORS**: Cross-Origin Resource Sharing middleware.
- **Express Rate Limit**: Rate limiting middleware.
- **Pino**: Structured logging library.
- **Tailwind CSS**: Utility-first CSS framework.
- **Postgres**: Database for entitlements and other persistent data.
- **Sentry**: Error tracking for mobile and web.
- **Google Play Android Publisher v3 API**: For IAP verification.
- **Apple StoreKit 2 JWS**: For IAP verification.
- **ws**: WebSocket library.
- **diff**: Unified diff generation.
- **cookie-parser**: Cookie parsing middleware for referral attribution.