# API Route Security Implementation

This document describes the comprehensive API route security validation system implemented for Sesari's authentication requirements.

## Overview

The API security system provides multiple layers of protection:
- Authentication validation
- Workspace access control
- Permission-based authorization
- Input validation with Zod schemas
- Security audit logging
- Rate limiting

## Requirements Addressed

- **4.3**: Validate workspace access before processing any data operations
- **4.4**: Return appropriate error codes for unauthorized access attempts
- **3.4**: Enforce role-based access control within workspaces
- **5.1**: Verify authentication status for API routes

## Core Components

### 1. API Middleware (`api-middleware.ts`)

Provides comprehensive security validation with configurable options:

```typescript
import { withApiSecurity, ApiSecurityPresets } from '@/lib/auth/api-middleware';

// Basic authenticated endpoint
export const GET = withApiSecurity(ApiSecurityPresets.AUTHENTICATED)(
  async (context, request) => {
    // context.userId, context.email available
    return new Response(JSON.stringify({ success: true }));
  }
);

// Workspace-scoped endpoint with permissions
export const POST = withApiSecurity(ApiSecurityPresets.KPI_WRITE)(
  async (context, request) => {
    // context.workspaceId, context.role, context.permissions available
    return new Response(JSON.stringify({ success: true }));
  }
);
```

### 2. Enhanced API Route Security (`api-route-security.ts`)

Provides comprehensive validation including request body/params/query validation:

```typescript
import { createApiRoute, ApiSchemas, createSuccessResponse } from '@/lib/auth/api-route-security';

export const POST = createApiRoute(
  {
    ...ApiSecurityPresets.KPI_WRITE,
    paramsSchema: ApiSchemas.workspaceParam,
    bodySchema: ApiSchemas.kpiBody,
    querySchema: ApiSchemas.paginationQuery,
    methods: ['POST']
  },
  async (context, request) => {
    // All validation passed, data is type-safe
    const { workspaceId } = request.params!;
    const kpiData = request.body!;
    const { page, limit } = request.query || {};
    
    return createSuccessResponse({ id: 'new-kpi' }, 'Created successfully', 201);
  }
);
```

### 3. Security Audit System (`security-audit.ts`)

Provides comprehensive logging and monitoring:

```typescript
import { securityAuditLogger, withSecurityAudit } from '@/lib/auth/security-audit';

// Automatic security logging
export const GET = withSecurityAudit(async (request) => {
  // All access attempts are logged automatically
  return new Response('OK');
});

// Manual logging
securityAuditLogger.log({
  endpoint: '/api/sensitive',
  method: 'POST',
  action: 'access_denied',
  reason: 'Insufficient permissions',
  userId: 'user-123',
  ipAddress: '192.168.1.1'
});
```

## Security Presets

Pre-configured security settings for common patterns:

### Public Endpoints
```typescript
ApiSecurityPresets.PUBLIC // No authentication required
```

### Authenticated Endpoints
```typescript
ApiSecurityPresets.AUTHENTICATED // Basic authentication required
```

### Workspace-Scoped Endpoints
```typescript
ApiSecurityPresets.WORKSPACE // Auth + workspace access required
ApiSecurityPresets.WORKSPACE_ADMIN // Auth + workspace + admin role
ApiSecurityPresets.WORKSPACE_OWNER // Auth + workspace + owner role
```

### Resource-Specific Endpoints
```typescript
ApiSecurityPresets.KPI_READ // View KPI permission
ApiSecurityPresets.KPI_WRITE // Create/Edit KPI permission
ApiSecurityPresets.KPI_DELETE // Delete KPI permission
ApiSecurityPresets.OBJECTIVE_READ // View objective permission
ApiSecurityPresets.OBJECTIVE_WRITE // Create/Edit objective permission
ApiSecurityPresets.OBJECTIVE_DELETE // Delete objective permission
ApiSecurityPresets.MEMBER_INVITE // Invite members permission
ApiSecurityPresets.MEMBER_MANAGE // Manage members permission
```

## Validation Schemas

Pre-built Zod schemas for common API patterns:

```typescript
import { ApiSchemas } from '@/lib/auth/api-route-security';

// Parameter validation
ApiSchemas.uuidParam // { id: string (UUID) }
ApiSchemas.workspaceParam // { workspaceId: string (UUID) }
ApiSchemas.memberParam // { workspaceId: string, memberId: string }

// Query validation
ApiSchemas.paginationQuery // { page?: number, limit?: number, sort?: string }

// Body validation
ApiSchemas.inviteMemberBody // { email: string, role: 'admin' | 'member' }
ApiSchemas.kpiBody // { name: string, description?: string, target?: number }
ApiSchemas.objectiveBody // { title: string, description?: string, deadline?: string }
```

## Error Handling

Standardized error responses with proper HTTP status codes:

```typescript
// Authentication errors (401)
{
  "error": "session_expired",
  "message": "Authentication required"
}

// Authorization errors (403)
{
  "error": "workspace_access_denied",
  "message": "Access denied to this workspace"
}

{
  "error": "insufficient_permissions",
  "message": "Permission denied: create_kpi"
}

// Validation errors (400)
{
  "error": "validation_error",
  "message": "Invalid request body",
  "details": [
    {
      "path": ["name"],
      "message": "String must contain at least 1 character(s)"
    }
  ]
}

// Method not allowed (405)
{
  "error": "method_not_allowed",
  "message": "Method DELETE not allowed. Allowed methods: GET, POST"
}
```

