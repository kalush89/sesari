'use client';

import { useWorkspace } from '@/lib/hooks/use-workspace';
import { WorkspaceSelector } from './WorkspaceSelector';

/**
 * Component that displays current workspace information
 * Demonstrates usage of workspace context
 */
export function WorkspaceInfo() {
  const {
    workspace,
    workspaceName,
    role,
    permissions,
    isLoading,
    error,
    hasMultipleWorkspaces,
  } = useWorkspace();

  if (isLoading) {
    return (
      <div className="bg-white shadow-sm rounded-lg p-4 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 text-sm">{error}</p>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 text-sm">No workspace selected</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Workspace Context</h3>
        {hasMultipleWorkspaces && (
          <WorkspaceSelector className="w-48" />
        )}
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Current Workspace
          </label>
          <p className="text-sm text-gray-900">{workspaceName}</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Your Role
          </label>
          <p className="text-sm text-gray-900 capitalize">{role}</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Permissions ({permissions.length})
          </label>
          <div className="mt-1 flex flex-wrap gap-1">
            {permissions.map((permission) => (
              <span
                key={permission}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
              >
                {permission.replace(/_/g, ' ').toLowerCase()}
              </span>
            ))}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Workspace ID
          </label>
          <p className="text-xs text-gray-500 font-mono">{workspace.id}</p>
        </div>
      </div>
    </div>
  );
}