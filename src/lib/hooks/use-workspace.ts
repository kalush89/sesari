'use client';

import { useWorkspaceStore } from '../stores/workspace-store';
import { Permission } from '../db';

/**
 * Hook to access workspace context
 * Provides current workspace, role, and permissions
 */
export function useWorkspace() {
  const {
    currentWorkspace,
    availableWorkspaces,
    userRole,
    permissions,
    isLoading,
    error,
    switchWorkspace,
    refreshWorkspaces,
  } = useWorkspaceStore();

  return {
    // Current workspace data
    workspace: currentWorkspace,
    workspaceId: currentWorkspace?.id || null,
    workspaceName: currentWorkspace?.name || null,
    
    // User role and permissions
    role: userRole,
    permissions,
    
    // Available workspaces
    availableWorkspaces,
    hasMultipleWorkspaces: availableWorkspaces.length > 1,
    
    // State
    isLoading,
    error,
    
    // Actions
    switchWorkspace,
    refreshWorkspaces,
  };
}

/**
 * Hook to check if user has a specific permission
 */
export function usePermission(permission: Permission) {
  const { permissions } = useWorkspaceStore();
  return permissions.includes(permission);
}

/**
 * Hook to check if user has any of the specified permissions
 */
export function useHasAnyPermission(requiredPermissions: Permission[]) {
  const { permissions } = useWorkspaceStore();
  return requiredPermissions.some(permission => permissions.includes(permission));
}

/**
 * Hook to check if user has all of the specified permissions
 */
export function useHasAllPermissions(requiredPermissions: Permission[]) {
  const { permissions } = useWorkspaceStore();
  return requiredPermissions.every(permission => permissions.includes(permission));
}

/**
 * Hook to get workspace context for API calls
 * Returns headers that should be included in API requests
 */
export function useWorkspaceHeaders() {
  const { currentWorkspace, userRole } = useWorkspaceStore();
  
  if (!currentWorkspace || !userRole) {
    return {};
  }
  
  return {
    'x-workspace-id': currentWorkspace.id,
    'x-user-role': userRole,
  };
}

/**
 * Hook to check if workspace context is ready for use
 */
export function useWorkspaceReady() {
  const { currentWorkspace, isLoading } = useWorkspaceStore();
  
  return {
    isReady: !isLoading && currentWorkspace !== null,
    isLoading,
    hasWorkspace: currentWorkspace !== null,
  };
}