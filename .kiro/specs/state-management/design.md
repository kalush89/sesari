# State Management Design

## Overview

The state management architecture uses a layered approach with React Query for server state, Zustand for client state, and React Hook Form for form state. This design ensures optimal performance with React Server Components while providing reactive updates for the dashboard.

## Architecture

### State Layers

```
┌─────────────────┐
│   UI Components │
├─────────────────┤
│ Zustand Stores  │ ← Client State
├─────────────────┤
│  React Query    │ ← Server State
├─────────────────┤
│   API Routes    │
├─────────────────┤
│   Database      │
└─────────────────┘
```

### Technology Stack
- **Server State**: `@tanstack/react-query` v5
- **Client State**: `zustand` v4
- **Form State**: `react-hook-form` v7
- **Persistence**: `localStorage` + NextAuth session

## Components and Interfaces

### Zustand Store Structure

```typescript
// /src/lib/stores/useUIStore.ts
interface UIState {
  sidebarCollapsed: boolean
  theme: 'light' | 'dark'
  activeWorkspaceId: string | null
  modals: {
    createGoal: boolean
    editKPI: boolean
  }
}

// /src/lib/stores/useGoalStore.ts
interface GoalState {
  optimisticUpdates: Map<string, Partial<Goal>>
  filters: {
    status: GoalStatus[]
    dateRange: DateRange
  }
}

// /src/lib/stores/useIntegrationStore.ts
interface IntegrationState {
  connections: Record<string, ConnectionStatus>
  lastSync: Record<string, Date>
  errors: Record<string, string>
}
```

### React Query Configuration

```typescript
// /src/lib/query/queryClient.ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
    mutations: {
      onError: (error) => toast.error(error.message),
    },
  },
})
```

## Data Models

### State Flow Pattern

1. **User Interaction** → Zustand store update (optimistic)
2. **Mutation Trigger** → React Query mutation
3. **Server Response** → Query invalidation
4. **UI Update** → Automatic re-render

### Workspace Context

```typescript
interface WorkspaceContext {
  id: string
  name: string
  plan: 'free' | 'starter' | 'pro'
  features: string[]
}
```

## Error Handling

### Error Boundaries
- Wrap each major section with error boundaries
- Fallback to cached state when possible
- Show user-friendly error messages

### Optimistic Update Rollback
```typescript
const updateGoalProgress = useMutation({
  mutationFn: updateGoal,
  onMutate: (variables) => {
    // Optimistic update
    goalStore.setOptimisticUpdate(variables.id, variables)
  },
  onError: (error, variables) => {
    // Rollback optimistic update
    goalStore.removeOptimisticUpdate(variables.id)
    toast.error('Failed to update goal')
  },
})
```

## Testing Strategy

### Unit Tests
- Test each Zustand store in isolation
- Mock React Query hooks for component tests
- Test optimistic update scenarios

### Integration Tests
- Test state synchronization between layers
- Verify workspace context persistence
- Test error handling and rollback scenarios

### Test Structure
```
/src/lib/stores/__tests__/
├── useUIStore.test.ts
├── useGoalStore.test.ts
└── useIntegrationStore.test.ts
```