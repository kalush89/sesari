'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { AuthGuard, AuthCheck } from '@/components/auth/AuthGuard';
import { AuthLoadingWrapper } from '@/components/auth/AuthLoadingWrapper';
import { WorkspaceRole, Permission } from '@/lib/db';

/**
 * Example component demonstrating the new authentication system integration
 * Shows how to use useAuth hook, AuthGuard, and AuthCheck components
 */
export function AuthIntegrationExample() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Authentication Integration Example</h1>
      
      {/* Basic authentication status */}
      <AuthStatusExample />
      
      {/* Workspace management */}
      <WorkspaceExample />
      
      {/* Permission-based UI */}
      <PermissionExample />
      
      {/* Protected content with AuthGuard */}
      <ProtectedContentExample />
      
      {/* Conditional rendering with AuthCheck */}
      <ConditionalRenderingExample />
    </div>
  );
}

/**
 * Basic authentication status display
 */
function AuthStatusExample() {
  const { isAuthenticated, isLoading, user, signIn, signOut } = useAuth();

  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 h-20 rounded-md"></div>;
  }

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h2 className="text-lg font-medium text-gray-900 mb-3">Authentication Status</h2>
      
      {isAuthenticated ? (
        <div className="space-y-2">
          <p className="text-green-600">✅ Authenticated as {user?.name}</p>
          <p className="text-sm text-gray-600">Email: {user?.email}</p>
          <button 
            onClick={() => signOut()}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-red-600">❌ Not authenticated</p>
          <button 
            onClick={() => signIn()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
          >
            Sign In with Google
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Workspace context display and management
 */
function WorkspaceExample() {
  const { 
    workspace, 
    role, 
    availableWorkspaces, 
    hasMultipleWorkspaces,
    switchWorkspace,
    isWorkspaceLoading 
  } = useAuth();

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h2 className="text-lg font-medium text-gray-900 mb-3">Workspace Context</h2>
      
      {isWorkspaceLoading ? (
        <div className="animate-pulse bg-gray-200 h-16 rounded-md"></div>
      ) : workspace ? (
        <div className="space-y-2">
          <p className="text-green-600">📁 Current workspace: {workspace.name}</p>
          <p className="text-sm text-gray-600">Role: {role}</p>
          <p className="text-sm text-gray-600">Workspace ID: {workspace.id}</p>
          
          {hasMultipleWorkspaces && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Switch workspace:
              </label>
              <select 
                value={workspace.id} 
                onChange={(e) => switchWorkspace(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {availableWorkspaces.map(ws => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name} ({ws.role})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      ) : (
        <p className="text-red-600">❌ No workspace available</p>
      )}
    </div>
  );
}

/**
 * Permission-based UI elements
 */
function PermissionExample() {
  const { permissions, role } = useAuth();

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h2 className="text-lg font-medium text-gray-900 mb-3">Permissions & Role</h2>
      
      <div className="space-y-2">
        <p className="text-sm text-gray-600">Current role: <span className="font-medium">{role || 'None'}</span></p>
        <p className="text-sm text-gray-600">Permissions:</p>
        <ul className="list-disc list-inside text-sm text-gray-600 ml-4">
          {permissions.length > 0 ? (
            permissions.map(permission => (
              <li key={permission}>{permission}</li>
            ))
          ) : (
            <li>No permissions</li>
          )}
        </ul>
      </div>
    </div>
  );
}

/**
 * Protected content using AuthGuard
 */
function ProtectedContentExample() {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h2 className="text-lg font-medium text-gray-900 mb-3">Protected Content (AuthGuard)</h2>
      
      {/* Admin-only content */}
      <AuthGuard 
        requireAuth={true}
        requireWorkspace={true}
        requiredRole={WorkspaceRole.ADMIN}
        errorFallback={
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-yellow-800 text-sm">⚠️ Admin role required to view this content</p>
          </div>
        }
      >
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <p className="text-green-800 text-sm">🔒 This content is only visible to admins!</p>
        </div>
      </AuthGuard>

      {/* Permission-based content */}
      <div className="mt-3">
        <AuthGuard 
          requireAuth={true}
          requireWorkspace={true}
          requiredPermissions={[Permission.CREATE_KPI]}
          errorFallback={
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-800 text-sm">❌ CREATE_KPI permission required</p>
            </div>
          }
        >
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-blue-800 text-sm">📊 You can create KPIs!</p>
          </div>
        </AuthGuard>
      </div>
    </div>
  );
}

/**
 * Conditional rendering using AuthCheck
 */
function ConditionalRenderingExample() {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h2 className="text-lg font-medium text-gray-900 mb-3">Conditional Rendering (AuthCheck)</h2>
      
      <div className="space-y-3">
        {/* Basic authentication check */}
        <AuthCheck 
          requireAuth={true}
          fallback={<p className="text-gray-500 text-sm">Please sign in to see user actions</p>}
        >
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm transition-colors">
            User Action
          </button>
        </AuthCheck>

        {/* Role-based check */}
        <AuthCheck 
          requireAuth={true}
          requireWorkspace={true}
          requiredRole={WorkspaceRole.OWNER}
          fallback={<p className="text-gray-500 text-sm">Owner role required for workspace settings</p>}
        >
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-md text-sm transition-colors">
            Workspace Settings
          </button>
        </AuthCheck>

        {/* Permission-based check */}
        <AuthCheck 
          requireAuth={true}
          requireWorkspace={true}
          requireAnyPermission={[Permission.CREATE_KPI, Permission.EDIT_KPI]}
          fallback={<p className="text-gray-500 text-sm">KPI management permissions required</p>}
        >
          <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm transition-colors">
            Manage KPIs
          </button>
        </AuthCheck>
      </div>
    </div>
  );
}

/**
 * Example of using AuthLoadingWrapper
 */
export function AuthLoadingWrapperExample() {
  return (
    <AuthLoadingWrapper requireWorkspace={true}>
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          This content is only shown when authentication and workspace context are ready.
        </p>
      </div>
    </AuthLoadingWrapper>
  );
}