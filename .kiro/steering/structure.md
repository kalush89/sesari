---
inclusion: always
---

# Project Structure Guidelines

## Directory Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── (auth)/            # Auth-related pages (signin, error)
│   ├── dashboard/         # Dashboard pages
│   ├── api/               # API route handlers
│   └── layout.tsx         # Root layout
├── components/            # Reusable UI components
│   ├── auth/              # Authentication components
│   ├── layout/            # Layout components (AppLayout, Sidebar)
│   ├── dashboard/         # Dashboard-specific components
│   ├── kpi/               # KPI-related components
│   ├── objectives/        # Objective management components
│   └── providers/         # React context providers
├── lib/                   # Shared utilities and business logic
│   ├── auth/              # Authentication logic and middleware
│   ├── db/                # Database helpers and RLS utilities
│   ├── stores/            # Zustand state management
│   └── types/             # TypeScript type definitions
├── services/              # External service integrations
│   └── integrations/      # Third-party API connectors
└── middleware.ts          # Next.js middleware
```

## File Organization Rules

### Component Structure
- **Domain-based**: Group components by feature area (`auth/`, `dashboard/`, `kpi/`)
- **Layout separation**: Keep layout components in dedicated `layout/` folder
- **Shared components**: Place reusable UI components at root of `components/`

### Library Organization
- **Auth module**: Complete authentication system in `lib/auth/`
- **Database**: All DB utilities and RLS helpers in `lib/db/`
- **State management**: Zustand stores in `lib/stores/`
- **Types**: Centralized TypeScript definitions in `lib/types/`

### Service Integration
- **External APIs**: Each integration gets its own folder in `services/integrations/`
- **Adapters**: Implement consistent interface for all external services
- **Configuration**: Store integration configs in respective service folders

## Naming Conventions

### Files and Folders
- **Components**: `PascalCase.tsx` (e.g., `KpiDashboard.tsx`)
- **Pages**: `page.tsx` in lowercase folders
- **Utilities**: `kebab-case.ts` (e.g., `auth-helpers.ts`)
- **Types**: `types.ts` or `ComponentName.types.ts`
- **Tests**: `__tests__/` folders with `.test.ts` suffix

### Import Paths
- **Absolute imports**: Use `@/` alias for all src imports
- **Relative imports**: Only for files in same directory
- **Index files**: Use for clean public APIs from folders

## Architecture Patterns

### Multi-tenant Structure
- **RLS enforcement**: All database queries must include workspace context
- **Workspace isolation**: Components receive workspace ID through context
- **Permission checks**: Implement role-based access at component level

### State Management
- **Server state**: React Query for API data (KPIs, objectives, integrations)
- **UI state**: Zustand for global UI state (workspace context, modals)
- **Local state**: React useState for component-specific state

### Security Boundaries
- **API routes**: Validate workspace access before data operations
- **Client components**: Never expose sensitive data or API keys
- **Database layer**: Enforce RLS at schema level, not application level