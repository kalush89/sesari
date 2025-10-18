---
inclusion: always
---

# Sesari Coding & Architecture Rules

## TypeScript Standards

- **Strict Mode**: Enable `"strict": true` - never use `any` without explicit justification comment
- **Interfaces**: Define for all component props and API responses
- **Enums**: Use for plan types, roles, integration states, and KPI categories
- **Exports**: Default exports for React components, named exports for utilities/types
- **Validation**: Zod schemas for all API inputs and external data

## React Component Patterns

```typescript
// Required component template
interface ComponentProps {
  id: string;
  optional?: boolean;
}

export function ComponentName({ id, optional = false }: ComponentProps) {
  // Server Components by default, 'use client' only when needed
  // Include loading/error states for async operations
  return <div className="tailwind-classes">{/* content */}</div>;
}
```

**Rules:**
- Function declarations (not arrow functions) for components
- Server Components by default for performance
- Client Components only for interactivity (`'use client'`)
- Custom hooks must be focused and testable

## File Structure & Naming

```
src/
├── app/              # Next.js pages & API routes
├── components/       # UI components by domain
│   ├── layout/       # AppLayout, Sidebar
│   └── [feature]/    # kpi/, dashboard/, auth/
├── lib/              # Utilities, auth, db helpers
└── services/         # External integrations
```

**Conventions:**
- Files: `kebab-case.ts` (`objective-tracker.ts`)
- Components: `PascalCase.tsx` (`ObjectiveChart.tsx`)
- Directories: Domain-based (`/dashboard`, `/auth`)

## Security Requirements

### Multi-Tenant RLS
- **Always**: Implement Row-Level Security for all database queries
- **Validate**: Workspace access in API routes before data operations
- **Context**: Inject workspace_id into all queries automatically
- **Never**: Bypass RLS except for admin operations with service account

### Data Protection
- Environment variables only for secrets (AWS Secrets Manager)
- Zod validation on both client and server
- No PII in logs without explicit consent
- Lemon Squeezy tokens only (never raw payment data)

## State Management

- **React Query**: Server state (KPIs, objectives, integrations)
- **Zustand**: UI state (workspace context, filters, modals)
- **Pattern**: `queryClient.invalidateQueries()` after all mutations
- **RLS**: Workspace context automatically injected into queries

## Integration Architecture

All external integrations must implement:
```typescript
interface IntegrationAdapter {
  connect(): Promise<void>;
  sync(): Promise<SyncResult>;
  transform(data: RawData): KPIData;
  disconnect(): Promise<void>;
}
```

## Testing Requirements

- **Unit**: Vitest for auth, billing, integrations, RLS modules
- **E2E**: Playwright for critical user flows
- **Coverage**: Minimum 70% for security-critical code
- **Mocks**: Required for all external API calls

## Performance & Quality

### Optimization
- React Server Components for data fetching
- Proper loading states for async operations
- Database query optimization with indexing
- Minimal client-side JavaScript

### Code Quality
- Functions: Small, single-purpose, descriptive names
- Logic: Centralize shared code in `/lib` and `/services`
- Complexity: Choose simplest working solution
- Nesting: Minimize folder depth and indirection

## Critical Prohibitions

- ❌ Sensitive data in client-side code
- ❌ Bypassing RLS for normal queries
- ❌ Direct production DB writes outside migrations
- ❌ `any` type without justification
- ❌ Secrets committed to repository

## Error Handling

- TypeScript error types with proper discrimination
- Graceful fallbacks for failed operations
- User-friendly error messages (no technical details)
- Structured logging with context (no PII)
- Network timeout and retry handling