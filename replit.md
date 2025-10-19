# Supernova - AI-Powered App Builder

## Overview
Supernova is an intelligent application builder platform that uses AI-powered agents to scaffold, build, and deploy web and mobile applications. The platform features specialized agents (Planner, Implementer, Tester, Fixer) that work together to generate production-ready code with an approvals workflow for reviewing changes.

**Current State**: Fully functional MVP - all features working, core user journey tested
**Tech Stack**: React, TypeScript, Express, Tailwind CSS, Shadcn UI, OpenAI API
**Last Updated**: 2025-01-19

## Recent Changes
- **2025-01-19**: Complete MVP implementation
  - ✅ Full frontend with landing page, dashboard, project management, approvals workflow
  - ✅ Theme system with dark mode (default) and light mode toggle
  - ✅ Purple brand design system (262 80% 58%) with Shadcn components
  - ✅ Sidebar navigation with Wouter routing
  - ✅ All backend API endpoints implemented and working
  - ✅ OpenAI agent integration functional (planner, implementer, tester, fixer)
  - ✅ In-memory storage with seeded templates
  - ✅ Fixed critical bug: API response parsing in mutations (must call .json())
  - ✅ End-to-end tested: create project → run agents → view activity

## User Preferences
- **Visual Priority**: Frontend quality is paramount - exceptional attention to spacing, typography, colors, and interactions
- **Design System**: Developer-focused productivity tool inspired by Linear, Vercel, GitHub
- **Color Scheme**: Dark mode primary with vibrant purple accent
- **Fonts**: Inter for UI, JetBrains Mono for code
- **Components**: Shadcn UI with consistent hover/active states

## Project Architecture

### Frontend Structure
```
client/src/
├── pages/
│   ├── landing.tsx          # Marketing landing page
│   ├── dashboard.tsx        # Project list with cards
│   ├── project-detail.tsx   # Individual project with agent activity
│   ├── approvals.tsx        # Code review workflow
│   ├── templates.tsx        # Available project templates
│   ├── settings.tsx         # Settings (placeholder)
│   └── not-found.tsx        # 404 page
├── components/
│   ├── app-sidebar.tsx      # Main navigation sidebar
│   ├── theme-toggle.tsx     # Dark/light mode switch
│   └── new-project-dialog.tsx  # Create project modal
├── contexts/
│   └── theme-context.tsx    # Theme provider
└── lib/
    └── queryClient.ts       # React Query setup
```

### Backend Structure
```
server/
├── routes.ts                # All API endpoints (projects, templates, agents, approvals)
├── storage.ts               # In-memory data storage with IStorage interface
├── agents.ts                # OpenAI agent runner (planner, implementer, tester, fixer)
└── vite.ts                  # Vite dev server config

shared/
└── schema.ts                # Shared TypeScript types and Zod schemas
```

### Data Models
- **Projects**: User's applications with status tracking
- **Templates**: Predefined scaffolds (Next.js 14, Expo SDK 51)
- **AgentRuns**: Execution logs for AI agents
- **Approvals**: Code review workflow for generated changes

### Key Features
1. **Landing Page**: Hero section with features, templates showcase, CTA
2. **Project Management**: Create, list, and manage projects with template selection
3. **AI Agent System**: Run specialized agents (Planner, Implementer, Tester, Fixer) on projects
4. **Approvals Workflow**: Review and approve/reject AI-generated code changes with visual diffs
5. **Template Library**: Browse available project templates
6. **Theme System**: Dark/light mode with persistent preference

## Development Notes

### Design Tokens
- Primary Brand: `hsl(262 80% 58%)` - Purple
- Success: `hsl(142 70% 45%)` - Green for approved/completed
- Warning: `hsl(38 92% 50%)` - Orange for review needed
- Error: `hsl(0 84% 60%)` - Red for failed/rejected
- Background (Dark): `hsl(220 15% 8%)`
- Card Background (Dark): `hsl(220 15% 11%)`

### API Endpoints (Implemented ✅)
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `GET /api/projects/:id/agent-runs` - Get agent activity for project
- `POST /api/projects/:id/run-agent` - Execute AI agent (runs async with OpenAI)
- `GET /api/templates` - List available templates (Next.js 14, Expo 51)
- `GET /api/approvals` - List all code approvals
- `GET /api/approvals/:id` - Get approval details
- `PATCH /api/approvals/:id` - Update approval status (approve/reject)

### Technical Notes
- **API Response Handling**: All mutations must call `.json()` on apiRequest response
- **Agent Execution**: Agents run asynchronously with OpenAI - results appear in activity feed
- **Storage**: In-memory only - data clears on server restart
- **Templates**: Pre-seeded with Next.js 14 + Tailwind and Expo SDK 51 + NativeWind

### Future Enhancements
1. Add real-time agent execution updates via WebSockets
2. Implement streaming responses for agent outputs
3. Add project export/download functionality
4. Persist data with PostgreSQL database
5. Add user authentication and multi-tenancy

## Dependencies
- **Frontend**: React, Wouter, TanStack Query, Shadcn UI, Lucide Icons
- **Backend**: Express, OpenAI SDK (via Replit AI Integrations)
- **Validation**: Zod, Drizzle-Zod
- **Styling**: Tailwind CSS with custom design tokens

## Environment Variables
- `AI_INTEGRATIONS_OPENAI_API_KEY` - Managed by Replit AI Integrations
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - Managed by Replit AI Integrations
- `SESSION_SECRET` - For session management
