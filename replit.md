# Supernova - AI-Powered App Builder

## Overview
Supernova is an intelligent application builder platform that uses AI-powered agents to scaffold, build, and deploy web and mobile applications. Its core purpose is to streamline app development through AI, offering a robust tool for creating high-quality frontend and design-centric applications with production-ready code.

## User Preferences
- **Visual Priority**: Frontend quality is paramount - exceptional attention to spacing, typography, colors, and interactions
- **Design System**: Collab Creative Studio - Neon aesthetic with vibrant colors and glow effects
- **Color Scheme**: Dark background (#0a0a0f) with neon cyan, pink, yellow, and green accents
- **Visual Effects**: Animated grid backgrounds, neon glow shadows, gradient text, glassmorphic cards
- **Fonts**: Inter for UI, JetBrains Mono for code
- **Components**: Custom neon-styled cards and buttons with colorful typography

## System Architecture

### Frontend
The frontend is built with React, Wouter for routing, TanStack Query for data fetching, and Shadcn UI components. It features a modular structure including pages for landing, dashboard, project details, a dev console, diff viewer, and approvals workflow. A custom brand system manages runtime design tokens via CSS variables and SSE for live updates, supporting layout primitives like Container, Stack, Grid, Card, and Button. The visual identity is "Collab Creative Studio Neon Design."

### Backend
The backend, built with Express, handles core API endpoints for projects, templates, agents, approvals, in-app purchases, and entitlements. It includes a dev-routes module for file system access, terminal execution, and design token management. The IAP routes provide production-ready verification for Google Play and Apple App Store, with automatic entitlement grant fulfillment to Postgres. The entitlements system uses **Postgres** (Replit-hosted Neon) for persistent storage with transactional integrity, tracking coins, subscriptions, and purchase history. Idempotency is enforced via unique external_ref constraints.

The observability stack includes Pino for structured JSON logging with pino-http middleware and Sentry integration for error tracking. Security middleware (Helmet, CORS, rate limiting) provides defense-in-depth hardening. **Data persistence** uses Postgres for entitlements and in-memory storage for other application data.

**Logging & Redaction Policy**: All request logging uses custom pino-http serializers that whitelist only safe headers and redact sensitive query parameters in development mode. In production, all query parameters are fully redacted. Authorization, Cookie, and other sensitive headers are never logged.

### Mobile
The mobile application is built with Expo SDK 51 and React Native, featuring design token integration that syncs with the brand system. It includes Sentry for error tracking. The mobile CI/CD pipeline uses EAS (Expo Application Services) with three build profiles (development, preview, production) and GitHub Actions workflows for builds, OTA updates, and store submissions.

### AI Agent System
Supernova utilizes specialized AI agents (Planner, Implementer, Tester, Fixer) to generate and modify application code, with an approvals workflow for reviewing and managing changes, and Git integration for creating branches upon approval.

A real-time AI-assisted development system operates via WebSocket at `/api/chat/ws`. A multi-agent orchestrator coordinates roles: Planner for intent detection, Builder for file operations with diff preview, Tester for automated validation, Explainer for error analysis, and Fixer for automated remediation. Users interact through a React chat interface with an autonomy mode toggle (auto-apply vs. manual approval). File operations enforce whitelist security (`client/src`, `client/package.json`, `server`, `shared`, `public`) with path traversal protection. The patch workflow involves preview with unified diff, approval, and application with state persistence in `server/.supernova/`. The current implementation uses heuristic-based logic, designed for seamless LLM integration in future versions.

### Key Features
- **Project Management**: Create and manage projects from predefined templates (e.g., Next.js 14, Expo SDK 51).
- **AI Chat Builder**: Real-time collaborative development with a WebSocket-powered swarm orchestrator.
- **Dev Console**: Integrated development environment with a file tree, code editor, live preview, and terminal access.
- **Design Mode**: Real-time customization of design tokens with live visual feedback.
- **Brand System**: Runtime application of design tokens with live Server-Sent Events (SSE) updates.
- **Diff Tracking and Approvals**: Automatic tracking of file changes with a unified diff viewer and a workflow for approving or rejecting AI-generated code.
- **Security & Reliability**: Implements security headers, rate limiting, dev console guards, SSE heartbeats, and detailed audit logging.

## External Dependencies
- **OpenAI API**: For AI agent functionality.
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