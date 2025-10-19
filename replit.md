# Supernova - AI-Powered App Builder

## Overview
Supernova is an intelligent application builder platform that uses AI-powered agents to scaffold, build, and deploy web and mobile applications. The platform features specialized agents (Planner, Implementer, Tester, Fixer) that work together to generate production-ready code with an approvals workflow for reviewing changes.

**Current State**: MVP with full frontend implementation, backend scaffolding in progress
**Tech Stack**: React, TypeScript, Express, Tailwind CSS, Shadcn UI, OpenAI API
**Last Updated**: 2025-01-19

## Recent Changes
- **2025-01-19**: Initial project setup
  - Created complete frontend with landing page, dashboard, project management, approvals workflow
  - Implemented theme system with dark mode (default) and light mode
  - Configured design system with purple brand color (262 80% 58%)
  - Set up routing with Wouter and sidebar navigation
  - Integrated OpenAI via Replit AI Integrations for agent capabilities
  - Defined complete data schema for projects, templates, agent runs, and approvals

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
├── routes.ts                # API endpoints
├── storage.ts               # In-memory data storage
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

### API Endpoints (To Be Implemented)
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `GET /api/projects/:id/agent-runs` - Get agent activity
- `POST /api/projects/:id/run-agent` - Execute AI agent
- `GET /api/templates` - List available templates
- `GET /api/approvals` - List code approvals
- `PATCH /api/approvals/:id` - Update approval status

### Next Steps
1. Implement backend API routes with in-memory storage
2. Integrate OpenAI for agent functionality
3. Add real-time agent execution with streaming responses
4. Implement file diff generation for approvals
5. Add project export/download functionality

## Dependencies
- **Frontend**: React, Wouter, TanStack Query, Shadcn UI, Lucide Icons
- **Backend**: Express, OpenAI SDK (via Replit AI Integrations)
- **Validation**: Zod, Drizzle-Zod
- **Styling**: Tailwind CSS with custom design tokens

## Environment Variables
- `AI_INTEGRATIONS_OPENAI_API_KEY` - Managed by Replit AI Integrations
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - Managed by Replit AI Integrations
- `SESSION_SECRET` - For session management
