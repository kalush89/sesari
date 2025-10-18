# Workspace Context Management

This module implements workspace context management using Zustand for state management and localStorage for persistence across browser sessions.

## Overview

The workspace context system provides:
- Current workspace selection and switching
- Role-based permissions management
- Persistence across browser sessions
- Loading and error state management
- Integration with NextAuth session management

## Components

### WorkspaceStore (`workspace-store.ts`)

The main Zustand store that manages workspace state:

```typescript
interface WorkspaceContextState {
  currentWorkspace: WorkspaceWithMembership | null;
  availableWorkspaces: WorkspaceWithMembership[];
  userRole: WorkspaceRole | null;
  permissions: Permission[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setCurrentWorkspace: (workspace, role, permissions) => void;
  setAvailableWorkspaces: (workspaces) => void;
  switchWorkspace: (workspaceId) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  clearWorkspaceContext: () => void;
}
```

**Key Features:**
- Persists workspace selection in localStorage
- Handles workspace switching with API calls
- Manages loading and error states
- Automatically refreshes workspace data

### WorkspaceProvider (`components/providers/WorkspaceProvider.tsx`)

React context provider that initializes workspace state:

```typescript
<WorkspaceProvider>
  <App />
</WorkspaceProvider>
```

**Responsibilities:**
- Initializes workspace context on authentication
- Clears context on sign out
- Shows loading states during initialization
- Syncs with NextAuth session changes

### Workspace Hooks (`lib/hooks/use-workspace.ts`)

Convenient hooks for accessing workspace context:

```typescript
// Main workspace hook
const { workspace, role, permissions, switchWorkspace } = useWorkspace();

// Permission checking hooks
const canManage = usePermission(Permission.MANAGE_WORKSPACE);
const hasAnyPerm = useHasAnyPermission([Permission.VIEW_KPI, Permission.CREATE_KPI]);
const hasAllPerms = useHasAllPermissions([Permission.VIEW_KPI, Permission.CREATE_KPI]);

// API headers for workspace context
const headers = useWorkspaceHeaders();
```

### UI Components

#### WorkspaceSelector (`components/workspace/WorkspaceSelector.tsx`)
Dropdown component for switching between workspaces:
- Shows current workspace
- Lists available workspaces with roles
- Handles switching with loading states
- Only shows when user has multiple workspaces

#### WorkspaceInfo (`components/workspace/WorkspaceInfo.tsx`)
Debug/info component showing current workspace context:
- Current workspace details
- User role and permissions
- Workspace selector integration

## API Routes

### POST `/api/auth/workspace/switch`
Switches user's current workspace context:

```typescript
// Request
{ workspaceId: string }

// Response
{
  workspace: WorkspaceWithMembership;
  role: WorkspaceRole;
  permissions: Permission[];
}
```

### GET `/api/auth/workspace/list`
Lists all workspaces user has access to:

```typescript
// Response
{
  workspaces: WorkspaceWithMembership[];
  currentWorkspace: WorkspaceWithMembership | null;
  role: WorkspaceRole | null;
  permissions: Permission[];
}
```

## Usage Examples

### Basic Workspace Access
```typescript
function MyComponent() {
  const { workspace, role, isLoading } = useWorkspace();
  
  if (isLoading) return <div>Loading...</div>;
  if (!workspace) return <div>No workspace</div>;
  
  return (
    <div>
      <h1>{workspace.name}</h1>
      <p>Role: {role}</p>
    </div>
  );
}
```

### Permission-Based Rendering
```typescript
function KpiActions() {
  const canCreate = usePermission(Permission.CREATE_KPI);
  const canEdit = usePermission(Permission.EDIT_KPI);
  
  return (
    <div>
      {canCreate && <button>Create KPI</button>}
      {canEdit && <button>Edit KPI</button>}
    </div>
  );
}
```

### Workspace Switching
```typescript
function WorkspaceSwitcher() {
  const { availableWorkspaces, switchWorkspace, isLoading } = useWorkspace();
  
  const handleSwitch = async (workspaceId: string) => {
    await switchWorkspace(workspaceId);
    // Page will reload automatically to update server session
  };
  
  return (
    <select onChange={(e) => handleSwitch(e.target.value)} disabled={isLoading}>
      {availableWorkspaces.map(ws => (
        <option key={ws.id} value={ws.id}>{ws.name}</option>
      ))}
    </select>
  );
}
```

### API Calls with Workspace Context
```typescript
function useKpis() {
  const headers = useWorkspaceHeaders();
  
  return useQuery({
    queryKey: ['kpis'],
    queryFn: async () => {
      const response = await fetch('/api/kpis', { headers });
      return response.json();
    },
  });
}
```

## Requirements Satisfied

This implementation satisfies **Requirement 6** from the auth specification:

### 6.1 - Store workspace context in session
✅ Workspace context is stored in Zustand store with localStorage persistence

### 6.2 - Automatically load last selected workspace
✅ WorkspaceProvider initializes from persisted state and syncs with server

### 6.3 - Update session context immediately on switch
✅ `switchWorkspace` calls API and triggers page reload to update server session

### 6.4 - Default to first available workspace if access lost
✅ API route `/api/auth/workspace/list` handles fallback logic

### 6.5 - Update UI components when workspace changes
✅ Zustand store updates trigger React re-renders across all components

### 2.5 - Allow switching between workspaces
✅ WorkspaceSelector component and `switchWorkspace` function provide switching capability

## Testing

Tests are provided for:
- Store actions and state management
- Hook functionality and permission checking
- API integration and error handling
- Component rendering and user interactions

Run tests with:
```bash
npm test src/lib/stores/__tests__/workspace-store.test.ts
npm test src/lib/hooks/__tests__/use-workspace.test.ts
```

## Security Considerations

- Workspace switching requires server-side validation
- All API calls include workspace context headers
- RLS policies enforce data isolation at database level
- Client-side state is synced with server session
- Page reload ensures server-side session consistency