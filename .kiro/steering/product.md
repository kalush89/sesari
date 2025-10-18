---
inclusion: always
---

---
inclusion: always
---

# Sesari Product Guidelines

## Product Context
Sesari is an AI-powered KPI tracker and strategy planner for founders. Core features: KPI visualization, SMART objective creation and tracking, multi-tenant workspace management, and AI-driven insights.

## Tech Stack Requirements
- **Framework**: Next.js 15 App Router with TypeScript strict mode
- **Styling**: Tailwind CSS v4 only (no custom CSS)
- **State**: React Query (server state) + Zustand (UI state)
- **Database**: PostgreSQL with Row-Level Security (RLS)
- **Validation**: Zod for all inputs

## Component Standards

### React Component Pattern
```typescript
interface ComponentProps {
  id: string;
  optional?: boolean;
}

export function ComponentName({ id, optional = false }: ComponentProps) {
  // Server Components by default, 'use client' only when needed
  // Always include loading/error states for async operations
  return <div className="tailwind-classes">{content}</div>;
}
```

### File Organization
- Components: `PascalCase.tsx` (`KpiDashboard.tsx`)
- Pages: `page.tsx` in lowercase folders
- Utilities: `camelCase.ts`
- Domain-based folders: `/dashboard`, `/kpi`, `/auth`

## Business Rules

### Plan Restrictions
- **Free Plan**: Manual KPIs only, single workspace
- **Paid Plans**: Integrations, AI features, multiple workspaces
- **Trial**: 14-day trial for paid features

### Core Integrations
- **Stripe**: Revenue/MRR tracking + subscription management
- **Google Analytics**: Traffic and conversion metrics
- **OpenAI**: AI objective suggestions and insights
- **Lemon Squeezy**: Payment processing

## Key Features

### Priority Components
1. **KPI Dashboard**: Chart visualization with objective tracking
2. **Momentum Meter**: Circular progress for workspace health
3. **AI Strategy Planner**: SMART objective generation
4. **Weekly Insights**: Automated performance summaries

### Multi-Tenant Security
- All database queries must enforce workspace isolation via RLS
- Validate workspace access in API routes before data operations
- Never bypass RLS except for admin operations
- Store workspace context in Zustand for UI state

## Development Patterns

### State Management
- **React Query**: KPIs, objectives, integrations (server state)
- **Zustand**: Workspace context, modals, filters (UI state)
- Call `queryClient.invalidateQueries()` after mutations

### Error Handling
- Include loading states for all async operations
- Show user-friendly error messages (no technical details)
- Implement graceful fallbacks for failed operations

### Mobile-First Design
- Use responsive Tailwind classes (`sm:`, `md:`, `lg:`)
- Test on 320px minimum width
- Prioritize touch-friendly interactions