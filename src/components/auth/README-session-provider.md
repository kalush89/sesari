# Session Provider and Client-Side Authentication Implementation

## Overview

This implementation provides comprehensive client-side session management and authentication hooks that integrate NextAuth.js with workspace context management.

## Components Implemented

### 1. useAuth Hook (`src/lib/hooks/use-auth.ts`)

The main authentication hook that combines NextAuth session with workspace context:

```typescript
import { useAuth } from '@/lib/hooks/use-auth';

function MyComponent() {
  const {
    // Authentication state
    isAuthenticated,
    isLoading,
    user,
    session,
    
    // Workspace context
    workspace,
    workspaceId,
    role,
    permissions,
    availableWorkspaces,
    hasMultipleWorkspaces,
    
    // Actions
    signIn,
    signOut,
    switchWorkspace,
    refreshWorkspaces,
  } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please sign in</div>;

  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <p>Current workspace: {workspace?.name}</p>
      <p>Your role: {role}</p>
    </div>
  );
}
```

### 2. Enhanced SessionProvider (`src/components/providers/SessionProvider.tsx`)

Enhanced NextAuth SessionProvider with workspace synchronization:

```typescript
import { SessionProvider } from '@/components/providers/SessionProvider';

export default function RootLayout({ children, session }) {
  return (
    <SessionProvider session={session}>
      {children}
    </SessionProvider>
  );
}
```

### 3. AuthProvider (`src/components/providers/AuthProvider.tsx`)

Comprehensive authentication context provider:

```typescript
import { AuthProvider, useAuthContext } from '@/components/providers/AuthProvider';

function App() {
  return (
    <AuthProvider>
      <MyAuthenticatedApp />
    </AuthProvider>
  );
}

function MyAuthenticatedApp() {
  const { isAuthenticated, workspace, role } = useAuthContext();
  // Use authentication context
}
```

### 4. AuthGuard (`src/components/auth/AuthGuard.tsx`)

Route and component protection with role-based access control:

```typescript
import { AuthGuard, AuthCheck } from '@/components/auth/AuthGuard';
import { WorkspaceRole, Permission } from '@/lib/db';

// Protect entire component
function AdminPanel() {
  return (
    <AuthGuard 
      requireAuth={true}
      requireWorkspace={true}
      requiredRole={WorkspaceRole.ADMIN}
      requiredPermissions={[Permission.MANAGE_WORKSPACE]}
    >
      <div>Admin content</div>
    </AuthGuard>
  );
}

// Conditional rendering
function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      
      <AuthCheck 
        requiredPermissions={[Permission.CREATE_KPI]}
        fallback={<p>You need permission to create KPIs</p>}
      >
        <button>Create KPI</button>
      </AuthCheck>
    </div>
  );
}
```

### 5. AuthLoadingWrapper (`src/components/auth/AuthLoadingWrapper.tsx`)

Handles loading states for authentication and workspace context:

```typescript
import { AuthLoadingWrapper } from '@/components/auth/AuthLoadingWrapper';

function MyApp() {
  return (
    <AuthLoadingWrapper requireWorkspace={true}>
      <Dashboard />
    </AuthLoadingWrapper>
  );
}
```

## Usage Examples

### Basic Authentication Check

```typescript
import { useAuth } from '@/lib/hooks/use-auth';

function Header() {
  const { isAuthenticated, user, signIn, signOut } = useAuth();

  return (
    <header>
      {isAuthenticated ? (
        <div>
          <span>Welcome, {user.name}</span>
          <button onClick={() => signOut()}>Sign Out</button>
        </div>
      ) : (
        <button onClick={() => signIn()}>Sign In</button>
      )}
    </header>
  );
}
```

### Workspace Management

