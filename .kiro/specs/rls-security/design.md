# Design Document

## Overview

The RLS security system implements PostgreSQL Row-Level Security policies with automatic workspace context injection through Prisma middleware. This ensures complete data isolation between workspaces without requiring manual filtering in application code.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js App   │───▶│  Prisma Client   │───▶│   PostgreSQL    │
│                 │    │  + RLS Middleware│    │  + RLS Policies │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Auth Context    │    │ setRLSContext()  │    │ workspace_id    │
│ (workspace_id)  │    │ Helper Function  │    │ Row Filtering   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Components and Interfaces

### RLS Context Manager
- **Location**: `/lib/db-utils.ts`
- **Purpose**: Manages workspace context for database queries
- **Interface**:
  ```typescript
  interface RLSContext {
    workspace_id: string;
    user_id: string;
  }
  
  function setRLSContext(context: RLSContext): void
  function getRLSContext(): RLSContext | null
  ```

### Prisma RLS Middleware
- **Location**: `/lib/db/client.ts`
- **Purpose**: Automatically injects workspace context into all queries
- **Behavior**: Intercepts queries and adds workspace filtering

### Database Policies
- **Location**: `/lib/db/schema.prisma` and migration files
- **Purpose**: PostgreSQL RLS policies for each multi-tenant table
- **Scope**: All tables containing workspace-scoped data

## Data Models

### RLS-Enabled Tables
- `workspaces` - Self-filtering by id
- `users` - Filtered by workspace membership
- `kpis` - Filtered by workspace_id
- `goals` - Filtered by workspace_id
- `integrations` - Filtered by workspace_id

### Policy Structure
```sql
-- Example policy for KPIs table
CREATE POLICY kpi_workspace_isolation ON kpis
  USING (workspace_id = current_setting('app.current_workspace_id')::uuid);
```

## Error Handling

### RLS Violations
- **Detection**: PostgreSQL blocks unauthorized queries
- **Logging**: Capture violations in audit log table
- **Response**: Return 403 Forbidden with generic error message

### Missing Context
- **Detection**: Middleware checks for workspace context
- **Response**: Throw authentication error before query execution
- **Fallback**: Block all database access until context is set

## Testing Strategy

### Unit Tests
- RLS context injection and retrieval
- Middleware workspace filtering
- Policy validation for each table

### Integration Tests
- Cross-workspace data isolation
- Context switching between workspaces
- Audit logging for violations

### Security Tests
- Attempt direct database queries without context
- Verify policy enforcement across all tables
- Test workspace switching scenarios