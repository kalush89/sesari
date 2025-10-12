---
inclusion: always
---

# Sesari Development Guidelines

## Product Overview
Sesari is an AI-powered KPI tracker and strategy planner for founders. When implementing features, prioritize KPI visualization, SMART goal creation, and multi-tenant workspace management.

## Required Tech Stack
- **Framework**: Next.js 15 App Router with TypeScript strict mode
- **Styling**: Tailwind CSS v4 only (no CSS modules or styled-components)
- **State**: React Query for server state (KPI, goals, integrations)and Zustand for global and local UI state (workspace context, filters, goal modals)
- **Architecture**: Multi-tenant with Row-Level Security (RLS)
- **Validation**: Zod

## Project Structure Rules
Follow this exact structure when creating new files:
```
src/
├── app/           # Next.js pages and API routes
├── components/    # Reusable UI components
│   └── layout/    # AppLayout, Sidebar components
└── [feature]/     # Feature-specific components (e.g., kpi/, dashboard/)
```

## Code Standards

### TypeScript Requirements
- Define interfaces for all component props
- Never use `any` - use proper types or `unknown`
- Export interfaces for reusable components
- Enable strict null checks

### Component Template
Use this exact pattern for all React components:
```typescript
interface ComponentNameProps {
  // Define all props with proper types
}

export function ComponentName({ prop }: ComponentNameProps) {
  // Include loading and error states
  // Use functional components only
  return <div className="tailwind-classes">content</div>
}
```

### File Naming Convention
- Components: `PascalCase.tsx` (e.g., `KpiDashboard.tsx`)
- Pages: `page.tsx` in lowercase folders
- Utilities: `camelCase.ts`
- Types: `types.ts` or `ComponentName.types.ts`

### Import Rules
- Always use `@/` path alias for src imports
- Order: external libraries → internal components → types
- Group imports with blank lines between categories

## UI/UX Requirements

### Design System
- **Navigation**: `gray-900` background
- **Page backgrounds**: `gray-100`
- **Spacing**: Use Tailwind's spacing scale (4, 6, 8, 12, 16, 24)
- **Responsive**: Mobile-first approach with `sm:`, `md:`, `lg:` breakpoints

### Component Behavior
- Include hover states with `hover:` classes
- Add smooth transitions with `transition-colors duration-200`
- Implement loading states for async operations
- Show user-friendly error messages
- Follow existing sidebar navigation pattern

### Accessibility
- Use semantic HTML (`<nav>`, `<main>`, `<section>`)
- Add ARIA labels for interactive elements
- Ensure keyboard navigation with `tabIndex`
- Maintain WCAG color contrast ratios

## Security Patterns

### Multi-Tenant Architecture
- Implement RLS for all database queries
- Validate workspace access in API routes before data operations
- Store secrets in environment variables only
- Never expose API keys in client-side code

### Data Validation
- Use Zod for input validation
- Validate inputs on both client and server
- Sanitize user inputs before database operations
- Return meaningful error messages without exposing system details

## Business Logic

### Plan Restrictions
- **Free**: Manual KPIs only, single workspace
- **Starter/Pro**: Enable integrations and AI features
- **Trial**: 14-day trial for paid plans

### Required Integrations
- **Stripe**: Revenue metrics and subscription management
- **Google Analytics**: Traffic and conversion data
- **OpenAI**: AI goal suggestions and insights
- **Lemon Squeezy**: Payment processing
- **Resend**: Email notifications

## Core Features

### Key Components
- **Momentum Meter**: Circular progress for workspace health
- **KPI Dashboard**: Chart visualization with goal tracking
- **AI Strategy Planner**: SMART goal generation with KPI binding
- **Weekly Insights**: Automated performance summaries

### Implementation Priority
1. Google OAuth authentication with workspace tenancy
2. Manual KPI dashboard with chart visualization
3. Stripe and Google Analytics integrations
4. AI-powered goal creation and suggestions
5. Billing and subscription management

## Development Guidelines
- Create minimal, focused components
- Handle loading and error states in all async operations
- Follow existing patterns in layout components
- Test multi-tenant scenarios during development
- Prioritize mobile responsiveness in all UI components