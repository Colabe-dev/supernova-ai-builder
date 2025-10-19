# Supernova Builder - Design Guidelines

## Design Approach

**System-Based Approach**: Developer productivity tool inspired by Linear, Vercel, and GitHub
**Rationale**: This is a utility-focused, information-dense platform where efficiency and learnability are paramount. Users need clarity when reviewing code, managing projects, and working with AI agents.

## Core Design Principles

1. **Code-First Clarity**: Information hierarchy optimized for technical content
2. **Purposeful Minimalism**: Every element serves the developer's workflow
3. **Confident Actions**: Clear states for AI-generated changes and approvals
4. **Speed Perception**: Fast-feeling interface through skeleton states and instant feedback

---

## Color Palette

### Dark Mode (Primary)
- **Background Base**: 220 15% 8%
- **Background Elevated**: 220 15% 11%
- **Background Subtle**: 220 15% 15%
- **Border Default**: 220 10% 22%
- **Border Emphasis**: 220 8% 30%

### Brand & Accent
- **Primary Brand**: 262 80% 58% (vibrant purple - confidence and innovation)
- **Primary Hover**: 262 75% 65%
- **Success**: 142 70% 45% (code approved, tests passed)
- **Warning**: 38 92% 50% (review needed)
- **Error**: 0 84% 60% (tests failed, conflicts)

### Text Hierarchy
- **Text Primary**: 220 10% 95%
- **Text Secondary**: 220 8% 70%
- **Text Tertiary**: 220 6% 50%
- **Text Inverse**: 220 15% 15% (on brand backgrounds)

### Light Mode
- **Background Base**: 220 15% 98%
- **Background Elevated**: 0 0% 100%
- **Text Primary**: 220 15% 15%
- **Text Secondary**: 220 10% 35%

---

## Typography

### Font Families
- **Primary Interface**: Inter (Google Fonts) - clean, modern, excellent at small sizes
- **Code/Technical**: JetBrains Mono (Google Fonts) - for code snippets, schemas, file paths
- **Marketing/Hero**: Inter with tighter tracking for impact

### Type Scale
- **Hero/Display**: text-5xl md:text-6xl font-bold tracking-tight
- **Page Title**: text-3xl font-semibold
- **Section Header**: text-xl font-semibold
- **Subsection**: text-base font-medium
- **Body**: text-sm leading-relaxed
- **Caption/Metadata**: text-xs text-secondary
- **Code**: text-sm font-mono

---

## Layout System

### Spacing Primitives
**Consistent vertical rhythm using: 2, 4, 6, 8, 12, 16, 24 (Tailwind units)**

- **Component Internal**: p-4, gap-2, space-y-4
- **Section Padding**: py-8 md:py-12, px-4 md:px-6
- **Page Margins**: max-w-7xl mx-auto px-6
- **Card/Panel Padding**: p-6 for content, p-4 for compact

### Grid System
- **Dashboard**: 12-column grid with sidebar (256px fixed) + main area
- **Project List**: grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6
- **Approval Workflows**: Two-pane layout (files list + diff viewer)

### Container Widths
- **Marketing Pages**: max-w-7xl
- **Dashboard**: Full width with max-w-screen-2xl
- **Content Reading**: max-w-4xl
- **Forms**: max-w-2xl

---

## Component Library

### Navigation
**Top Bar**: Fixed header (h-14) with logo, project selector, user menu
- Background: bg-elevated with border-b
- Contains: breadcrumb navigation, action buttons (New Project, Run Build)

**Sidebar**: Collapsible navigation (256px expanded, 64px collapsed)
- Sections: Projects, Templates, Agents, Settings
- Active state: bg-subtle with left border (border-l-2 border-primary)

### Buttons
**Primary**: bg-primary text-inverse font-medium px-4 py-2 rounded-lg hover:bg-primary-hover
**Secondary**: border border-emphasis bg-transparent hover:bg-subtle
**Ghost**: No border, hover:bg-subtle for tertiary actions
**Icon Only**: p-2 rounded-md hover:bg-subtle

