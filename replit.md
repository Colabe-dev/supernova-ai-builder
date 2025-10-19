# Supernova - AI-Powered App Builder

## Overview
Supernova is an intelligent application builder platform that uses AI-powered agents (Planner, Implementer, Tester, Fixer) to scaffold, build, and deploy web and mobile applications. The platform emphasizes generating production-ready code with an approvals workflow for reviewing changes. Its business vision is to streamline app development through AI, offering a robust tool for creating web and mobile applications with a focus on high-quality frontend and design.

## Recent Changes
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
The backend, built with Express, handles core API endpoints for projects, templates, agents, approvals, and in-app purchases. It includes a dev-routes module for file system access, terminal execution, and design token management. The IAP routes provide production-ready verification for Google Play (via Android Publisher v3 API) and Apple App Store (via StoreKit 2 JWS verification). 

The observability stack includes Pino for structured JSON logging with pino-http middleware, optional Sentry integration for error tracking, and centralized configuration management via server/env/index.js. Security middleware (Helmet, CORS, rate limiting) provides defense-in-depth hardening. Design tokens are validated using an AJV schema. The system uses an in-memory storage solution for data persistence.

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