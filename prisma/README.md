# Database Schema and RLS Setup

This directory contains the Prisma schema and migrations for Sesari's multi-tenant authentication system with Row-Level Security (RLS).

## Overview

The database schema implements:
- **NextAuth.js compatibility** - Standard tables for OAuth authentication
- **Multi-tenant architecture** - Workspaces with isolated data access
- **Row-Level Security (RLS)** - Database-level data isolation
- **Role-based permissions** - Owner, Admin, Member roles with different access levels

## Schema Structure

### Core Tables

1. **users** - User accounts (managed by NextAuth.js)
2. **accounts** - OAuth provider accounts (NextAuth.js)
3. **sessions** - User sessions (NextAuth.js)
4. **workspaces** - Multi-tenant workspaces
5. **workspace_memberships** - User-workspace relationships with roles

### Security Features

- **RLS Policies**: Automatic workspace isolation at database level
- **Role Validation**: Database constraints for valid roles (owner, admin, member)
- **Plan Validation**: Database constraints for valid plan types (free, starter, pro)
- **Cascade Deletes**: Proper cleanup when workspaces or users are deleted

## RLS Implementation

### How RLS Works

1. **Context Setting**: Before queries, set current user ID in database session
2. **Policy Enforcement**: Database automatically filters results based on user's workspace access
3. **Automatic Isolation**: No application code can bypass workspace boundaries

### RLS Functions

- `auth.user_id()` - Extract user ID from JWT token
- `get_current_user_id()` - Get current user from session context

### RLS Policies

- **workspace_access** - Users only see workspaces they're members of
- **membership_access** - Users only see memberships for their workspaces
- **workspace_owner_membership_management** - Owners can manage all memberships in their workspaces
- **user_own_memberships** - Users can always see their own memberships

## Usage

### Database Operations

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (development)
npm run db:push

# Create and run migrations (production)
npm run db:migrate

# Seed database with test data
npm run db:seed

# Open Prisma Studio
npm run db:studio
```

### Application Code

```typescript
import { prisma } from '@/lib/db';
import { withRLSContext, validateWorkspaceAccess } from '@/lib/db/rls';

// Always use RLS context for workspace-scoped queries
const workspaces = await withRLSContext(prisma, userId, async () => {
  return await prisma.workspace.findMany();
});

// Validate workspace access before operations
const hasAccess = await validateWorkspaceAccess(prisma, userId, workspaceId);
if (!hasAccess) {
  throw new Error('Unauthorized workspace access');
}
```

## Security Considerations

### Critical Rules

1. **Never bypass RLS** - All workspace queries must use RLS context
2. **Validate access** - Always check workspace access in API routes
3. **Use utilities** - Leverage provided RLS helper functions
4. **Test isolation** - Regularly test workspace data isolation

### Testing RLS

Use the validation utilities to test RLS policies:

```typescript
import { testRLSPolicies, validateDatabaseSchema, testWorkspaceIsolation } from '@/lib/db/validation';

// Test RLS for a specific user
await testRLSPolicies(userId, workspaceId);

// Validate schema and constraints
await validateDatabaseSchema();

// Test workspace isolation
await testWorkspaceIsolation();
```

## Migration History

1. **001_initial_auth_schema** - Core authentication tables and relationships
2. **002_enable_rls_policies** - RLS policies and security constraints

## Troubleshooting

### Common Issues

1. **RLS Context Not Set**: Ensure `setRLSContext()` is called before queries
2. **Permission Denied**: Check if user has workspace membership
3. **Migration Failures**: Verify database connection and permissions
4. **Data Isolation**: Use validation utilities to test RLS policies

### Performance Optimization

- Indexes are created on frequently queried columns
- RLS policies are optimized for common access patterns
- Use connection pooling for production deployments

## Environment Variables

Required environment variables:

```env
DATABASE_URL="postgresql://..."          # Connection pooling URL
DIRECT_URL="postgresql://..."            # Direct connection for migrations
```

For Supabase:
- `DATABASE_URL` should use port 6543 (pgbouncer)
- `DIRECT_URL` should use port 5432 (direct connection)