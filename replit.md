# Supernova - AI-Powered App Builder

## Overview
Supernova is an intelligent application builder platform that uses AI-powered agents to scaffold, build, and deploy web and mobile applications. Its core purpose is to streamline app development through AI, offering a robust tool for creating high-quality frontend and design-centric applications with production-ready code. The platform aims to provide a robust tool for creating high-quality, design-centric applications with production-ready code, focusing on business vision and market potential.

## User Preferences
- **Visual Priority**: Frontend quality is paramount - exceptional attention to spacing, typography, colors, and interactions
- **Design System**: Collab Creative Studio - Refined neon aesthetic with balanced visual effects
- **Color Scheme**: Dark background (#0a0a0f) with neon cyan, pink, yellow, and green accents
- **Visual Effects**: Brighter static raster grid background (rgba 0.08-0.10), toned-down neon glow effects, gradient text using header brand colors (#7c3aed to #22d3ee)
- **Fonts**: Inter for UI, JetBrains Mono for code
- **Components**: Custom neon-styled cards and buttons with colorful typography, unified SharedHeader component

## System Architecture

### Frontend
The frontend uses React, Wouter for routing, TanStack Query for data fetching, and Shadcn UI components. It features a modular structure including pages for landing, dashboard, project details, a dev console, diff viewer, and approvals workflow. A custom brand system manages runtime design tokens via CSS variables and SSE for live updates, supporting layout primitives. The visual identity is "Collab Creative Studio Neon Design." A global AppShell and SharedHeader provide consistent styling and navigation.

### Backend
The Express-based backend handles core API endpoints for projects, templates, agents, approvals, in-app purchases, and entitlements. It includes a dev-routes module for file system access, terminal execution, and design token management. Production-ready IAP verification for Google Play and Apple App Store is included, with automatic entitlement grant fulfillment to Postgres. The entitlements system uses Postgres (Replit-hosted Neon) for persistent storage with transactional integrity, tracking coins, subscriptions, and purchase history.

The monetization system (Collab Pay) provides billing and subscription infrastructure with SKU-based product configuration, checkout session creation, webhook processing, and real-time entitlement grants. It supports Free and Pro tier limits and benefits.

Supabase integration allows connecting to existing projects or auto-provisioning new ones via the Supabase Management API, including pre-configured clients, automated database bootstrap with RLS-safe tables, and health checks.

A neutral referral tracking system stores data in Supabase, featuring affiliate link generation, 30-day cookie-based attribution, click tracking, event recording for signups and purchases, a real-time statistics dashboard, and CSV export for payout processing.

The observability stack includes Pino for structured JSON logging and Sentry for error tracking. Security middleware (Helmet, CORS, rate limiting) provides defense-in-depth hardening. Data persistence primarily uses Postgres, with in-memory storage for other application data. Request logging uses custom serializers to redact sensitive information.

### Mobile
The mobile application is built with Expo SDK 51 and React Native, integrating design tokens that sync with the brand system. Sentry is used for error tracking. The mobile CI/CD pipeline uses EAS with three build profiles and GitHub Actions workflows.

### AI Agent System
Supernova features a dual-mode AI system supporting both heuristic-based and LLM-powered agents for code generation, error analysis, and automated fixes. The LLM Planner v2 is a provider-agnostic system (OpenAI, Azure, local models) for structured JSON planning, intelligent error explanation, and automated code fixes. Users can toggle LLM mode per-session or globally.

A real-time AI-assisted development system operates via WebSocket, employing a multi-agent orchestrator with roles like Planner, Builder, Tester, Explainer, and Fixer. Users interact through a React chat interface with an autonomy mode toggle and LLM v2 toggle. File operations enforce whitelist security with path traversal protection. A patch workflow includes preview with unified diff, approval, and application with state persistence. Heuristic agents provide a reliable fallback.

### Key Features
- **Project Management**: Create and manage projects from predefined templates.
- **Workbench**: Three-pane development interface with RoomsSidebar, AI chat, and workspace tabs, connecting to LLM Planner v2 via WebSocket.
- **Rooms System**: Persistent chat rooms with CRUD operations, message persistence to Postgres, shareable links, and read-only public viewer.
- **AI Chat Builder**: Real-time collaborative development with a WebSocket-powered swarm orchestrator.
- **Swarm Receipts**: AI action logging system with native Postgres storage, tracking plan/edit/command/test/fix operations with status, diffs, and timestamps. Viewable via Receipts tab in Workbench with auto-refresh and detail view.
- **Living Project Model (LPM)**: AI-powered architecture guidance system that maintains a living understanding of project structure. Provides feature impact analysis, architecture recommendations, and decision history tracking. Accessible via LPM tab in Workbench.
- **Enhanced Intent Capture**: Intelligent dependency tracking and breaking change detection system. Analyzes user actions to predict impacts, detect potential breaking changes, and suggest mitigation strategies. Features project dependency graph, impact predictions with severity scoring, and automated suggestion generation.
- **Self-Healing Engine & Intent Debugger**: Automated break prevention and repair system. The Self-Healing Orchestrator generates healing plans including compatibility layers, automated migrations, and code fixes based on high-risk intent captures (severity >= 7). The Intent Debugger tracks discrepancies between user intent and actual behavior, analyzes execution paths and outcomes, and generates automated fixes. Includes healing action tracking, debug session management, and real-time status monitoring. Intent classification prioritizes destructive actions ("delete", "remove", "drop") to ensure proper severity scoring. Deletion actions automatically receive severity-9 predictions when no dependencies are found, guaranteeing healing trigger. API endpoint: POST /api/intent/:roomId/captures for intent capture, POST /api/healing/:roomId/heal/:intentId for healing initiation.
- **Supabase Integration**: One-click auto-integration with existing or new Supabase projects, including setup wizard and health monitoring.
- **Referral Tracking**: Neutral affiliate system with link generation, cookie attribution, event tracking, revenue reporting, and CSV export.
- **Usage Analytics**: Real-time tracking and visualization of AI token usage, tasks, and system metrics.
- **Monetization (Collab Pay)**: Subscription and billing system with pricing, SKU-based checkout, secure webhook processing, and real-time entitlement management.
- **Dev Console**: Integrated development environment with file tree, code editor, live preview, and terminal access.
- **Design Mode**: Real-time customization of design tokens with live visual feedback.
- **Brand System**: Runtime application of design tokens with live Server-Sent Events (SSE) updates.
- **Diff Tracking and Approvals**: Automatic tracking of file changes with a unified diff viewer and workflow for approving or rejecting AI-generated code.
- **Security & Reliability**: Implements security headers, rate limiting, dev console guards, SSE heartbeats, and detailed audit logging.

## External Dependencies
- **OpenAI API**: For LLM Planner v2.
- **Supabase**: Backend-as-a-Service for authentication, database (Postgres), and storage.
- **React**: Frontend UI library.
- **Wouter**: Client-side routing.
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
- **cookie-parser**: Cookie parsing middleware.