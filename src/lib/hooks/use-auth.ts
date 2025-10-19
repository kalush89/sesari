'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useWorkspaceStore } from '../stores/workspace-store';
import { ExtendedSession } from '../types/auth';
import { WorkspaceRole, Permission } from '../db';

/**
 * Authentication state interface combining NextAuth session and workspace context
 */
export interface AuthState {
  // Authentication status
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // User information
  user: {
    id: string;
    email: string;
    name: string;
    image?: string;
  } | null;
  
  // Session data
  session: ExtendedSession | null;
  
  // Workspace context
  workspace: {
    id: string;
    name: string;
    slug: string;
  } | null;
  workspaceId: string | null;
  role: WorkspaceRole | null;
  permissions: Permission[];
  
  // Available workspaces
  availableWorkspaces: Array<{
    id: string;
    name: string;
    slug: string;
    role: WorkspaceRole;
  }>;
  hasMultipleWorkspaces: boolean;
  
  // Loading states
  isWorkspaceLoading: boolean;
  workspaceError: string | null;
  
  // Actions
  signIn: (provider?: string, options?: any) => Promise<void>;
  signOut: (options?: any) => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}

/**
 * Comprehensive authentication hook that combines NextAuth session with workspace context
 * Provides unified access to authentication state and workspace management
 * 
 * Requirements: 5.1, 5.2, 6.1, 6.2, 6.5
 */
export function useAuth(): AuthState {
  const { data: session, status } = useSession();
  const {
    currentWorkspace,
    availableWorkspaces,
    userRole,
    permissions,
    isLoading: isWorkspaceLoading,
    error: workspaceError,
    switchWorkspace,
    refreshWorkspaces,
    clearWorkspaceContext,
  } = useWorkspaceStore();

  // Determine authentication status
  const isAuthenticated = status === 'authenticated' && !!session?.user;
  const isLoading = status === 'loading';

  // Extract user information
  const user = session?.user ? {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
  } : null;

  // Extract workspace information
  const workspace = currentWorkspace ? {
    id: currentWorkspace.id,
    name: currentWorkspace.name,
    slug: currentWorkspace.slug,
  } : null;

  // Map available workspaces to simplified format
  const mappedAvailableWorkspaces = availableWorkspaces.map(ws => ({
    id: ws.id,
    name: ws.name,
    slug: ws.slug,
    role: ws.membership?.role as WorkspaceRole || WorkspaceRole.MEMBER,
  }));

  // Custom sign in function
  const handleSignIn = async (provider: string = 'google', options: any = {}) => {
    try {
      await signIn(provider, {
        callbackUrl: '/dashboard',
        ...options,
      });
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  // Custom sign out function with workspace cleanup
  const handleSignOut = async (options: any = {}) => {
    try {
      // Clear workspace context before signing out
      clearWorkspaceContext();
      
      // Clear local storage
      try {
        localStorage.removeItem('workspace-context');
        sessionStorage.clear();
      } catch (storageError) {
        console.warn('Failed to clear storage:', storageError);
      }
      
      // Call custom signout cleanup
      try {
        await fetch('/api/auth/signout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (cleanupError) {
        console.warn('Custom signout cleanup failed:', cleanupError);
      }
      
      await signOut({
        callbackUrl: '/signin',
        redirect: true,
        ...options,
      });
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  return {
    // Authentication status
    isAuthenticated,
    isLoading,
    
    // User information
    user,
    
    // Session data
    session: session as ExtendedSession | null,
    
    // Workspace context
    workspace,
    workspaceId: currentWorkspace?.id || null,
    role: userRole,
    permissions,
    
    // Available workspaces
    availableWorkspaces: mappedAvailableWorkspaces,
    hasMultipleWorkspaces: mappedAvailableWorkspaces.length > 1,
    
    // Loading states
    isWorkspaceLoading,
    workspaceError,
    
    // Actions
    signIn: handleSignIn,
    signOut: handleSignOut,
    switchWorkspace,
    refreshWorkspaces,
  };
}

/**
 * Hook to check if user is authenticated and has workspace access
 * Useful for protecting components that require both authentication and workspace context
 */
export function useAuthReady() {
  const { isAuthenticated, isLoading, isWorkspaceLoading, workspace } = useAuth();
  
  return {
    isReady: isAuthenticated && !isLoading && !isWorkspaceLoading && !!workspace,
    isLoading: isLoading || isWorkspaceLoading,
    isAuthenticated,
    hasWorkspace: !!workspace,
  };
}

/**
 * Hook to get authentication headers for API requests
 * Includes workspace context for multi-tenant API calls
 */
export function useAuthHeaders() {
  const { workspaceId, role, isAuthenticated } = useAuth();
  
  if (!isAuthenticated || !workspaceId || !role) {
    return {};
  }
  
  return {
    'x-workspace-id': workspaceId,
    'x-user-role': role,
  };
}

/**
 * Hook to check if user has a specific permission in current workspace
 */
export function useHasPermission(permission: Permission) {
  const { permissions, isAuthenticated } = useAuth();
  return isAuthenticated && permissions.includes(permission);
}

/**
 * Hook to check if user has any of the specified permissions
 */
export function useHasAnyPermission(requiredPermissions: Permission[]) {
  const { permissions, isAuthenticated } = useAuth();
  return isAuthenticated && requiredPermissions.some(permission => permissions.includes(permission));
}

/**
 * Hook to check if user has all of the specified permissions
 */
export function useHasAllPermissions(requiredPermissions: Permission[]) {
  const { permissions, isAuthenticated } = useAuth();
  return isAuthenticated && requiredPermissions.every(permission => permissions.includes(permission));
}

/**
 * Hook to get user's role in current workspace
 */
export function useUserRole() {
  const { role, isAuthenticated } = useAuth();
  return isAuthenticated ? role : null;
}

/**
 * Hook to check if user has a specific role or higher
 */
export function useHasRole(requiredRole: WorkspaceRole) {
  const { role, isAuthenticated } = useAuth();
  
  if (!isAuthenticated || !role) {
    return false;
  }
  
  // Define role hierarchy
  const roleHierarchy = {
    [WorkspaceRole.MEMBER]: 1,
    [WorkspaceRole.ADMIN]: 2,
    [WorkspaceRole.OWNER]: 3,
  };
  
  return roleHierarchy[role] >= roleHierarchy[requiredRole];
}