'use client';

import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { ExtendedSession } from '@/lib/types/auth';
import { WorkspaceRole, Permission } from '@/lib/db';

/**
 * Authentication context interface
 */
interface AuthContextType {
  // Authentication state
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // User information
  user: {
    id: string;
    email: string;
    name: string;
    image?: string;
  } | null;
  
  // Session
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
  
  // Loading and error states
  isWorkspaceLoading: boolean;
  workspaceError: string | null;
  
  // Actions
  switchWorkspace: (workspaceId: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}

/**
 * Authentication context
 */
const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Comprehensive authentication provider that combines NextAuth session with workspace context
 * Provides unified authentication and workspace management state
 * 
 * Requirements: 5.1, 5.2, 6.1, 6.2, 6.5
 */
export function AuthProvider({ children }: AuthProviderProps) {
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
    setLoading,
  } = useWorkspaceStore();

  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize workspace context when session is ready
  useEffect(() => {
    if (status === 'loading') {
      return; // Still loading session
    }

    if (status === 'unauthenticated') {
      // Clear workspace context when user signs out
      clearWorkspaceContext();
      setIsInitialized(true);
      return;
    }

    if (status === 'authenticated' && session?.user && !isInitialized) {
      // Initialize workspace context when user is authenticated
      const initializeWorkspaces = async () => {
        try {
          setLoading(true);
          await refreshWorkspaces();
        } catch (error) {
          console.error('Failed to initialize workspace context:', error);
        } finally {
          setLoading(false);
          setIsInitialized(true);
        }
      };

      initializeWorkspaces();
    }
  }, [status, session, isInitialized, refreshWorkspaces, clearWorkspaceContext, setLoading]);

  // Determine authentication status
  const isAuthenticated = status === 'authenticated' && !!session?.user;
  const isLoading = status === 'loading' || (isAuthenticated && !isInitialized);

  // Extract user information
  const extendedSession = session as ExtendedSession;
  const user = extendedSession?.user ? {
    id: extendedSession.user.id,
    email: extendedSession.user.email,
    name: extendedSession.user.name,
    image: extendedSession.user.image,
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
    role: ws.userRole as WorkspaceRole || WorkspaceRole.MEMBER,
  }));

  const contextValue: AuthContextType = {
    // Authentication state
    isAuthenticated,
    isLoading,
    
    // User information
    user,
    
    // Session
    session: session as ExtendedSession | null,
    
    // Workspace context
    workspace,
    workspaceId: currentWorkspace?.id || null,
    role: userRole,
    permissions,
    
    // Available workspaces
    availableWorkspaces: mappedAvailableWorkspaces,
    hasMultipleWorkspaces: mappedAvailableWorkspaces.length > 1,
    
    // Loading and error states
    isWorkspaceLoading,
    workspaceError,
    
    // Actions
    switchWorkspace,
    refreshWorkspaces,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access authentication context
 * Throws error if used outside AuthProvider
 */
export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  
  return context;
}

/**
 * Hook to check if authentication and workspace context is ready
 */
export function useAuthContextReady() {
  const { isAuthenticated, isLoading, isWorkspaceLoading, workspace } = useAuthContext();
  
  return {
    isReady: isAuthenticated && !isLoading && !isWorkspaceLoading && !!workspace,
    isLoading: isLoading || isWorkspaceLoading,
    isAuthenticated,
    hasWorkspace: !!workspace,
  };
}