## Security Audit Features

### Automatic Logging
- All API access attempts are logged
- Failed authentication/authorization attempts are tracked
- Suspicious activity detection (multiple failed attempts)
- IP address and user agent tracking

### Audit Log Structure
```typescript
interface SecurityAuditLog {
  timestamp: Date;
  userId?: string;
  workspaceId?: string;
  endpoint: string;
  method: string;
  action: 'access_granted' | 'access_denied' | 'authentication_failed' | 'permission_denied';
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}
```

### Security Monitoring
```typescript
// Get recent failed attempts
const failedAttempts = securityAuditLogger.getFailedAttempts(3600000); // Last hour

// Detect suspicious activity
const suspicious = securityAuditLogger.getSuspiciousActivity('user-123');

// Get recent logs
const recentLogs = securityAuditLogger.getRecentLogs(100);
```

## Rate Limiting

Basic rate limiting implementation:

```typescript
import { globalRateLimiter } from '@/lib/auth/security-audit';

const rateLimit = globalRateLimiter.checkRateLimit(
  'api-endpoint:user-123',
  100, // max requests
  60000 // per minute
);

if (!rateLimit.allowed) {
  // Return 429 Too Many Requests
}
```

## Migration Guide

### From Old Pattern
```typescript
// Old approach
export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const body = await request.json();
  // Manual validation...
  
  return NextResponse.json({ success: true });
}
```

### To New Pattern
```typescript
// New approach
export const POST = createApiRoute(
  {
    ...ApiSecurityPresets.AUTHENTICATED,
    bodySchema: z.object({ name: z.string() }),
    methods: ['POST']
  },
  async (context, request) => {
    // context.userId automatically available
    // request.body automatically validated
    return createSuccessResponse({ success: true });
  }
);
```

## Best Practices

### 1. Use Security Presets
Always start with a security preset that matches your endpoint's requirements:

```typescript
// Good
export const GET = createApiRoute(ApiSecurityPresets.KPI_READ, handler);

// Avoid manual configuration unless necessary
export const GET = createApiRoute({
  requireAuth: true,
  requireWorkspace: true,
  requiredPermissions: [Permission.VIEW_KPI]
}, handler);
```

### 2. Validate All Inputs
Always validate request parameters, body, and query parameters:

```typescript
export const POST = createApiRoute(
  {
    ...ApiSecurityPresets.WORKSPACE,
    paramsSchema: ApiSchemas.workspaceParam, // Validate route params
    bodySchema: ApiSchemas.kpiBody,          // Validate request body
    querySchema: ApiSchemas.paginationQuery  // Validate query params
  },
  handler
);
```

### 3. Use Standardized Responses
Use the helper functions for consistent response formats:

```typescript
// Success responses
return createSuccessResponse(data, 'Operation successful', 201);

// Error responses
return createErrorResponse('validation_error', 'Invalid input', 400, details);
```

### 4. Handle Workspace Context
For workspace-scoped endpoints, always validate workspace access:

```typescript
export const GET = createApiRoute(
  ApiSecurityPresets.WORKSPACE, // Automatically validates workspace access
  async (context, request) => {
    // context.workspaceId is guaranteed to be valid
    // context.role contains the user's role in this workspace
  }
);
```

### 5. Implement Proper Permissions
Use specific permission checks for protected operations:

```typescript
// Good - specific permission
export const DELETE = createApiRoute(ApiSecurityPresets.KPI_DELETE, handler);

// Better - multiple permissions if needed
export const POST = createApiRoute({
  ...ApiSecurityPresets.WORKSPACE,
  requiredPermissions: [Permission.CREATE_KPI, Permission.EDIT_KPI]
}, handler);
```

## Testing

The security system includes comprehensive tests:

```bash
# Run security tests
npm test src/lib/auth/__tests__/api-route-security.test.ts

# Validate all API routes
npx tsx scripts/validate-api-security.ts
```

## Security Validation Script

Use the validation script to audit all API routes:

```bash
npx tsx scripts/validate-api-security.ts
```

This will:
- Scan all API route files
- Check for proper authentication
- Validate workspace access controls
- Verify permission checks
- Ensure input validation
- Generate a security report

## Troubleshooting

### Common Issues

1. **"Authentication required" errors**
   - Ensure the endpoint uses a security preset that requires auth
   - Check that the NextAuth token is properly configured

2. **"Workspace access denied" errors**
   - Verify the user has access to the requested workspace
   - Check that the workspace ID in the URL matches the user's session

3. **"Permission denied" errors**
   - Confirm the user's role has the required permissions
   - Check the permission configuration in the security preset

4. **Validation errors**
   - Ensure request body/params match the Zod schema
   - Check that all required fields are provided

### Debug Mode

Enable debug logging by setting the environment variable:
```bash
DEBUG_API_SECURITY=true
```

This will log detailed information about security checks and validation steps.