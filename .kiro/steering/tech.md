---
inclusion: always
---

# Technical Architecture Guidelines

## Core Tech Stack
- **Framework**: Next.js 15 App Router with TypeScript strict mode
- **Database**: PostgreSQL with Row-Level Security (RLS)
- **ORM**: Prisma with multi-tenant schema design
- **Authentication**: NextAuth.js with Google OAuth
- **State Management**: React Query (server state) + Zustand (UI state)
- **Styling**: Tailwind CSS v4 only
- **Validation**: Zod for all inputs and API responses
- **Testing**: Vitest (unit) + Playwright (e2e)
- **AI**: OpenAI GPT-4 for strategy suggestions
- **Charts**: Recharts for KPI visualization

## Architecture Patterns

### Multi-Tenant Security
- **RLS First**: All database queries must enforce workspace isolation
- **Context Injection**: Workspace ID automatically added to all queries
- **API Validation**: Verify workspace access before any data operations
- **No Bypass**: Never circumvent RLS except for admin service accounts

### State Management Rules
- **React Query**: Use for all server state (KPIs, objectives, integrations)
- **Zustand**: Use for UI state (workspace context, modals, filters)
- **Separation**: Never mix server state with UI-only state
- **Invalidation**: Call `queryClient.invalidateQueries()` after mutations
- **Store Structure**: One store per domain in `/lib/stores/`

### Component Architecture
- **Server Components**: Default for all components (better performance)
- **Client Components**: Only when interactivity required (`'use client'`)
- **Props**: Define TypeScript interfaces for all component props
- **Loading States**: Include loading/error states for async operations
- **Accessibility**: Use semantic HTML and ARIA labels

## File Organization

```
src/
├── app/                    # Next.js App Router (pages + API routes)
├── components/             # UI components by domain
│   ├── layout/            # AppLayout, Sidebar, Navigation
│   ├── auth/              # Authentication components
│   ├── dashboard/         # Dashboard-specific components
│   └── [feature]/         # Feature-specific components
├── lib/                   # Shared utilities and business logic
│   ├── auth/              # Authentication system
│   ├── db/                # Database helpers and RLS utilities
│   ├── stores/            # Zustand state stores
│   └── types/             # TypeScript definitions
└── services/              # External integrations
    └── integrations/      # Third-party API connectors
```

## Development Standards

### TypeScript Requirements
- **Strict Mode**: Enable `"strict": true` in tsconfig.json
- **No Any**: Never use `any` without explicit justification comment
- **Interfaces**: Define for all component props and API responses
- **Validation**: Use Zod schemas for all external data

### Security Requirements
- **Environment Variables**: Store all secrets in env vars (never in code)
- **Input Validation**: Validate on both client and server
- **Error Handling**: Return user-friendly messages (no technical details)
- **RLS Enforcement**: Test multi-tenant scenarios in all features

### Performance Guidelines
- **Server Components**: Prefer RSC for data fetching and rendering
- **Bundle Size**: Keep client-side JavaScript minimal
- **Database**: Optimize queries with proper indexing
- **Caching**: Use React Query for intelligent data caching

### Integration Architecture
All external service integrations must implement:
```typescript
interface IntegrationAdapter {
  connect(): Promise<void>;
  sync(): Promise<SyncResult>;
  transform(data: RawData): KPIData;
  disconnect(): Promise<void>;
}
```

## Testing Strategy
- **Unit Tests**: Required for auth, billing, RLS, and integration modules
- **E2E Tests**: Cover critical user flows (auth, KPI creation, billing)
- **Coverage**: Minimum 70% for security-critical code
- **Mocks**: Mock all external API calls in tests

## Critical Rules
- ❌ Never bypass RLS for normal operations
- ❌ No sensitive data in client-side code
- ❌ No secrets committed to repository
- ❌ No direct production database writes outside migrations
- ✅ Always validate workspace access in API routes
- ✅ Use TypeScript strict mode with proper interfaces
- ✅ Include loading and error states in all async components