```typescript
import { useAuth } from '@/lib/hooks/use-auth';

function WorkspaceSelector() {
  const { 
    workspace, 
    availableWorkspaces, 
    hasMultipleWorkspaces,
    switchWorkspace 
  } = useAuth();

  if (!hasMultipleWorkspaces) {
    return <div>Current workspace: {workspace?.name}</div>;
  }

  return (
    <select 
      value={workspace?.id || ''} 
      onChange={(e) => switchWorkspace(e.target.value)}
    >
      {availableWorkspaces.map(ws => (
        <option key={ws.id} value={ws.id}>
          {ws.name} ({ws.role})
        </option>
      ))}
    </select>
  );
}
```

### Permission-Based UI

```typescript
import { useHasPermission, useUserRole } from '@/lib/hooks/use-auth';
import { Permission, WorkspaceRole } from '@/lib/db';

function KpiActions() {
  const canCreate = useHasPermission(Permission.CREATE_KPI);
  const canEdit = useHasPermission(Permission.EDIT_KPI);
  const isOwner = useUserRole() === WorkspaceRole.OWNER;

  return (
    <div>
      {canCreate && <button>Create KPI</button>}
      {canEdit && <button>Edit KPI</button>}
      {isOwner && <button>Delete Workspace</button>}
    </div>
  );
}
```

### API Request Headers

```typescript
import { useAuthHeaders } from '@/lib/hooks/use-auth';

function useApiCall() {
  const headers = useAuthHeaders();

  const fetchData = async () => {
    const response = await fetch('/api/kpis', {
      headers: {
        'Content-Type': 'application/json',
        ...headers, // Includes x-workspace-id and x-user-role
      },
    });
    return response.json();
  };

  return { fetchData };
}
```

### Higher-Order Components

```typescript
import { withAuthGuard } from '@/components/auth/AuthGuard';
import { WorkspaceRole } from '@/lib/db';

// Protect component with HOC
const ProtectedAdminPanel = withAuthGuard(AdminPanel, {
  requireAuth: true,
  requireWorkspace: true,
  requiredRole: WorkspaceRole.ADMIN,
});

function App() {
  return <ProtectedAdminPanel />;
}
```

## Integration with Existing Code

### Update Root Layout

```typescript
// src/app/layout.tsx
import { SessionProvider } from '@/components/providers/SessionProvider';
import { WorkspaceProvider } from '@/components/providers/WorkspaceProvider';
import { getAuthSession } from '@/lib/auth/session';

export default async function RootLayout({ children }) {
  const session = await getAuthSession();

  return (
    <html lang="en">
      <body>
        <SessionProvider session={session}>
          <WorkspaceProvider>
            {children}
          </WorkspaceProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
```

### Protect Dashboard Pages

```typescript
// src/app/dashboard/page.tsx
import { AuthGuard } from '@/components/auth/AuthGuard';
import { DashboardContent } from '@/components/dashboard/DashboardContent';

export default function DashboardPage() {
  return (
    <AuthGuard requireAuth={true} requireWorkspace={true}>
      <DashboardContent />
    </AuthGuard>
  );
}
```

## Requirements Satisfied

- **5.1**: Session management with middleware protection ✅
- **5.2**: Session validation with workspace context ✅  
- **6.1**: Workspace context persistence across sessions ✅
- **6.2**: Workspace switching functionality ✅
- **6.5**: UI components respect workspace context ✅

## Testing

Comprehensive tests are included for:
- `useAuth` hook functionality
- `AuthProvider` context management
- `AuthGuard` component protection
- Permission checking utilities
- Workspace context integration

Run tests with:
```bash
npm test src/lib/hooks/__tests__/use-auth.test.ts
npm test src/components/providers/__tests__/AuthProvider.test.tsx
npm test src/components/auth/__tests__/AuthGuard.test.tsx
```

## Security Considerations

- All authentication state is managed client-side only for UI purposes
- Server-side validation still required for all API endpoints
- Workspace context automatically included in API request headers
- Permission checks are advisory only - server must enforce permissions
- Session tokens are managed securely by NextAuth.js