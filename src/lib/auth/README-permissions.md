# Role-Based Permission System

This document describes the comprehensive role-based permission system implemented for Sesari's multi-tenant authentication.

## Overview

The permission system provides fine-grained access control with three main components:
1. **Role definitions** with hierarchical permissions
2. **API route validation** for server-side protection
3. **Component-level gates** for UI access control

## Roles and Permissions

### Role Hierarchy
- **OWNER**: Full workspace control including billing and management
- **ADMIN**: KPI and objective management, member invitations (no billing)
- **MEMBER**: Read-only access to KPIs and objectives

### Permission Categories

#### Workspace Management
- `MANAGE_WORKSPACE`: Full workspace settings control
- `INVITE_MEMBERS`: Invite new team members
- `MANAGE_BILLING`: Access billing and subscription settings

#### KPI Management
- `CREATE_KPI`: Create new KPIs
- `EDIT_KPI`: Modify existing KPIs
- `DELETE_KPI`: Remove KPIs
- `VIEW_KPI`: Read access to KPIs

#### Objective Management
- `CREATE_OBJECTIVE`: Create new objectives
- `EDIT_OBJECTIVE`: Modify existing objectives
- `DELETE_OBJECTIVE`: Remove objectives
- `VIEW_OBJECTIVE`: Read access to objectives

### Role Permission Matrix

| Permission | OWNER | ADMIN | MEMBER |
|------------|-------|-------|--------|
| MANAGE_WORKSPACE | ✅ | ❌ | ❌ |
| INVITE_MEMBERS | ✅ | ✅ | ❌ |
| MANAGE_BILLING | ✅ | ❌ | ❌ |
| CREATE_KPI | ✅ | ✅ | ❌ |
| EDIT_KPI | ✅ | ✅ | ❌ |
| DELETE_KPI | ✅ | ✅ | ❌ |
| VIEW_KPI | ✅ | ✅ | ✅ |
| CREATE_OBJECTIVE | ✅ | ✅ | ❌ |
| EDIT_OBJECTIVE | ✅ | ✅ | ❌ |
| DELETE_OBJECTIVE | ✅ | ✅ | ❌ |
| VIEW_OBJECTIVE | ✅ | ✅ | ✅ |

## Usage Examples

### Client-Side Permission Hooks

```typescript
import { 
  usePermission, 
  useAnyPermission, 
  useAllPermissions,
  useUserRole,
  useIsOwner,
  useIsAdmin 
} from '@/lib/auth/permission-hooks';
import { Permission, WorkspaceRole } from '@/lib/db';

function MyComponent() {
  // Check single permission
  const canCreateKpi = usePermission(Permission.CREATE_KPI);
  
  // Check multiple permissions (any)
  const canManageContent = useAnyPermission([
    Permission.CREATE_KPI,
    Permission.EDIT_KPI
  ]);
  
  // Check multiple permissions (all required)
  const canFullyManage = useAllPermissions([
    Permission.CREATE_KPI,
    Permission.DELETE_KPI
  ]);
  
  // Check role
  const userRole = useUserRole();
  const isOwner = useIsOwner();
  const isAdmin = useIsAdmin();
  
  return (
    <div>
      {canCreateKpi && <button>Create KPI</button>}
      {isAdmin && <button>Admin Panel</button>}
    </div>
  );
}
```

### Permission Gates

```typescript
import { 
  PermissionGate, 
  RoleGate, 
  AdminGate, 
  OwnerOnlyGate,
  ConditionalRender 
} from '@/components/auth/PermissionGate';
import { Permission, WorkspaceRole } from '@/lib/db';

function Dashboard() {
  return (
    <div>
      {/* Show content only if user has permission */}
      <PermissionGate permission={Permission.CREATE_KPI}>
        <button>Create KPI</button>
      </PermissionGate>
      
      {/* Show content only for specific role */}
      <RoleGate role={WorkspaceRole.OWNER}>
        <button>Workspace Settings</button>
      </RoleGate>
      
      {/* Show content for admins and owners */}
      <AdminGate>
        <button>Manage Team</button>
      </AdminGate>
      
      {/* Show content only for owners */}
      <OwnerOnlyGate>
        <button>Billing Settings</button>
      </OwnerOnlyGate>
      
      {/* Conditional rendering with fallback */}
      <ConditionalRender permission={Permission.EDIT_KPI}>
        {{
          allowed: <button>Edit KPI</button>,
          denied: <span>Read-only access</span>
        }}
      </ConditionalRender>
    </div>
  );
}
```

### API Route Validation

```typescript
import { NextRequest } from 'next/server';
import { 
  validatePermission, 
  validateWorkspaceAuth,
  withApiValidation 
} from '@/lib/auth/api-validation';
import { Permission } from '@/lib/db';

// Validate specific permission
export const POST = withApiValidation(async (
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) => {
  // This will throw if user lacks permission
  const session = await validatePermission(
    request, 
    params.workspaceId, 
    Permission.CREATE_KPI
  );
  
  // Proceed with KPI creation
  return new Response(JSON.stringify({ success: true }));
});

// Validate workspace access only
export const GET = withApiValidation(async (
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) => {
  // This will throw if user lacks workspace access
  const session = await validateWorkspaceAuth(request, params.workspaceId);
  
  // User has access to workspace, proceed
  return new Response(JSON.stringify({ data: [] }));
});
```

## Server-Side Utilities

### Permission Checking Functions

```typescript
import { 
  hasPermission, 
  getRolePermissions,
  checkPermission 
} from '@/lib/db/permissions';
import { WorkspaceRole, Permission } from '@/lib/db';

// Check if role has specific permission
const canEdit = hasPermission(WorkspaceRole.ADMIN, Permission.EDIT_KPI);

// Get all permissions for a role
const adminPermissions = getRolePermissions(WorkspaceRole.ADMIN);

// String-based permission check (for compatibility)
const canManage = checkPermission(WorkspaceRole.OWNER, 'manage_workspace');
```

## Security Considerations

### Multi-Tenant Isolation
- All permission checks include workspace context
- RLS policies enforce database-level isolation
- API routes validate workspace access before permission checks

### Error Handling
- Permission denied returns 403 status
- Workspace access denied returns 403 status
- Authentication required returns 401 status
- All errors include user-friendly messages

### Best Practices
1. Always use permission gates in UI components
2. Validate permissions in API routes before data operations
3. Use the most restrictive permission required
4. Test permission boundaries thoroughly
5. Log permission violations for security monitoring

## Testing

### Unit Tests
```typescript
import { hasPermission } from '@/lib/db/permissions';
import { WorkspaceRole, Permission } from '@/lib/db';

describe('Permission System', () => {
  it('should grant owner all permissions', () => {
    expect(hasPermission(WorkspaceRole.OWNER, Permission.MANAGE_WORKSPACE)).toBe(true);
  });
  
  it('should deny member create permissions', () => {
    expect(hasPermission(WorkspaceRole.MEMBER, Permission.CREATE_KPI)).toBe(false);
  });
});
```

### Integration Tests
- Test API route protection with different roles
- Verify UI components respect permission gates
- Validate workspace isolation works correctly

## Troubleshooting

### Common Issues
1. **Permission denied unexpectedly**: Check if user has correct role in workspace
2. **UI not updating**: Ensure session includes role information
3. **API returning 403**: Verify workspace access and required permissions
4. **Tests failing**: Mock session data with proper role structure

### Debug Tools
- Use browser dev tools to inspect session data
- Check server logs for permission validation errors
- Use the validation scripts in `/scripts` directory