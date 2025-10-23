'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { useSession } from 'next-auth/react';

interface AuthDebugInfoProps {
  session: any;
  workspaces: any[];
  memberships: any[];
}

export function AuthDebugInfo({ session, workspaces, memberships }: AuthDebugInfoProps) {
  const { data: clientSession, status } = useSession();
  const authState = useAuth();

  return (
    <div className="space-y-6">
      {/* NextAuth Session Info */}
      <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
        <h2 className="text-xl font-medium text-gray-900 mb-4">NextAuth Session</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Server Session</h3>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Client Session</h3>
            <p className="text-sm text-gray-600 mb-2">Status: {status}</p>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
              {JSON.stringify(clientSession, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      {/* Auth Hook State */}
      <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
        <h2 className="text-xl font-medium text-gray-900 mb-4">useAuth Hook State</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Authentication State</h3>
            <ul className="space-y-1 text-sm">
              <li>Is Authenticated: <span className={authState.isAuthenticated ? 'text-green-600' : 'text-red-600'}>{authState.isAuthenticated ? 'Yes' : 'No'}</span></li>
              <li>Is Loading: <span className={authState.isLoading ? 'text-yellow-600' : 'text-gray-600'}>{authState.isLoading ? 'Yes' : 'No'}</span></li>
              <li>Is Workspace Loading: <span className={authState.isWorkspaceLoading ? 'text-yellow-600' : 'text-gray-600'}>{authState.isWorkspaceLoading ? 'Yes' : 'No'}</span></li>
              <li>Workspace Error: <span className="text-red-600">{authState.workspaceError || 'None'}</span></li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-700 mb-2">User Info</h3>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
              {JSON.stringify(authState.user, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      {/* Workspace Info */}
      <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
        <h2 className="text-xl font-medium text-gray-900 mb-4">Workspace Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Current Workspace</h3>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
              {JSON.stringify(authState.workspace, null, 2)}
            </pre>
            <div className="mt-2">
              <p className="text-sm">Role: <span className="font-medium">{authState.role || 'None'}</span></p>
              <p className="text-sm">Permissions: <span className="font-medium">{authState.permissions.length}</span></p>
            </div>
          </div>
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Available Workspaces</h3>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
              {JSON.stringify(authState.availableWorkspaces, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      {/* Database Info */}
      <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
        <h2 className="text-xl font-medium text-gray-900 mb-4">Database Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Workspaces ({workspaces.length})</h3>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-64">
              {JSON.stringify(workspaces, null, 2)}
            </pre>
          </div>
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Memberships ({memberships.length})</h3>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-64">
              {JSON.stringify(memberships, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
        <h2 className="text-xl font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex space-x-4">
          <button 
            onClick={() => authState.refreshWorkspaces()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors duration-200"
          >
            Refresh Workspaces
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors duration-200"
          >
            Reload Page
          </button>
          <button 
            onClick={() => authState.signOut()}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors duration-200"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}