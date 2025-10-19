# Supernova - AI-Powered App Builder

## Overview
Supernova is an intelligent application builder platform that uses AI-powered agents to scaffold, build, and deploy web and mobile applications. The platform features specialized agents (Planner, Implementer, Tester, Fixer) that work together to generate production-ready code with an approvals workflow for reviewing changes.

**Current State**: Sprint 2 Complete - Dev Console, Diff Viewer, and Design Tokens functional
**Tech Stack**: React, TypeScript, Express, Tailwind CSS, Shadcn UI, OpenAI API
**Last Updated**: 2025-01-19

## Recent Changes
- **2025-01-19 (Sprint 2)**: Dev Console & Design Mode
  - ✅ Dev Console page (/dev) with file tree, code editor, live preview, and terminal
  - ✅ File system API with whitelisting and security (GET/POST /api/dev/fs)
  - ✅ Diff tracking system - auto-records changes on file save
  - ✅ Diff viewer page (/diff) with unified diff display
  - ✅ Design Mode panel for customizing theme tokens (colors, fonts, spacing)
  - ✅ Terminal execution with command whitelist (node -v, npm -v, etc.)
  - ✅ SSE live preview refresh on file changes
  - ✅ End-to-end tested: edit files → save → view diffs → customize tokens

- **2025-01-19 (Sprint 1)**: Complete MVP implementation
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
│   ├── dev-console.tsx      # 🆕 File editor with design mode & terminal
│   ├── diff.tsx             # 🆕 Diff viewer for code changes
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
├── routes.ts                # Core API endpoints (projects, templates, agents, approvals)
├── dev-routes.ts            # 🆕 Dev console APIs (fs, terminal, tokens, diffs)
├── storage.ts               # In-memory data storage with IStorage interface
├── agents.ts                # OpenAI agent runner (planner, implementer, tester, fixer)
└── vite.ts                  # Vite dev server config

shared/
└── schema.ts                # Shared TypeScript types and Zod schemas

.supernova/
└── diffs/                   # 🆕 Auto-generated diffs from file saves

design.tokens.json           # 🆕 Customizable design tokens
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
4. **🆕 Dev Console**: File tree, code editor, live preview, terminal executor
5. **🆕 Design Mode**: Customize theme tokens (colors, fonts, spacing) with live preview
6. **🆕 Diff Viewer**: Track and review all file changes with unified diff format
7. **Approvals Workflow**: Review and approve/reject AI-generated code changes
8. **Template Library**: Browse available project templates
9. **Theme System**: Dark/light mode with persistent preference

## Development Notes

### Design Tokens
- Primary Brand: `hsl(262 80% 58%)` - Purple
- Success: `hsl(142 70% 45%)` - Green for approved/completed
- Warning: `hsl(38 92% 50%)` - Orange for review needed
- Error: `hsl(0 84% 60%)` - Red for failed/rejected
- Background (Dark): `hsl(220 15% 8%)`
- Card Background (Dark): `hsl(220 15% 11%)`

### API Endpoints (Implemented ✅)

**Core APIs:**
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `GET /api/projects/:id/agent-runs` - Get agent activity for project
- `POST /api/projects/:id/run-agent` - Execute AI agent (runs async with OpenAI)
- `GET /api/templates` - List available templates (Next.js 14, Expo 51)
- `GET /api/approvals` - List all code approvals
- `GET /api/approvals/:id` - Get approval details
- `PATCH /api/approvals/:id` - Update approval status (approve/reject)

**🆕 Dev Console APIs:**
- `GET /api/dev/fs?path=...` - List directory or read file content
- `POST /api/dev/fs` - Write file and auto-generate diff
- `GET /api/dev/preview/stream` - SSE stream for live preview refresh
- `POST /api/dev/terminal` - Execute whitelisted commands (node -v, npm -v)
- `GET /api/design/tokens` - Get design tokens configuration
- `POST /api/design/tokens` - Update design tokens
- `GET /api/diff/list` - List all recorded file diffs

### Technical Notes
- **API Response Handling**: All mutations must call `.json()` on apiRequest response
- **Agent Execution**: Agents run asynchronously with OpenAI - results appear in activity feed
- **Storage**: In-memory only - data clears on server restart
- **Templates**: Pre-seeded with Next.js 14 + Tailwind and Expo SDK 51 + NativeWind
- **🆕 Dev Console Security**: 
  - Auto-enabled in development mode (DEV_FS_ENABLE=true, DEV_TERMINAL_ENABLE=true)
  - Path whitelist: ["client/src", "server", "shared", "public"]
  - Command whitelist: ["node -v", "npm -v", "npm run build", "npm run lint"]
  - No path traversal (..) allowed
  - Disabled in production by default
- **🆕 Design Tokens**: Stored in design.tokens.json, applied as CSS variables
- **🆕 Diff Tracking**: Auto-generated unified diffs saved to .supernova/diffs/

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