### Cards & Panels
**Project Card**:
- Border: border border-default
- Hover: border-emphasis with subtle shadow
- Padding: p-6, rounded-xl
- Content: Icon/thumbnail, title (font-semibold), metadata (text-xs text-secondary), status badge

**Info Panel**: bg-elevated border border-default rounded-lg p-6

### Approvals Workflow
**File Tree**: Left pane (320px) with nested structure
- Changed files with color-coded indicators (green=added, orange=modified, red=deleted)
- File type icons using Heroicons

**Diff Viewer**: Right pane (flex-1)
- Split view: before/after with line numbers
- Syntax highlighting for code
- Inline comments capability
- Action bar: Approve, Request Changes, Comment

### Forms
**Input Fields**: 
- Height: h-10
- Border: border border-default focus:border-primary focus:ring-2 focus:ring-primary/20
- Background: bg-elevated in dark mode
- Padding: px-3

**Select/Dropdown**: Same styling as inputs with chevron icon

**Code Editor Integration**: Monaco Editor embedded with theme matching

### Status & Feedback
**Badges**: 
- Rounded-full px-2.5 py-0.5 text-xs font-medium
- Colors: success (green), warning (yellow), error (red), info (blue)

**Toast Notifications**: Bottom-right, slide-in animation, auto-dismiss (4s)

**Progress Indicators**: 
- Skeleton loaders for async content
- Spinner for actions in progress
- Linear progress bar (h-1) for builds/generations

### Data Display
**Agent Activity Log**:
- Timeline view with icons (Heroicons)
- Timestamp + agent name + action
- Expandable for detailed output

**Project Stats Dashboard**:
- Grid of metric cards (3-4 columns)
- Large number (text-3xl font-bold) + label + trend indicator

**Template Gallery**:
- Card grid with preview images
- Overlay on hover with "Use Template" button
- Tech stack badges at bottom

---

## Animations

**Minimal & Purposeful**:
- Page transitions: None (instant navigation for speed)
- Hover states: transition-colors duration-150
- Modal/Dialog: Fade in backdrop + slide up content (duration-200)
- Sidebar collapse: transition-all duration-300 ease-in-out
- NO scroll animations, parallax, or decorative motion

---

## Images

### Hero Section (Marketing Landing)
**Large hero image**: Yes - place a high-quality screenshot/mockup of the Supernova interface in action
- Position: Right side of hero (60% width) on desktop, full-width below headline on mobile
- Style: Subtle shadow, rounded-2xl border border-default/50
- Content: Dashboard view showing agent activity, code generation, or approval workflow
- Treatment: Slight gradient overlay at edges to blend with background

### Additional Images
- **Template Cards**: Thumbnail previews (16:9 aspect ratio) showing UI/code
- **Agent Icons**: Simple, monochromatic icons (Heroicons) for Planner, Implementer, Tester, Fixer
- **Empty States**: Illustration or icon + helpful text when no projects exist
- **Feature Showcase**: Side-by-side screenshots showing before/after or workflow steps (2-column grid)

---

## Marketing/Landing Page Structure

**Layout**: Clean, developer-focused, 6-7 sections

1. **Hero**: Bold headline + subheading + CTA + hero screenshot (right-aligned)
2. **Social Proof**: Logos or simple stat cards (builds generated, developers using)
3. **How It Works**: 4-step process with icons and brief descriptions (grid-cols-4)
4. **Key Features**: 3 feature cards (Planner, Implementer, Tester+Fixer) with icons + descriptions
5. **Code Example**: Actual schema JSON or generated code snippet with syntax highlighting
6. **Templates Showcase**: Carousel or grid of available templates
7. **CTA + Footer**: Newsletter signup optional, focus on "Get Started" action

**Color Treatment**: Mostly neutral with strategic purple accent on CTAs and key headings. Avoid gradients except subtle fade on hero image edges.

**Vertical Rhythm**: py-16 md:py-24 for sections, py-8 for subsections

---

## Accessibility Notes

- Maintain WCAG AA contrast ratios (already met with chosen colors)
- All interactive elements have focus:ring-2 focus:ring-primary/50
- Form inputs have proper labels and error states
- Icon buttons include aria-labels
- Consistent dark mode across all inputs and text fields